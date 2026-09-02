import ApiError from '../utils/ApiError.js';
import catchAsync from '../utils/catchAsync.js';
import { verifyAccessToken } from '../utils/token.js';
import { User } from '../models/index.js';

/**
 * Protected: wajib ada Authorization: Bearer <accessToken> yang valid.
 * Sesuai kontrak Bab 1.4 — token dibaca dari header, bukan cookie.
 */
export const protect = catchAsync(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Anda belum login. Sertakan header Authorization: Bearer <accessToken>.');
  }

  const token = authHeader.split(' ')[1];

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    throw new ApiError(401, 'Access token tidak valid atau sudah kedaluwarsa.');
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    throw new ApiError(401, 'User pemilik token ini sudah tidak ada.');
  }
  if (!user.isActive) {
    throw new ApiError(401, 'Akun Anda telah dinonaktifkan.');
  }

  req.user = user;
  next();
});

/**
 * Admin: dipakai setelah `protect`, membatasi akses hanya untuk role tertentu.
 * Contoh: router.get('/users', protect, restrictTo('admin'), handler)
 */
export const restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ApiError(403, 'Anda tidak memiliki akses untuk melakukan aksi ini.');
    }
    next();
  };

/**
 * Optional: dipakai untuk endpoint yang tetap bisa diakses publik,
 * tapi perilakunya berubah kalau ada user login (mis. admin lihat data tambahan).
 * TIDAK melempar error kalau token tidak ada / tidak valid — cukup lanjut tanpa req.user.
 */
export const optionalAuth = catchAsync(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const payload = verifyAccessToken(token);
      const user = await User.findById(payload.sub);
      if (user && user.isActive) {
        req.user = user;
      }
    } catch (err) {
      // Token invalid/expired -> abaikan saja, tetap perlakukan sebagai publik.
    }
  }

  next();
});