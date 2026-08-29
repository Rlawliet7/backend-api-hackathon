import { Router } from 'express';
import { registerDevice, listDevices, updateDeviceStatus, regenerateDeviceKey } from '../controllers/devices.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(protect, restrictTo('admin'));

router.post('/', registerDevice);
router.get('/', listDevices);
router.patch('/:id/status', updateDeviceStatus);
router.post('/:id/regenerate-key', regenerateDeviceKey);

export default router;