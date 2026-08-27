import { Router } from 'express';
import {
  getMyProfile,
  updateMyProfile,
  addAddress,
  updateAddress,
  deleteAddress,
  listUsers,
  updateUserStatus,
} from '../controllers/user.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';

const router = Router();

// Semua route di bawah ini butuh login (Protected)
router.use(protect);

router.get('/me', getMyProfile);
router.patch('/me', updateMyProfile);

router.post('/me/addresses', addAddress);
router.patch('/me/addresses/:id', updateAddress);
router.delete('/me/addresses/:id', deleteAddress);

// Admin only
router.get('/', restrictTo('admin'), listUsers);
router.patch('/:id/status', restrictTo('admin'), updateUserStatus);

export default router;