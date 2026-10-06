import React, { useState } from 'react';
import { FolderTree, Plus, Trash2, Layers, CheckCircle2, ShieldCheck, Edit } from 'lucide-react';
import { Categoria } from '../server/db/schema.ts';
import { EditCategoryModal } from './EditCategoryModal.tsx';
import { ConfirmModal } from './ConfirmModal.tsx';

interface CategoriesViewProps {
  categories: Categoria[];
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
  onCreateCategory: (nombre: string) => Promise<void>;
  onUpdateCategory: (id: string, nombre: string, descripcion?: string) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  onGoToVerifyList: () => void;
}

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  onGoToVerifyList,
}) => {
  const [newCatName, setNewCatName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [editingCat, setEditingCat] = useState<Categoria | null>(null);
  const [catToDelete, setCatToDelete] = useState<Categoria | null>(null);
  const [isDeletingCat, setIsDeletingCat] = useState(false);

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
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Categorías / Listas</h1>
        <p className="text-xs text-slate-500 mt-1">
          Aísla tus bases de datos (ej. "Clientes 2026", "Prospectos Resto") para depurarlas sin mezclar contactos.
        </p>
      </div>

      {/* Create form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4 text-[#00a2c7]" />
          <span>Crear Nueva Categoría</span>
        </h3>

        <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="Nombre de la lista (ej: Clientes 2026, Leads B2B)..."
            required
            className="flex-1 text-xs px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00a2c7]"
          />
          <button
            type="submit"
            disabled={isSubmitting || !newCatName.trim()}
            className="px-5 py-2.5 rounded-xl bg-[#00a2c7] hover:bg-[#0092b3] disabled:opacity-50 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Categoría</span>
          </button>
        </form>
        {errorMsg && <p className="text-xs text-rose-500 mt-2">{errorMsg}</p>}
      </div>

      {/* Grid of categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((cat) => {
          const isSelected = cat.id === selectedCategoryId;
          return (
            <div
              key={cat.id}
              className={`bg-white rounded-2xl border p-5 shadow-xs transition flex flex-col justify-between ${
                isSelected ? 'border-[#00a2c7] ring-2 ring-[#00a2c7]/20' : 'border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <FolderTree className="w-5 h-5 text-[#00a2c7]" />
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{cat.nombre}</h4>
                      {cat.descripcion && (
                        <p className="text-[11px] text-slate-400 line-clamp-1">{cat.descripcion}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingCat(cat)}
                      className="p-1.5 text-slate-400 hover:text-[#00a2c7] hover:bg-[#00a2c7]/10 rounded-lg transition cursor-pointer"
                      title="Renombrar o editar lista"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    {cat.id !== 'cat-general' && (
                      <button
                        onClick={() => setCatToDelete(cat)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Eliminar categoría"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 py-4 text-center">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Total</span>
                    <span className="text-base font-extrabold text-slate-800 font-mono">
                      {cat.total_correos || 0}
                    </span>
                  </div>

                  <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                    <span className="text-[10px] uppercase font-bold text-emerald-600 block">Válidos</span>
                    <span className="text-base font-extrabold text-emerald-700 font-mono">
                      {cat.validos || 0}
                    </span>
                  </div>

                  <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-100">
                    <span className="text-[10px] uppercase font-bold text-rose-600 block">Inválidos</span>
                    <span className="text-base font-extrabold text-rose-700 font-mono">
                      {cat.invalidos || 0}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Creado: {new Date(cat.fecha_creacion).toLocaleDateString()}
                </span>

                <button
                  onClick={() => {
                    onSelectCategory(cat.id);
                    onGoToVerifyList();
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-[#00a2c7] hover:text-white text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  Abrir Lista
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Category Modal */}
      <EditCategoryModal
        isOpen={Boolean(editingCat)}
        onClose={() => setEditingCat(null)}
        category={editingCat}
        onSave={onUpdateCategory}
      />

      {/* Delete Category Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(catToDelete)}
        title="Eliminar categoría"
        message={`¿Estás seguro de eliminar la categoría "${catToDelete?.nombre}" y todos sus correos asociados? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar lista"
        isDestructive={true}
        isLoading={isDeletingCat}
        onConfirm={async () => {
          if (!catToDelete) return;
          setIsDeletingCat(true);
          try {
            await onDeleteCategory(catToDelete.id);
            setCatToDelete(null);
          } catch (err) {
            setErrorMsg((err as Error).message || 'Error al eliminar categoría.');
          } finally {
            setIsDeletingCat(false);
          }
        }}
        onCancel={() => {
          if (!isDeletingCat) setCatToDelete(null);
        }}
      />

      {/* Info card */}
      <div className="bg-[#f0f9fb] border border-[#d2eff6] rounded-2xl p-4 flex items-center gap-3 text-xs text-slate-700">
        <ShieldCheck className="w-5 h-5 text-[#00a2c7] shrink-0" />
        <div>
          <strong className="text-slate-900 block font-semibold">Garantía de Aislamiento de Listas</strong>
          <span>
            Cada categoría mantiene su propia tabla aislada de correos y deduplicación. Al subir un archivo asignado a una categoría, jamás se mezclarán los contactos con otras listas.
          </span>
        </div>
      </div>
    </div>
  );
};
