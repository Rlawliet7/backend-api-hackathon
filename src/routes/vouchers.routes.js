import { Router } from 'express';
import { createVoucher, listVouchers, validateVoucher } from '../controllers/vouchers.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(protect);

// Harus didaftar sebelum "/" agar tidak ketabrak route lain, meski di sini aman karena beda path literal.
router.get('/validate', validateVoucher);

router.post('/', restrictTo('admin'), createVoucher);
router.get('/', restrictTo('admin'), listVouchers);

export default router;