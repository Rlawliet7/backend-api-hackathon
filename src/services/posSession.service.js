import { Order, Payment, Product, StockHistory, Voucher } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { generateOrderCode, applyVoucher } from '../utils/order.js';

/**
 * Finalisasi satu OfflineCheckoutSession menjadi Order + Payment "cash" sukses,
 * lalu kurangi stok & catat stockhistories untuk tiap item.
 *
 * Dipakai oleh:
 * - POST /pos-sessions/:id/checkout (manual, handledBy = admin yang menekan tombol)
 * - Cron job auto-finalize (otomatis, handledBy = null)
 *
 * @param {import('mongoose').Document} session - dokumen OfflineCheckoutSession, status HARUS "open"
 * @param {Object} options
 * @param {string|null} options.voucherCode
 * @param {import('mongoose').Types.ObjectId|null} options.handledBy - null jika auto-finalize oleh cron
 */
export const finalizeSession = async (session, { voucherCode = null, handledBy = null } = {}) => {
  if (session.status !== 'open') {
    throw new ApiError(400, `Sesi dengan status "${session.status}" tidak bisa difinalisasi.`);
  }
  if (session.items.length === 0) {
    throw new ApiError(400, 'Sesi tidak punya item, tidak ada yang bisa difinalisasi.');
  }

  // Validasi ulang stok semua item sebelum memotong apa pun (all-or-nothing).
  const products = {};
  for (const item of session.items) {
    const product = await Product.findById(item.productId);
    if (!product) {
      throw new ApiError(400, `Produk "${item.name}" pada sesi ini sudah tidak ditemukan.`);
    }
    if (product.stock < item.quantity) {
      throw new ApiError(400, `Stok "${product.name}" tidak mencukupi. Sisa stok: ${product.stock}.`);
    }
    products[item.productId.toString()] = product;
  }

  const subtotal = session.items.reduce((sum, item) => sum + item.priceSnapshot * item.quantity, 0);

  let discount = 0;
  let appliedVoucherCode = null;
  if (voucherCode) {
    const result = await applyVoucher(voucherCode, subtotal);
    discount = result.discount;
    appliedVoucherCode = result.voucher.code;
  }

  const total = subtotal - discount;

  const orderItems = session.items.map((item) => ({
    productId: item.productId,
    name: item.name,
    price: item.priceSnapshot,
    quantity: item.quantity,
    subtotal: item.priceSnapshot * item.quantity,
  }));

  const order = await Order.create({
    orderCode: generateOrderCode(),
    userId: null, // transaksi kasir offline, tidak selalu ada akun customer
    channel: 'offline',
    fulfillmentType: 'in_store',
    items: orderItems,
    subtotal,
    discount,
    voucherCode: appliedVoucherCode,
    shippingFee: 0,
    total,
    status: 'completed',
    sourceSessionId: session._id,
    handledBy,
  });

  const payment = await Payment.create({
    orderId: order._id,
    method: 'cash',
    amount: total,
    status: 'success',
    paidAt: new Date(),
  });

  order.paymentId = payment._id;
  await order.save();

  // Kurangi stok & catat stockhistories untuk tiap item.
  for (const item of session.items) {
    const product = products[item.productId.toString()];
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
      note: `Penjualan offline - sesi kasir ${session.deviceId} - order ${order.orderCode}`,
      performedBy: handledBy,
      storeChannel: 'offline',
    });
  }

  if (appliedVoucherCode) {
    await Voucher.updateOne({ code: appliedVoucherCode }, { $inc: { usedCount: 1 } });
  }

  session.status = 'finalized';
  session.finalizedAt = new Date();
  session.finalizedBy = handledBy;
  session.orderId = order._id;
  await session.save();

  return { order, payment };
};