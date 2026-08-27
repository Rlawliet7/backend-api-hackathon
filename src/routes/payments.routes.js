import { Router } from 'express';
import { getPayment, simulatePayment } from '../controllers/payments.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(protect);

router.get('/:id', getPayment);
router.post('/:id/simulate', simulatePayment);

export default router;