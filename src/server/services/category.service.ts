import { db } from '../db/database.ts';
import { Categoria } from '../db/schema.ts';

export class CategoryService {
  public static getAllCategories(): Categoria[] {
    return db.getAllCategories();
  }

  public static getCategoryById(id: string): Categoria | null {
    return db.getCategoryById(id);
  }

  public static createCategory(nombre: string, descripcion?: string): Categoria {
    if (!nombre || !nombre.trim()) {
      throw new Error('El nombre de la categoría es obligatorio.');
    }
    return db.createCategory(nombre.trim(), descripcion);
  }

  public static updateCategory(id: string, updates: { nombre?: string; descripcion?: string }): Categoria | null {
    return db.updateCategory(id, updates);
  }

  public static deleteCategory(id: string): boolean {
    return db.deleteCategory(id);
  }

  public static getDomainBreakdown(id: string) {
    return db.getDomainBreakdown(id);
  }
}
