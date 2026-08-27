import { Router } from 'express';
import { listCategories, createCategory } from '../controllers/categories.controllers.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/', listCategories);
router.post('/', protect, restrictTo('admin'), createCategory);

export default router;