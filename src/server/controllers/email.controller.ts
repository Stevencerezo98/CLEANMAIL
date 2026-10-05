import { Request, Response } from 'express';
import { EmailService } from '../services/email.service.ts';
import { CategoryService } from '../services/category.service.ts';
import { parseFileContent } from '../utils/fileParser.ts';
import { EstadoEmail, TipoEmail, ExternalValidationProvider } from '../db/schema.ts';

export class EmailController {
  /**
   * Endpoint 3: POST /api/emails/upload
   * Sube uno o varios archivos asignándolos a una categoria_id y procesa la depuración completa,
   * con soporte opcional para verificación externa y puntuación de confianza.
   */
  public static async uploadAndProcess(req: Request, res: Response) {
    try {
      const categoria_id = req.body.categoria_id;
      if (!categoria_id) {
        return res.status(400).json({
          success: false,
          message: 'Debe especificar el campo "categoria_id" para asignar la lista.',
        });
      }

      // Validar si la categoría existe
      const category = CategoryService.getCategoryById(categoria_id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: `La categoría con ID "${categoria_id}" no existe.`,
        });
      }

      // Verificar archivos recibidos
      const files: Express.Multer.File[] = [];
      if (req.file) {
        files.push(req.file);
      }
      if (req.files) {
        if (Array.isArray(req.files)) {
          files.push(...req.files);
        } else if (typeof req.files === 'object') {
          for (const key of Object.keys(req.files)) {
            const arr = (req.files as Record<string, Express.Multer.File[]>)[key];
            if (Array.isArray(arr)) files.push(...arr);
          }
        }
      }

