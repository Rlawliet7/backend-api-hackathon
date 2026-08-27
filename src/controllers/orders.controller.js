import { Order, Cart, Payment, Voucher } from '../models/index.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';

// Urutan status yang valid — dipakai untuk validasi transisi di updateOrderStatus.
const STATUS_FLOW = ['pending', 'paid', 'processing', 'ready', 'delivering', 'completed'];

const generateOrderCode = () => {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ORD-${Date.now().toString(36).toUpperCase()}-${rand}`;
};

/**
 * Validasi & hitung diskon voucher. Tidak menambah usedCount di sini —
 * usedCount baru bertambah saat payment berhasil (mencegah kuota terpakai oleh order yang tak pernah dibayar).
 */
const applyVoucher = async (code, subtotal) => {
  const voucher = await Voucher.findOne({ code: code.toUpperCase() });

  if (!voucher || !voucher.isActive) {
    throw new ApiError(400, 'Kode voucher tidak ditemukan atau tidak aktif.');
  }
  const now = new Date();
  if (now < voucher.validFrom || now > voucher.validUntil) {
    throw new ApiError(400, 'Voucher sudah tidak berlaku.');
  }
  if (voucher.usageLimit !== null && voucher.usedCount >= voucher.usageLimit) {
    throw new ApiError(400, 'Kuota penggunaan voucher sudah habis.');
  }
  if (subtotal < voucher.minPurchase) {
    throw new ApiError(400, `Minimal belanja untuk voucher ini adalah ${voucher.minPurchase}.`);
  }

  let discount = voucher.type === 'percentage' ? (subtotal * voucher.value) / 100 : voucher.value;
  if (voucher.maxDiscount !== null) {
    discount = Math.min(discount, voucher.maxDiscount);
  }
  discount = Math.min(discount, subtotal);

  return { voucher, discount };
};

/**
 * POST /orders — Protected (checkout online)
 * Body: { fulfillmentType: 'delivery'|'pickup', deliveryAddress?, voucherCode?, shippingFee? }
 *
 * Sesuai Bab 15.3: order & payment dibuat dengan status "pending".
 * Stok BELUM berkurang dan poin loyalti BELUM ditambah di sini —
 * itu baru terjadi saat POST /payments/:id/simulate berhasil.
 */
export const checkout = catchAsync(async (req, res) => {
  const { fulfillmentType, deliveryAddress, voucherCode, shippingFee } = req.body;

  if (!fulfillmentType || !['delivery', 'pickup'].includes(fulfillmentType)) {
    throw new ApiError(400, 'fulfillmentType wajib diisi: "delivery" atau "pickup".');
  }
  if (fulfillmentType === 'delivery' && !deliveryAddress) {
    throw new ApiError(400, 'deliveryAddress wajib diisi untuk fulfillmentType "delivery".');
  }

  const cart = await Cart.findOne({ userId: req.user._id }).populate('items.productId');
  if (!cart || cart.items.length === 0) {
    throw new ApiError(400, 'Keranjang Anda kosong.');
  }

  // Validasi ulang stok & status produk saat checkout (bukan saat bayar), agar user tahu lebih awal.
  const items = [];
  let subtotal = 0;
  for (const item of cart.items) {
    const product = item.productId;
    if (!product || !product.isActive) {
      throw new ApiError(400, `Produk "${product?.name || item.productId}" sudah tidak tersedia.`);
    }
    if (product.stock < item.quantity) {
      throw new ApiError(400, `Stok "${product.name}" tidak mencukupi. Sisa stok: ${product.stock}.`);
    }
    const price = item.priceSnapshot;
    const lineSubtotal = price * item.quantity;
    items.push({
      productId: product._id,
      name: product.name,
      price,
      quantity: item.quantity,
      subtotal: lineSubtotal,
    });
    subtotal += lineSubtotal;
  }

  let discount = 0;
  let appliedVoucher = null;
  if (voucherCode) {
    const result = await applyVoucher(voucherCode, subtotal);
    discount = result.discount;
    appliedVoucher = result.voucher;
  }

  const fee = fulfillmentType === 'delivery' ? Number(shippingFee) || 0 : 0;
  const total = subtotal - discount + fee;

  const order = await Order.create({
    orderCode: generateOrderCode(),
    userId: req.user._id,
    channel: 'online',
    fulfillmentType,
    items,
    subtotal,
    discount,
    voucherCode: appliedVoucher ? appliedVoucher.code : null,
    shippingFee: fee,
    total,
    status: 'pending',
    deliveryAddress: fulfillmentType === 'delivery' ? deliveryAddress : null,
  });

  const payment = await Payment.create({
    orderId: order._id,
    method: 'unset', // ditentukan saat simulate (Bab 7)
    amount: total,
    status: 'pending',
  });

  order.paymentId = payment._id;
  await order.save();

  // Kosongkan cart setelah order berhasil dibuat.
  cart.items = [];
  await cart.save();

  res.status(201).json({
    success: true,
    message: 'Order berhasil dibuat. Silakan lanjutkan ke pembayaran.',
    data: { order, payment },
  });
});

/**
 * GET /orders — Protected
 * Customer: hanya melihat order miliknya.
 * Admin: melihat semua order, bisa filter ?userId=&status=
 */
export const listOrders = catchAsync(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 20);

  const filter = {};
  if (req.user.role === 'admin') {
    if (req.query.userId) filter.userId = req.query.userId;
  } else {
    filter.userId = req.user._id;
  }
  if (req.query.status) filter.status = req.query.status;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Order.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: { orders, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } },
  });
});

/**
 * GET /orders/:id — Protected
 * Customer hanya boleh lihat order miliknya sendiri.
 */
export const getOrder = catchAsync(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    throw new ApiError(404, 'Order tidak ditemukan.');
  }
  if (req.user.role !== 'admin' && !order.userId?.equals(req.user._id)) {
    throw new ApiError(403, 'Anda tidak memiliki akses ke order ini.');
  }

  res.status(200).json({
    success: true,
    data: { order },
  });
});

/**
 * PATCH /orders/:id/status — Admin
 * Body: { status }
 * Transisi harus mengikuti alur: pending → paid → processing → ready/delivering → completed
 * (cancelled bisa terjadi kapan saja sebelum completed, tapi itu lewat endpoint /cancel, bukan di sini).
 */
export const updateOrderStatus = catchAsync(async (req, res) => {
  const { status } = req.body;

  if (!STATUS_FLOW.includes(status)) {
    throw new ApiError(400, `status tidak valid. Pilihan: ${STATUS_FLOW.join(', ')}.`);
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    throw new ApiError(404, 'Order tidak ditemukan.');
  }
  if (order.status === 'cancelled' || order.status === 'completed') {
    throw new ApiError(400, `Order dengan status "${order.status}" tidak bisa diubah lagi.`);
  }

  const currentIndex = STATUS_FLOW.indexOf(order.status);
  const targetIndex = STATUS_FLOW.indexOf(status);

  // Izinkan hanya maju satu langkah atau lebih (tidak mundur), kecuali ready<->delivering yang dianggap setara.
  const isLateralReadyDelivering =
    (order.status === 'ready' && status === 'delivering') || (order.status === 'delivering' && status === 'ready');

  if (!isLateralReadyDelivering && targetIndex <= currentIndex) {
    throw new ApiError(400, `Tidak bisa mengubah status dari "${order.status}" ke "${status}".`);
  }

  order.status = status;
  await order.save();

  res.status(200).json({
    success: true,
    message: 'Status order berhasil diperbarui.',
    data: { order },
  });
});

/**
 * POST /orders/:id/cancel — Protected
 * Hanya bisa dibatalkan jika masih "pending". Pemilik order atau admin yang boleh membatalkan.
 */
export const cancelOrder = catchAsync(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    throw new ApiError(404, 'Order tidak ditemukan.');
  }
  if (req.user.role !== 'admin' && !order.userId?.equals(req.user._id)) {
    throw new ApiError(403, 'Anda tidak memiliki akses ke order ini.');
  }
  if (order.status !== 'pending') {
    throw new ApiError(400, 'Order hanya bisa dibatalkan selagi masih berstatus "pending".');
  }

  order.status = 'cancelled';
  await order.save();

  await Payment.updateOne({ orderId: order._id }, { $set: { status: 'failed' } });

  res.status(200).json({
    success: true,
    message: 'Order berhasil dibatalkan.',
    data: { order },
  });
});