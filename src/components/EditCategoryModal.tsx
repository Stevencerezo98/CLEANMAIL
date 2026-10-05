import React, { useState, useEffect } from 'react';
import { X, FolderEdit, CheckCircle2 } from 'lucide-react';
import { Categoria } from '../server/db/schema.ts';

interface EditCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: Categoria | null;
  onSave: (id: string, nombre: string, descripcion?: string) => Promise<void>;
}

export const EditCategoryModal: React.FC<EditCategoryModalProps> = ({
  isOpen,
  onClose,
  category,
  onSave,
}) => {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (category) {
      setNombre(category.nombre);
      setDescripcion(category.descripcion || '');
      setErrorMsg('');
    }
  }, [category]);

  if (!isOpen || !category) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await onSave(category.id, nombre.trim(), descripcion.trim());
      onClose();
    } catch (err) {
      setErrorMsg((err as Error).message || 'Error al actualizar la categoría.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md shadow-xl overflow-hidden p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#00a2c7]/10 text-[#00a2c7] flex items-center justify-center">
              <FolderEdit className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-base text-slate-900">Editar Lista / Categoría</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Nombre de la Lista</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="ej: Base Principal 2026, Leads B2B..."
              required
              autoFocus
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00a2c7]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Descripción / Notas (Opcional)</label>
            <textarea
              rows={2}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Detalles sobre el origen o propósito de estos contactos..."
              className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00a2c7]"
            />
          </div>

          {errorMsg && <p className="text-xs text-rose-500">{errorMsg}</p>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !nombre.trim()}
              className="px-4 py-2 bg-[#00a2c7] hover:bg-[#0092b3] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
