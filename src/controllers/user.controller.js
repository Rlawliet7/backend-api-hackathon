import { User } from '../models/index.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';

const toPublicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  avatarUrl: user.avatarUrl,
  addresses: user.addresses,
  loyaltyPoints: user.loyaltyPoints,
  isVerified: user.isVerified,
  isActive: user.isActive,
});

// Field yang boleh diubah user sendiri lewat PATCH /users/me
const ALLOWED_SELF_UPDATE_FIELDS = ['name', 'phone', 'avatarUrl'];

/**
 * GET /users/me — Protected
 */
export const getMyProfile = catchAsync(async (req, res) => {
  res.status(200).json({
    success: true,
    data: { user: toPublicUser(req.user) },
  });
});

/**
 * PATCH /users/me — Protected
 * Body: subset dari { name, phone, avatarUrl }
 * Catatan: email & password sengaja TIDAK bisa diubah lewat endpoint ini
 * (perubahan email/password butuh flow verifikasi terpisah, di luar cakupan kontrak saat ini).
 */
export const updateMyProfile = catchAsync(async (req, res) => {
  const updates = {};
  for (const field of ALLOWED_SELF_UPDATE_FIELDS) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, `Tidak ada field valid untuk diubah. Field yang diizinkan: ${ALLOWED_SELF_UPDATE_FIELDS.join(', ')}.`);
  }

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    message: 'Profil berhasil diperbarui.',
    data: { user: toPublicUser(user) },
  });
});

/**
 * POST /users/me/addresses — Protected
 * Body: { label, fullAddress, latitude, longitude, isDefault? }
 */
export const addAddress = catchAsync(async (req, res) => {
  const { label, fullAddress, latitude, longitude, isDefault } = req.body;

  if (!fullAddress) {
    throw new ApiError(400, 'fullAddress wajib diisi.');
  }

  const user = await User.findById(req.user._id);

  // Jika alamat baru ini dijadikan default, matikan default pada alamat lain.
  if (isDefault) {
    user.addresses.forEach((addr) => {
      addr.isDefault = false;
    });
  }

  user.addresses.push({
    label,
    fullAddress,
    latitude,
    longitude,
    isDefault: !!isDefault || user.addresses.length === 0, // alamat pertama otomatis default
  });

  await user.save();

  res.status(201).json({
    success: true,
    message: 'Alamat berhasil ditambahkan.',
    data: { addresses: user.addresses },
  });
});

/**
 * PATCH /users/me/addresses/:id — Protected
 */
export const updateAddress = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { label, fullAddress, latitude, longitude, isDefault } = req.body;

  const user = await User.findById(req.user._id);
  const address = user.addresses.id(id);

  if (!address) {
    throw new ApiError(404, 'Alamat tidak ditemukan.');
  }

  if (label !== undefined) address.label = label;
  if (fullAddress !== undefined) address.fullAddress = fullAddress;
  if (latitude !== undefined) address.latitude = latitude;
  if (longitude !== undefined) address.longitude = longitude;

  if (isDefault === true) {
    user.addresses.forEach((addr) => {
      addr.isDefault = addr._id.equals(address._id);
    });
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: 'Alamat berhasil diperbarui.',
    data: { addresses: user.addresses },
  });
});

/**
 * DELETE /users/me/addresses/:id — Protected
 */
export const deleteAddress = catchAsync(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(req.user._id);
  const address = user.addresses.id(id);

  if (!address) {
    throw new ApiError(404, 'Alamat tidak ditemukan.');
  }

  const wasDefault = address.isDefault;
  address.deleteOne();

  // Jika yang dihapus adalah default, jadikan alamat pertama yang tersisa sebagai default baru.
  if (wasDefault && user.addresses.length > 0) {
    user.addresses[0].isDefault = true;
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: 'Alamat berhasil dihapus.',
    data: { addresses: user.addresses },
  });
});

/**
 * GET /users — Admin
 * Query: ?page=1&limit=20&role=customer&search=budi
 */
export const listUsers = catchAsync(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 20);
  const filter = {};

  if (req.query.role) filter.role = req.query.role;
  if (req.query.search) {
    const safeSearch = req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { name: { $regex: safeSearch, $options: 'i' } },
      { email: { $regex: safeSearch, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 }),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: {
      users: users.map(toPublicUser),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  });
});

/**
 * PATCH /users/:id/status — Admin
 * Body: { isActive: boolean }
 */
export const updateUserStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  if (typeof isActive !== 'boolean') {
    throw new ApiError(400, 'isActive wajib diisi dengan boolean.');
  }

  if (id === req.user._id.toString()) {
    throw new ApiError(400, 'Anda tidak bisa mengubah status akun Anda sendiri.');
  }

  const user = await User.findByIdAndUpdate(id, { isActive }, { new: true });

  if (!user) {
    throw new ApiError(404, 'User tidak ditemukan.');
  }

  res.status(200).json({
    success: true,
    message: `User berhasil di-${isActive ? 'aktifkan' : 'nonaktifkan'}.`,
    data: { user: toPublicUser(user) },
  });
});