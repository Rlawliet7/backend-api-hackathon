import { Device } from '../models/index.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';
import env from '../config/env.js';
import { generateApiKey, hashApiKey } from '../utils/deviceKey.js';

/**
 * POST /devices — Admin
 * Body: { deviceId, name, storeId }
 * apiKey mentah HANYA tampil di response ini, satu kali saja. Backend hanya simpan apiKeyHash.
 */
export const registerDevice = catchAsync(async (req, res) => {
  const { deviceId, name, storeId } = req.body;

  if (!deviceId) {
    throw new ApiError(400, 'deviceId wajib diisi.');
  }

  const existing = await Device.findOne({ deviceId });
  if (existing) {
    throw new ApiError(409, 'deviceId sudah terdaftar.');
  }

  const rawApiKey = generateApiKey();
  const apiKeyHash = hashApiKey(rawApiKey, env.DEVICE_KEY_HASH_SALT);

  const device = await Device.create({
    deviceId,
    name: name || null,
    storeId: storeId || null,
    apiKeyHash,
  });

  res.setHeader('Cache-Control', 'no-store');
  res.status(201).json({
    success: true,
    data: {
      id: device._id,
      deviceId: device.deviceId,
      apiKey: rawApiKey,
      note: 'Simpan key ini sekarang — tidak akan ditampilkan lagi. Tempel di firmware ESP32-S3.',
    },
  });
});

/**
 * GET /devices — Admin
 */
export const listDevices = catchAsync(async (req, res) => {
  const devices = await Device.find().sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: { devices },
  });
});

/**
 * PATCH /devices/:id/status — Admin
 * Body: { isActive: boolean }
 */
export const updateDeviceStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  if (typeof isActive !== 'boolean') {
    throw new ApiError(400, 'isActive wajib diisi dengan boolean.');
  }

  const device = await Device.findByIdAndUpdate(id, { isActive }, { new: true });
  if (!device) {
    throw new ApiError(404, 'Device tidak ditemukan.');
  }

  res.status(200).json({
    success: true,
    message: `Device berhasil di-${isActive ? 'aktifkan' : 'nonaktifkan'}.`,
    data: { device },
  });
});

/**
 * POST /devices/:id/regenerate-key — Admin
 * Key lama langsung tidak valid begitu key baru dibuat.
 */
export const regenerateDeviceKey = catchAsync(async (req, res) => {
  const { id } = req.params;

  const device = await Device.findById(id);
  if (!device) {
    throw new ApiError(404, 'Device tidak ditemukan.');
  }

  const rawApiKey = generateApiKey();
  device.apiKeyHash = hashApiKey(rawApiKey, env.DEVICE_KEY_HASH_SALT);
  await device.save();

  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    success: true,
    data: {
      id: device._id,
      deviceId: device.deviceId,
      apiKey: rawApiKey,
      note: 'Key lama sudah tidak valid. Simpan key baru ini sekarang — tidak akan ditampilkan lagi.',
    },
  });
});