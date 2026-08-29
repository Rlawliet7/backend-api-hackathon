import { Router } from 'express';
import { createReview, listProductReviews } from '../controllers/reviews.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = Router({ mergeParams: true });

router.get('/', listProductReviews);
router.post('/', protect, createReview);

export default router;