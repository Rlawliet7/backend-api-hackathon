import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import env from '../config/env.js';

/**
 * Generate access token (short-lived) berisi userId & role.
 */
export const generateAccessToken = (user) => {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES,
  });
};

/**
 * Generate refresh token (long-lived, random opaque JWT) untuk disimpan di koleksi refreshtokens.
 */
export const generateRefreshToken = (user) => {
  return jwt.sign({ sub: user._id.toString() }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES,
  });
};

export const verifyAccessToken = (token) => jwt.verify(token, env.JWT_ACCESS_SECRET);

export const verifyRefreshToken = (token) => jwt.verify(token, env.JWT_REFRESH_SECRET);

/**
 * Konversi string durasi ala JWT ("7d", "15m") ke milidetik, dipakai untuk expiresAt di DB.
 */
export const durationToMs = (duration) => {
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match) return 0;
  const value = Number(match[1]);
  const unit = match[2];
  const unitMs = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return value * unitMs[unit];
};

/**
 * Buat token acak (dipakai jika perlu identifier tambahan, misalnya untuk verifikasi email).
 */
export const generateRandomToken = () => crypto.randomBytes(32).toString('hex');