import { Request, Response } from 'express';
import { CategoryService } from '../services/category.service.ts';

export class CategoryController {
  public static async getCategories(_req: Request, res: Response) {
    try {
      const categories = CategoryService.getAllCategories();
      return res.json({
        success: true,
        data: categories,
      });
    } catch (error) {
      const err = error as Error;
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async createCategory(req: Request, res: Response) {
    try {
      const { nombre, descripcion } = req.body;
      if (!nombre) {
        return res.status(400).json({ success: false, message: 'El campo "nombre" es obligatorio.' });
      }

      const newCategory = CategoryService.createCategory(nombre, descripcion);
      return res.status(201).json({
        success: true,
        message: 'Categoría creada con éxito.',
        data: newCategory,
      });
    } catch (error) {
      const err = error as Error;
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  public static async updateCategory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { nombre, descripcion } = req.body;

      const updated = CategoryService.updateCategory(id, { nombre, descripcion });
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Categoría no encontrada.' });
      }

      return res.json({
        success: true,
        message: 'Categoría actualizada correctamente.',
        data: updated,
      });
    } catch (error) {
      const err = error as Error;
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async getCategoryAnalytics(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const cat = CategoryService.getCategoryById(id);
      if (!cat) {
        return res.status(404).json({ success: false, message: 'Categoría no encontrada.' });
      }

      const domainBreakdown = CategoryService.getDomainBreakdown(id);
      return res.json({
        success: true,
        data: {
          category: cat,
          domains: domainBreakdown,
        },
      });
    } catch (error) {
      const err = error as Error;
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async deleteCategory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = CategoryService.deleteCategory(id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Categoría no encontrada.' });
      }

      return res.json({
        success: true,
        message: 'Categoría y sus correos eliminados correctamente.',
      });
    } catch (error) {
      const err = error as Error;
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}
