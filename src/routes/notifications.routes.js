import { Router } from 'express';
import { listNotifications, markAsRead, markAllAsRead } from '../controllers/notifications.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(protect);

router.get('/', listNotifications);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);

export default router;