import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller.ts';
import { AuthController } from '../controllers/auth.controller.ts';

const router = Router();

// Todas las rutas de administración requieren autenticación y rol de Administrador
router.get('/config', AuthController.requireAdmin, AdminController.getConfig);
router.put('/config', AuthController.requireAdmin, AdminController.updateConfig);

export default router;
