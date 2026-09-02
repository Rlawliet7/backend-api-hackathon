import bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import { User, RefreshToken } from '../models/index.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';
import env from '../config/env.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, durationToMs } from '../utils/token.js';

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

/**
 * Helper: buat access + refresh token untuk user, simpan refresh token ke DB,
 * lalu kembalikan payload siap dikirim sebagai response.
 */
const issueTokens = async (user, req) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  await RefreshToken.create({
    userId: user._id,
    token: refreshToken,
    expiresAt: new Date(Date.now() + durationToMs(env.JWT_REFRESH_EXPIRES)),
    createdByIp: req.ip,
  });

  return { accessToken, refreshToken };
};

const toPublicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  avatarUrl: user.avatarUrl,
  loyaltyPoints: user.loyaltyPoints,
  isVerified: user.isVerified,
});

/**
 * POST /auth/register — Public
 * Body: { name, email, password }
 */
export const register = catchAsync(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, 'name, email, dan password wajib diisi.');
  }
  if (password.length < 8) {
    throw new ApiError(400, 'Password minimal 8 karakter.');
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new ApiError(400, 'Pendaftaran gagal. Periksa kembali data Anda.');
  }

  const hashedPassword = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password: hashedPassword,
    authProvider: 'local',
    role: 'customer',
  });

  const { accessToken, refreshToken } = await issueTokens(user, req);

  res.status(201).json({
    success: true,
    message: 'Registrasi berhasil.',
    data: { user: toPublicUser(user), accessToken, refreshToken },
  });
});

/**
 * POST /auth/login — Public
 * Body: { email, password }
 */
export const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'email dan password wajib diisi.');
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || user.authProvider !== 'local' || !user.password) {
    throw new ApiError(401, 'Email atau password salah.');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new ApiError(401, 'Email atau password salah.');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Akun Anda telah dinonaktifkan.');
  }

  const { accessToken, refreshToken } = await issueTokens(user, req);

  res.status(200).json({
    success: true,
    message: 'Login berhasil.',
    data: { user: toPublicUser(user), accessToken, refreshToken },
  });
});

/**
 * POST /auth/google — Public
 * Body: { idToken }
 * Login jika email sudah ada, register otomatis jika belum (role default customer).
 */
export const googleAuth = catchAsync(async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) {
    throw new ApiError(400, 'idToken wajib diisi.');
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (err) {
    throw new ApiError(401, 'Google ID token tidak valid.');
  }

  const { sub: googleId, email, name, picture } = payload;

  let user = await User.findOne({ email: email.toLowerCase() });

  if (user) {
    // Jika akun sebelumnya dibuat manual, tetap izinkan login via Google & tandai googleId.
    if (!user.googleId) {
      user.googleId = googleId;
      user.authProvider = 'google';
      await user.save();
    }
  } else {
    user = await User.create({
      name,
      email: email.toLowerCase(),
      password: null,
      authProvider: 'google',
      googleId,
      avatarUrl: picture,
      role: 'customer',
      isVerified: true,
    });
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Akun Anda telah dinonaktifkan.');
  }

  const { accessToken, refreshToken } = await issueTokens(user, req);

  res.status(200).json({
    success: true,
    message: 'Login dengan Google berhasil.',
    data: { user: toPublicUser(user), accessToken, refreshToken },
  });
});

/**
 * POST /auth/refresh — Public (butuh refreshToken)
 * Body: { refreshToken }
 *
 * Catatan (Bab 16 #1): kontrak belum menegaskan cookie vs body.
 * Keputusan di implementasi ini: refreshToken dikirim & dibaca dari BODY request.
 */
export const refresh = catchAsync(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    throw new ApiError(400, 'refreshToken wajib diisi.');
  }

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (err) {
    throw new ApiError(401, 'Refresh token tidak valid atau sudah kedaluwarsa.');
  }

  const storedToken = await RefreshToken.findOne({ token: refreshToken, userId: payload.sub });
  if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
    throw new ApiError(401, 'Refresh token tidak valid, sudah revoked, atau kedaluwarsa.');
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) {
    throw new ApiError(401, 'User tidak ditemukan atau nonaktif.');
  }

  const accessToken = generateAccessToken(user);

  res.status(200).json({
    success: true,
    message: 'Access token diperbarui.',
    data: { accessToken },
  });
});

/**
 * POST /auth/logout — Protected
 * Body: { refreshToken }
 * Revoke refresh token yang bersangkutan.
 */
export const logout = catchAsync(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    throw new ApiError(400, 'refreshToken wajib diisi.');
  }

  await RefreshToken.updateOne(
    { token: refreshToken, userId: req.user._id },
    { $set: { revoked: true } }
  );

  res.status(200).json({
    success: true,
    message: 'Logout berhasil.',
    data: null,
  });
});

/**
 * GET /auth/me — Protected
 */
export const getMe = catchAsync(async (req, res) => {
  res.status(200).json({
    success: true,
    data: { user: toPublicUser(req.user) },
  });
});