      if (files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No se envió ningún archivo para procesar. Formatos válidos: CSV, XLSX, TXT.',
        });
      }

      // Parsear todos los archivos subidos y extraer los correos
      const allExtractedEmails: string[] = [];
      for (const file of files) {
        const parsed = parseFileContent(file.buffer, file.originalname);
        for (const item of parsed) {
          allExtractedEmails.push(item.rawEmail);
        }
      }

      if (allExtractedEmails.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No se encontraron direcciones de correo en los archivos proporcionados.',
        });
      }

      const checkDns = req.body.check_dns !== 'false' && req.body.check_dns !== false;
      const autoCorrect = req.body.auto_correct !== 'false' && req.body.auto_correct !== false;

      // Opciones de verificación externa
      const verifyExternal = req.body.verify_external === 'true' || req.body.verify_external === true;
      const externalProvider = (req.body.external_provider as ExternalValidationProvider) || 'debounce';
      const apiKey = req.body.api_key as string | undefined;

      // Procesar el lote de correos a través del pipeline de limpieza
      const summary = await EmailService.processEmailBatch(categoria_id, allExtractedEmails, {
        checkDns,
        autoCorrect,
        externalVerify: {
          enabled: verifyExternal,
          provider: externalProvider,
          apiKey,
        },
      });

      return res.status(200).json({
        success: true,
        message: `Procesamiento finalizado con éxito. ${summary.validos} válidos, ${summary.genericos_rol} de rol, ${summary.invalidos} inválidos, ${summary.duplicados_omitidos} duplicados omitidos. Score promedio: ${summary.promedio_score}/100.`,
        data: summary,
      });
    } catch (error) {
      const err = error as Error;
      console.error('Error al procesar subida de correos:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Endpoint 4: GET /api/emails/category/:id
   * Obtiene los correos filtrados por categoría, estado, puntuación mínima/máxima de confianza y paginados.
   */
  public static async getByCategory(req: Request, res: Response) {
    try {
      const categoria_id = req.params.id;
      const estado = req.query.estado as EstadoEmail | 'TODOS';
      const tipo = req.query.tipo as TipoEmail | 'TODOS';
      const search = req.query.search as string;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

      // Filtros de puntuación de confianza (0 - 100)
      const minScore = req.query.min_score !== undefined && req.query.min_score !== ''
        ? parseInt(req.query.min_score as string, 10)
        : undefined;

      const maxScore = req.query.max_score !== undefined && req.query.max_score !== ''
        ? parseInt(req.query.max_score as string, 10)
        : undefined;

      const category = CategoryService.getCategoryById(categoria_id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: `Categoría no encontrada.`,
        });
      }

      const result = EmailService.getEmailsByCategory(categoria_id, {
        estado,
        tipo,
        search,
        min_score: minScore,
        max_score: maxScore,
        page,
        limit,
      });

      return res.json({
        success: true,
        categoria: category,
        data: result,
      });
    } catch (error) {
      const err = error as Error;
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Endpoint 5: GET /api/emails/export/:id
   * Exporta la lista limpia de una categoría específica a formato CSV.
   */
  public static async exportCleanCsv(req: Request, res: Response) {
    try {
      const categoria_id = req.params.id;
      const includeRoles = req.query.include_roles === 'true';

      const category = CategoryService.getCategoryById(categoria_id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: `Categoría no encontrada.`,
        });
      }

      const csvData = EmailService.generateExportCsv(categoria_id, includeRoles);
      const safeName = category.nombre.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Emails_Limpios_${safeName}_${Date.now()}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send('\uFEFF' + csvData); // Con BOM UTF-8 para apertura perfecta en Excel
    } catch (error) {
      const err = error as Error;
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Validación interactiva de un correo individual (para tests y depuración en vivo con API externa)
   */
  public static async validateSingle(req: Request, res: Response) {
    try {
      const { email, provider, api_key } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, message: 'El campo "email" es requerido.' });
      }

      const result = await EmailService.validateSingleEmail(email, {
        enabled: true,
        provider: provider || 'debounce',
        apiKey: api_key,
      });
      return res.json({ success: true, data: result });
    } catch (error) {
      const err = error as Error;
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * Editar un registro individual de correo (con opción de re-verificación)
   */
  public static async updateEmail(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { email, estado, observacion, reVerify } = req.body;

      const updated = await EmailService.updateEmail(id, {
        email,
        estado,
        observacion,
        reVerify: Boolean(reVerify),
      });

      if (!updated) {
        return res.status(404).json({ success: false, message: 'Correo no encontrado.' });
      }

      return res.json({
        success: true,
        message: 'Correo actualizado correctamente.',
        data: updated,
      });
    } catch (error) {
      const err = error as Error;
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Eliminar un registro individual de correo
   */
  public static async deleteEmail(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = EmailService.deleteEmail(id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Correo no encontrado.' });
      }
      return res.json({ success: true, message: 'Correo eliminado.' });
    } catch (error) {
      const err = error as Error;
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Eliminación masiva por lista de IDs
   */
  public static async deleteEmailsBulk(req: Request, res: Response) {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, message: 'Se requiere un arreglo de IDs no vacío.' });
      }

      const deletedCount = EmailService.deleteEmailsBulk(ids);
      return res.json({
        success: true,
        message: `${deletedCount} correos eliminados correctamente.`,
        data: { deletedCount },
      });
    } catch (error) {
      const err = error as Error;
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Eliminación masiva por filtro (ej. purgar todos los inválidos de una categoría)
   */
  public static async deleteEmailsByFilter(req: Request, res: Response) {
    try {
      const { categoria_id, filter } = req.body;
      if (!categoria_id || !filter) {
        return res.status(400).json({ success: false, message: 'Se requiere categoria_id y tipo de filtro.' });
      }

      const deletedCount = EmailService.deleteEmailsByFilter(categoria_id, filter);
      return res.json({
        success: true,
        message: `Depuración completada: ${deletedCount} correos eliminados.`,
        data: { deletedCount },
      });
    } catch (error) {
      const err = error as Error;
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Mover correos masivamente a otra categoría
   */
  public static async moveEmailsBulk(req: Request, res: Response) {
    try {
      const { ids, target_categoria_id } = req.body;
      if (!Array.isArray(ids) || ids.length === 0 || !target_categoria_id) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere lista de IDs y la categoría de destino.',
        });
      }

      const movedCount = EmailService.moveEmailsBulk(ids, target_categoria_id);
      return res.json({
        success: true,
        message: `${movedCount} correos movidos correctamente.`,
        data: { movedCount },
      });
    } catch (error) {
      const err = error as Error;
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Métricas globales
   */
  public static async getStats(_req: Request, res: Response) {
    try {
      const stats = EmailService.getGlobalStats();
      return res.json({ success: true, data: stats });
    } catch (error) {
      const err = error as Error;
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}
