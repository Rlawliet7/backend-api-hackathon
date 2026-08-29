import { Voucher } from '../models/index.js';
import ApiError from './ApiError.js';

export const generateOrderCode = () => {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ORD-${Date.now().toString(36).toUpperCase()}-${rand}`;
};

/**
 * Validasi & hitung diskon voucher. Tidak menambah usedCount di sini —
 * usedCount baru bertambah saat pembayaran benar-benar sukses (online: saat payment simulate,
 * offline: saat sesi difinalisasi) — mencegah kuota terpakai oleh transaksi yang tak pernah selesai.
 */
export const applyVoucher = async (code, subtotal) => {
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