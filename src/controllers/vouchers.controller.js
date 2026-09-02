import { Voucher } from '../models/index.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';
import { applyVoucher } from '../utils/order.js';

/**
 * POST /vouchers — Admin
 * Body: { code, type, value, minPurchase?, maxDiscount?, usageLimit?, validFrom, validUntil }
 */
export const createVoucher = catchAsync(async (req, res) => {
  const { code, type, value, minPurchase, maxDiscount, usageLimit, validFrom, validUntil } = req.body;

  if (!code || !type || value === undefined || !validFrom || !validUntil) {
    throw new ApiError(400, 'code, type, value, validFrom, dan validUntil wajib diisi.');
  }
  if (!['percentage', 'fixed'].includes(type)) {
    throw new ApiError(400, 'type harus "percentage" atau "fixed".');
  }
  if (type === 'percentage' && (value <= 0 || value > 100)) {
    throw new ApiError(400, 'value untuk type "percentage" harus antara 1-100.');
  }
  if (new Date(validFrom) >= new Date(validUntil)) {
    throw new ApiError(400, 'validFrom harus lebih awal dari validUntil.');
  }

  const existing = await Voucher.findOne({ code: code.toUpperCase() });
  if (existing) {
    throw new ApiError(409, 'Kode voucher sudah digunakan.');
  }

  const voucher = await Voucher.create({
    code: code.toUpperCase(),
    type,
    value,
    minPurchase: minPurchase ?? 0,
    maxDiscount: maxDiscount ?? null,
    usageLimit: usageLimit ?? null,
    validFrom,
    validUntil,
  });

  res.status(201).json({
    success: true,
    message: 'Voucher berhasil dibuat.',
    data: { voucher },
  });
});

/**
 * GET /vouchers — Admin
 * Query: ?active=true|false
 */
export const listVouchers = catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.active === 'true') filter.isActive = true;
  if (req.query.active === 'false') filter.isActive = false;

  const vouchers = await Voucher.find(filter).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: { vouchers },
  });
});

/**
 * GET /vouchers/validate — Protected
 * Query: ?code=XXXX&subtotal=100000
 * Dipakai customer di halaman cart/checkout untuk cek voucher valid + preview diskon SEBELUM checkout.
 * Tidak mengubah apa pun di DB (read-only check, usedCount tetap tidak bertambah di sini).
 */
export const validateVoucher = catchAsync(async (req, res) => {
  const { code, subtotal } = req.query;

  if (!code || subtotal === undefined) {
    throw new ApiError(400, 'code dan subtotal wajib diisi sebagai query parameter.');
  }

  const { voucher, discount } = await applyVoucher(code, Number(subtotal));

  res.status(200).json({
    success: true,
    data: {
      code: voucher.code,
      type: voucher.type,
      value: voucher.value,
      discount,
      totalAfterDiscount: Number(subtotal) - discount,
    },
  });
});