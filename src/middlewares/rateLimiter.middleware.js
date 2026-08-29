import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import env from '../config/env.js';

const buildLimiter = (max, windowMs, message) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message },
  });

// POST /auth/login, /auth/register → 5 request / 1 menit
export const authLimiter = buildLimiter(5, 60 * 1000, 'Terlalu banyak percobaan. Coba lagi dalam 1 menit.');

// POST /auth/google → 10 request / 1 menit
export const googleAuthLimiter = buildLimiter(10, 60 * 1000, 'Terlalu banyak percobaan. Coba lagi dalam 1 menit.');

// Endpoint protected umum → 60 request / 1 menit
export const protectedLimiter = buildLimiter(60, 60 * 1000, 'Terlalu banyak request. Coba lagi sebentar lagi.');

// Endpoint publik umum (GET /products, dll) → 100 request / 1 menit
export const publicLimiter = buildLimiter(100, 60 * 1000, 'Terlalu banyak request. Coba lagi sebentar lagi.');

/**
 * POST /device/scans → dibatasi PER-DEVICE (bukan per-IP).
 * Alasan (Bab 16): satu toko/router bisa punya banyak unit ESP32 di IP yang sama,
 * jadi limit per-IP akan salah sasaran (satu device nakal bisa nge-block device lain).
 * req.device sudah tersedia karena middleware authenticateDevice jalan lebih dulu.
 */
export const deviceScanLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.DEVICE_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.device?.deviceId || ipKeyGenerator(req),
  message: { success: false, message: 'Terlalu banyak scan dari device ini dalam waktu singkat.' },
});