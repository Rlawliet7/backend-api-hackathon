import { Router } from 'express';
import { getCart, addCartItem, updateCartItem, removeCartItem, clearCart } from '../controllers/cart.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(protect);

router.get('/', getCart);
router.delete('/', clearCart);

router.post('/items/:productId', addCartItem);
router.patch('/items/:productId', updateCartItem);
router.delete('/items/:productId', removeCartItem);

export default router;