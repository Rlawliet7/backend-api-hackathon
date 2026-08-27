import { Payment, Order, Product, StockHistory, User, Voucher } from '../models/index.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';

/**
 * Keputusan implementasi (tidak diatur eksplisit di kontrak):
 * Poin loyalti = 1 poin per Rp10.000 dari order.total, dibulatkan ke bawah.
 * Mudah diubah di satu tempat ini jika bisnis punya formula lain.
 */
const calculateLoyaltyPoints = (total) => Math.floor(total / 10000);

const generateSimulatedReference = () => `SIM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

/**
 * GET /payments/:id — Protected
 */
export const getPayment = catchAsync(async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) {
    throw new ApiError(404, 'Payment tidak ditemukan.');
  }

  const order = await Order.findById(payment.orderId);
  if (req.user.role !== 'admin' && !order?.userId?.equals(req.user._id)) {
    throw new ApiError(403, 'Anda tidak memiliki akses ke payment ini.');
  }

  res.status(200).json({
    success: true,
    data: { payment },
  });
});

/**
 * POST /payments/:id/simulate — Protected
 * Body: { result: 'success' | 'failed', method? }
 *
 * Sesuai Bab 15.3:
 * - result "success" → stok berkurang, poin loyalti ditambah, order jadi "paid".
 * - result "failed" → payment gagal, order tetap "pending" (customer bisa coba bayar lagi).
 */
export const simulatePayment = catchAsync(async (req, res) => {
  const { result, method } = req.body;

  if (!['success', 'failed'].includes(result)) {
    throw new ApiError(400, 'result wajib diisi: "success" atau "failed".');
  }

  const payment = await Payment.findById(req.params.id);
  if (!payment) {
    throw new ApiError(404, 'Payment tidak ditemukan.');
  }

  const order = await Order.findById(payment.orderId);
  if (!order) {
    throw new ApiError(404, 'Order terkait payment ini tidak ditemukan.');
  }
  if (req.user.role !== 'admin' && !order.userId?.equals(req.user._id)) {
    throw new ApiError(403, 'Anda tidak memiliki akses ke payment ini.');
  }
  if (payment.status === 'success') {
    throw new ApiError(400, 'Payment ini sudah berhasil sebelumnya, tidak bisa disimulasikan ulang.');
  }
  if (order.status !== 'pending') {
    throw new ApiError(400, `Order dengan status "${order.status}" tidak bisa diproses pembayarannya.`);
  }

  if (result === 'failed') {
    payment.status = 'failed';
    payment.method = method || payment.method;
    await payment.save();

    return res.status(200).json({
      success: true,
      message: 'Simulasi pembayaran gagal dicatat.',
      data: { payment, order },
    });
  }

  // result === 'success'
  // 1. Validasi & kurangi stok tiap item, catat stockhistories.
  for (const item of order.items) {
    const product = await Product.findById(item.productId);
    if (!product) {
      throw new ApiError(400, `Produk "${item.name}" pada order ini sudah tidak ditemukan.`);
    }
    if (product.stock < item.quantity) {
      throw new ApiError(400, `Stok "${product.name}" tidak mencukupi untuk menyelesaikan pembayaran. Sisa stok: ${product.stock}.`);
    }

    const stockBefore = product.stock;
    product.stock -= item.quantity;
    await product.save();

    await StockHistory.create({
      productId: product._id,
      type: 'sale',
      quantity: -item.quantity,
      stockBefore,
      stockAfter: product.stock,
      referenceType: 'order',
      referenceId: order._id,
      note: `Penjualan online - order ${order.orderCode}`,
      performedBy: null,
      storeChannel: 'online',
    });
  }

  // 2. Tambah poin loyalti ke user.
  const pointsEarned = calculateLoyaltyPoints(order.total);
  if (order.userId) {
    await User.updateOne({ _id: order.userId }, { $inc: { loyaltyPoints: pointsEarned } });
  }
  order.pointsEarned = pointsEarned;

  // 3. Increment usedCount voucher jika dipakai.
  if (order.voucherCode) {
    await Voucher.updateOne({ code: order.voucherCode }, { $inc: { usedCount: 1 } });
  }

  // 4. Update payment & order.
  payment.status = 'success';
  payment.method = method || payment.method;
  payment.simulatedReference = generateSimulatedReference();
  payment.paidAt = new Date();
  await payment.save();

  order.status = 'paid';
  await order.save();

  res.status(200).json({
    success: true,
    message: 'Pembayaran berhasil. Order kini berstatus "paid".',
    data: { payment, order },
  });
});