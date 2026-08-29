import { Router } from 'express';
import { getActiveSessions, getSession, checkoutSession, cancelSession } from '../controllers/posSessions.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(protect, restrictTo('admin'));

router.get('/active', getActiveSessions);
router.get('/:id', getSession);
router.post('/:id/checkout', checkoutSession);
router.post('/:id/cancel', cancelSession);

export default router;