import { Router } from 'express';
import { checkout, listOrders, getOrder, updateOrderStatus, cancelOrder } from '../controllers/orders.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(protect);

router.post('/', checkout);
router.get('/', listOrders);
router.get('/:id', getOrder);
router.patch('/:id/status', restrictTo('admin'), updateOrderStatus);
router.post('/:id/cancel', cancelOrder);

export default router;