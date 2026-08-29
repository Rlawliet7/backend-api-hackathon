import { Router } from 'express';
import { ingestScan, listScans, mapProductRetroactive } from '../controllers/deviceScans.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
import { authenticateDevice } from '../middlewares/deviceAuth.middleware.js';
import { deviceScanLimiter } from '../middlewares/rateLimiter.middleware.js';

const router = Router();

// Dipanggil firmware ESP32-S3 — pakai X-Device-Key, BUKAN JWT user.
router.post('/', authenticateDevice, deviceScanLimiter, ingestScan);

// Admin only
router.get('/', protect, restrictTo('admin'), listScans);
router.patch('/:id/map-product', protect, restrictTo('admin'), mapProductRetroactive);

export default router;