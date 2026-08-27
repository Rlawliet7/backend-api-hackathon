import { Router } from 'express';
import { listProducts, getProduct, createProduct, updateProduct, deleteProduct } from '../controllers/products.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/', listProducts);
router.get('/:idOrSlug', getProduct);

router.post('/', protect, restrictTo('admin'), createProduct);
router.patch('/:id', protect, restrictTo('admin'), updateProduct);
router.delete('/:id', protect, restrictTo('admin'), deleteProduct);

export default router;