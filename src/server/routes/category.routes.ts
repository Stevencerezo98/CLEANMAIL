import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller.ts';

const router = Router();

// POST /api/categories - Crear una nueva categoría
router.post('/', CategoryController.createCategory);

// GET /api/categories - Listar categorías con conteo de correos
router.get('/', CategoryController.getCategories);

// PUT /api/categories/:id - Editar categoría (nombre, descripción)
router.put('/:id', CategoryController.updateCategory);

// GET /api/categories/:id/analytics - Distribución de dominios y analítica
router.get('/:id/analytics', CategoryController.getCategoryAnalytics);

// DELETE /api/categories/:id - Eliminar una categoría
router.delete('/:id', CategoryController.deleteCategory);

export default router;
