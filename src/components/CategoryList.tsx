import React, { useState } from 'react';
import { Folder, FolderPlus, Trash2, FolderOpen, Layers, CheckCircle2, AlertCircle } from 'lucide-react';
import { Categoria } from '../server/db/schema.ts';

interface CategoryListProps {
  categories: Categoria[];
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
  onCreateCategory: (nombre: string) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  loading: boolean;
}

export const CategoryList: React.FC<CategoryListProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onCreateCategory,
  onDeleteCategory,
  loading,
}) => {
  const [newCatName, setNewCatName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setErrorMsg('');
    setIsSubmitting(true);
    try {
      await onCreateCategory(newCatName.trim());
      setNewCatName('');
    } catch (err) {
      setErrorMsg((err as Error).message || 'Error al crear categoría');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/80 shadow-md backdrop-blur-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-sky-400" />
          <h2 className="font-bold text-sm text-white">Categorías / Listas</h2>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
          {categories.length}
        </span>
      </div>

      {/* Formulario para crear categoría */}
      <form onSubmit={handleCreate} className="space-y-2">
        <div className="flex gap-1.5">
          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="Nueva lista (ej. Clientes 2026)..."
            disabled={isSubmitting}
            className="w-full text-xs px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
          />
          <button
            type="submit"
            disabled={isSubmitting || !newCatName.trim()}
            title="Crear categoría"
            className="px-3 py-2 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center shrink-0 shadow-sm shadow-sky-600/20"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
        </div>
        {errorMsg && <p className="text-[11px] text-rose-400 font-medium">{errorMsg}</p>}
      </form>

      {/* Lista de categorías */}
      <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
        {categories.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs">
            No hay categorías registradas. Crea una para comenzar.
          </div>
        ) : (
          categories.map((cat) => {
            const isSelected = cat.id === selectedCategoryId;
            return (
              <div
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`group relative p-2.5 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                  isSelected
                    ? 'bg-sky-500/10 border-sky-500/40 text-sky-200 font-semibold shadow-sm'
                    : 'bg-slate-900/40 border-slate-700/50 hover:bg-slate-700/40 text-slate-300 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate min-w-0 pr-2">
                  {isSelected ? (
                    <FolderOpen className="w-4 h-4 text-sky-400 shrink-0" />
                  ) : (
                    <Folder className="w-4 h-4 text-slate-400 shrink-0 group-hover:text-slate-200" />
                  )}
                  <span className="truncate">{cat.nombre}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isSelected
                        ? 'bg-sky-500 text-white'
                        : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-slate-200'
                    }`}
                  >
                    {cat.total_correos || 0}
                  </span>

                  {categories.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          window.confirm(
                            `¿Estás seguro de eliminar la categoría "${cat.nombre}" y todos sus correos asociados?`
                          )
                        ) {
                          onDeleteCategory(cat.id);
                        }
                      }}
                      title="Eliminar categoría"
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Info panel sobre aislamiento de listas */}
      <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
        <div className="flex items-center gap-1.5 font-medium text-slate-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Aislamiento Estricto</span>
        </div>
        <p className="text-[10px] leading-relaxed text-slate-400">
          Cada categoría mantiene su propia base de datos independiente. Los duplicados se depuran por lista sin mezclar registros.
        </p>
      </div>
    </div>
  );
};
