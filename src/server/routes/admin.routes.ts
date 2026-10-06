import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller.ts';
import { AuthController } from '../controllers/auth.controller.ts';

const router = Router();

// Todas las rutas de administración requieren autenticación y rol de Administrador
router.get('/config', AuthController.requireAdmin, AdminController.getConfig);
router.put('/config', AuthController.requireAdmin, AdminController.updateConfig);

// Gestión de Planes de Depuración (Exclusivo Administrador)
router.get('/plans', AuthController.requireAdmin, AdminController.getPlans);
router.put('/plans/:id', AuthController.requireAdmin, AdminController.updatePlan);
router.post('/plans', AuthController.requireAdmin, AdminController.createPlan);
router.delete('/plans/:id', AuthController.requireAdmin, AdminController.deletePlan);
router.post('/plans/reset', AuthController.requireAdmin, AdminController.resetPlans);

export default router;
