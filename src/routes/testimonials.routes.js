import { Router } from 'express';
import { createTestimonial, listTestimonials, approveTestimonial } from '../controllers/testimonials.controller.js';
import { protect, restrictTo, optionalAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/', optionalAuth, listTestimonials);
router.post('/', protect, createTestimonial);
router.patch('/:id/approve', protect, restrictTo('admin'), approveTestimonial);

export default router;