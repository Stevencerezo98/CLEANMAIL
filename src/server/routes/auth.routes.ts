import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.ts';

const router = Router();

router.post('/login', AuthController.login);
router.get('/me', AuthController.verifySession);
router.post('/logout', AuthController.logout);

export default router;
