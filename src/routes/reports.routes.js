import { Router } from 'express';
import { getSalesSummary, getTopProducts, getStockMovement } from '../controllers/reports.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(protect, restrictTo('admin'));

router.get('/sales-summary', getSalesSummary);
router.get('/top-products', getTopProducts);
router.get('/stock-movement', getStockMovement);

export default router;