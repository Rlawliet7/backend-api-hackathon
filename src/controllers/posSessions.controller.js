import { OfflineCheckoutSession } from '../models/index.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';
import { finalizeSession } from '../services/posSession.service.js';

/**
 * GET /pos-sessions/active — Admin
 * List sesi open real-time (keranjang berjalan di layar kasir).
 */
export const getActiveSessions = catchAsync(async (req, res) => {
  const sessions = await OfflineCheckoutSession.find({ status: 'open' }).sort({ lastScanAt: -1 });

  res.status(200).json({
    success: true,
    data: sessions,
  });
});

/**
 * GET /pos-sessions/:id — Admin
 */
export const getSession = catchAsync(async (req, res) => {
  const session = await OfflineCheckoutSession.findById(req.params.id);
  if (!session) {
    throw new ApiError(404, 'Sesi tidak ditemukan.');
  }

  res.status(200).json({
    success: true,
    data: session,
  });
});

/**
 * POST /pos-sessions/:id/checkout — Admin
 * Body: { voucherCode: null | string }
 * Finalisasi sesi → buat order + payment cash, kurangi stok.
 */
export const checkoutSession = catchAsync(async (req, res) => {
  const { voucherCode } = req.body;

  const session = await OfflineCheckoutSession.findById(req.params.id);
  if (!session) {
    throw new ApiError(404, 'Sesi tidak ditemukan.');
  }

  const { order, payment } = await finalizeSession(session, {
    voucherCode: voucherCode || null,
    handledBy: req.user._id,
  });

  res.status(200).json({
    success: true,
    message: 'Transaksi berhasil difinalisasi',
    data: {
      orderId: order._id,
      orderCode: order.orderCode,
      total: order.total,
      paymentStatus: payment.status,
    },
  });
});

/**
 * POST /pos-sessions/:id/cancel — Admin
 * Batalkan sesi (mis. pelanggan batal beli), TIDAK membuat order/payment, TIDAK memotong stok.
 */
export const cancelSession = catchAsync(async (req, res) => {
  const session = await OfflineCheckoutSession.findById(req.params.id);
  if (!session) {
    throw new ApiError(404, 'Sesi tidak ditemukan.');
  }
  if (session.status !== 'open') {
    throw new ApiError(400, `Sesi dengan status "${session.status}" tidak bisa dibatalkan.`);
  }

  session.status = 'cancelled';
  await session.save();

  res.status(200).json({
    success: true,
    message: 'Sesi berhasil dibatalkan.',
    data: session,
  });
});