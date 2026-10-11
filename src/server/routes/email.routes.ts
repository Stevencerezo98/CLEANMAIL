import { Router } from 'express';
import { EmailController } from '../controllers/email.controller.ts';
import { uploadMiddleware } from '../middlewares/upload.middleware.ts';

const router = Router();

// Endpoint: POST /api/emails/upload - Subir archivos para depuración
router.post(
  '/upload',
  uploadMiddleware.any() as any,
  EmailController.uploadAndProcess
);

// Endpoint: GET /api/emails/category/:id - Obtener correos filtrados por categoría
router.get('/category/:id', EmailController.getByCategory);

// Endpoint: GET /api/emails/export/:id - Exportar la lista limpia a CSV (delimitador ;)
router.get('/export/:id', EmailController.exportCleanCsv);

// Endpoint: GET /api/emails/export-xlsx/:id - Exportar la lista limpia a formato nativo Excel (.xlsx)
router.get('/export-xlsx/:id', EmailController.exportCleanXlsx);

// Endpoint: GET /api/emails/export-txt/:id - Exportar lista de correos en texto plano (uno por línea)
router.get('/export-txt/:id', EmailController.exportCleanTxt);

// Endpoint: POST /api/emails/reaudit-category/:id - Re-auditar categoría completa con reglas anti-fraude
router.post('/reaudit-category/:id', EmailController.reauditCategory);

// Validación en vivo de un correo individual
router.post('/validate-single', EmailController.validateSingle);

// Estadísticas globales
router.get('/stats', EmailController.getStats);

// Edición de un correo por ID
router.put('/:id', EmailController.updateEmail);

// Eliminación de un correo por ID
router.delete('/:id', EmailController.deleteEmail);

// Eliminación masiva por lista de IDs
router.post('/bulk-delete', EmailController.deleteEmailsBulk);

// Eliminación masiva por filtro (ej. todos los inválidos de una categoría)
router.post('/bulk-delete-filter', EmailController.deleteEmailsByFilter);

// Mover correos masivamente a otra categoría
router.post('/bulk-move', EmailController.moveEmailsBulk);

export default router;
