import { Router } from 'express';
import { deleteReview } from '../controllers/reviews.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = Router();

router.delete('/:id', protect, deleteReview);

export default router;