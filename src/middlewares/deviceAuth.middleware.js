import ApiError from '../utils/ApiError.js';
import catchAsync from '../utils/catchAsync.js';
import env from '../config/env.js';
import { Device } from '../models/index.js';
import { hashApiKey } from '../utils/deviceKey.js';

/**
 * Device API Key: dipakai firmware ESP32-S3 memanggil POST /device/scans.
 * Header: X-Device-Key: <apiKey mentah>
 *
 * Catatan penting (Bab 16): rate limit untuk endpoint ini harus per-deviceId,
 * BUKAN per-IP, karena satu toko/router bisa punya banyak unit device di IP yang sama.
 * Middleware ini menaruh device di req.device supaya rate limiter berikutnya bisa pakai deviceId.
 */
export const authenticateDevice = catchAsync(async (req, res, next) => {
  const apiKey = req.headers['x-device-key'];

  if (!apiKey) {
    throw new ApiError(401, 'Device tidak dikenali');
  }

  const apiKeyHash = hashApiKey(apiKey, env.DEVICE_KEY_HASH_SALT);
  const device = await Device.findOne({ apiKeyHash });

  if (!device || !device.isActive) {
    throw new ApiError(401, 'Device tidak dikenali');
  }

  device.lastSeenAt = new Date();
  await device.save();

  req.device = device;
  next();
});