import { Router } from 'express';
import { register, login, googleAuth, refresh, logout, getMe } from '../controllers/auth.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { authLimiter, googleAuthLimiter } from '../middlewares/ratelimitter.middleware.js';

const router = Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/google', googleAuthLimiter, googleAuth);
router.post('/refresh', refresh);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

router.all(['/register', '/login', '/google', '/refresh', '/logout'], (req, res) => {
  res.status(405).json({
    success: false,
    message: `Method ${req.method} tidak didukung. Gunakan POST untuk endpoint ini.`,
  });
});

export default router;
