import rateLimit from 'express-rate-limit';

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