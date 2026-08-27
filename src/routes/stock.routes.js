import { Router } from 'express';
import { restock, getStockHistory, getLowStockProducts } from '../controllers/stock.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(protect, restrictTo('admin'));

router.post('/restock', restock);
router.get('/history', getStockHistory);
router.get('/low-stock', getLowStockProducts);

export default router;