import { Router } from 'express';
import categoryRoutes from './category.routes.ts';
import emailRoutes from './email.routes.ts';
import authRoutes from './auth.routes.ts';
import adminRoutes from './admin.routes.ts';
import { AdminController } from '../controllers/admin.controller.ts';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/categories', categoryRoutes);
apiRouter.use('/emails', emailRoutes);

// Endpoint público para obtener los planes de depuración activos en la landing
apiRouter.get('/plans', AdminController.getPublicPlans);

// Health check endpoint
apiRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'CleanMail API Engine',
    timestamp: new Date().toISOString(),
  });
});

export default apiRouter;
