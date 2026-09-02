import { Router } from 'express';
import { createFeedback, listFeedback, updateFeedback } from '../controllers/feedback.controller.js';
import { restrictTo, protect, optionalAuth } from '../middlewares/auth.middleware.js';

const router = Router();

// Public-Protected: guest maupun user login boleh kirim. optionalAuth mengisi req.user kalau ada token valid.
router.post('/', optionalAuth, createFeedback);

router.get('/', protect, restrictTo('admin'), listFeedback);
router.patch('/:id', protect, restrictTo('admin'), updateFeedback);

export default router;