import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  Download,
  Search,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  ArrowRight,
  Plus,
  Layers,
  AlertCircle,
  Edit,
  Edit3,
  FolderInput,
  CheckSquare,
  Square,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { Categoria, Correo, EstadoEmail, TipoEmail, UploadProcessSummary } from '../server/db/schema.ts';
import { InteractiveAnalyticsHub } from './InteractiveAnalyticsHub.tsx';
import { EditEmailModal } from './EditEmailModal.tsx';
import { EditCategoryModal } from './EditCategoryModal.tsx';
import { ConfirmModal } from './ConfirmModal.tsx';
import { UpgradePlanModal } from './UpgradePlanModal.tsx';

interface VerifyListViewProps {
  categories: Categoria[];
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
  onOpenNewCategoryModal: () => void;
  onUpdateCategory: (id: string, nombre: string, descripcion?: string) => Promise<void>;
  correos: Correo[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  searchTerm: string;
  statusFilter: EstadoEmail | 'TODOS';
  typeFilter: TipoEmail | 'TODOS';
  scoreFilter: string;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: EstadoEmail | 'TODOS') => void;
  onTypeFilterChange: (value: TipoEmail | 'TODOS') => void;
  onScoreFilterChange: (value: string) => void;
  onPageChange: (newPage: number) => void;
  onDeleteEmail: (id: string) => Promise<void>;
  onBulkDelete: (ids: string[]) => Promise<void>;
  onBulkMove: (ids: string[], targetCategoryId: string) => Promise<void>;
  onPurgeInvalid: () => Promise<void>;
  onMoveRolesToNewList: () => Promise<void>;
  onEditEmail: (id: string, data: { email: string; estado: EstadoEmail; observacion: string; reVerify: boolean }) => Promise<void>;
  onUploadSuccess: (summary: UploadProcessSummary, targetCatId?: string) => void;
  loading: boolean;
}

export const VerifyListView: React.FC<VerifyListViewProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onOpenNewCategoryModal,
  onUpdateCategory,
  correos,
  total,
  page,
  limit,
  totalPages,
  searchTerm,
  statusFilter,
  typeFilter,
  scoreFilter,
  onSearchChange,
  onStatusFilterChange,
  onTypeFilterChange,
  onScoreFilterChange,
  onPageChange,
  onDeleteEmail,
  onBulkDelete,
  onBulkMove,
  onPurgeInvalid,
  onMoveRolesToNewList,
  onEditEmail,
  onUploadSuccess,
  loading,
}) => {
  const [checkDns, setCheckDns] = useState(true);
  const [autoCorrect, setAutoCorrect] = useState(true);
  const [verifyExternal, setVerifyExternal] = useState(true);

  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [includeRolesInExport, setIncludeRolesInExport] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [lastUploadSummary, setLastUploadSummary] = useState<UploadProcessSummary | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeModalMessage, setUpgradeModalMessage] = useState('');

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [targetMoveCatId, setTargetMoveCatId] = useState('');
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isPurging, setIsPurging] = useState(false);

  // Modals state
  const [editingEmail, setEditingEmail] = useState<Correo | null>(null);
  const [isEditCategoryOpen, setIsEditCategoryOpen] = useState(false);

  // Confirm Modal state (replaces window.confirm so deletion is never blocked in iframes)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const effectiveCatId = selectedCategoryId || (categories.length > 0 ? categories[0].id : '');
  const activeCategory = categories.find((c) => c.id === effectiveCatId) || categories[0];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(Array.from(e.target.files));
    }
  };

  const uploadFiles = async (files: File[]) => {
    const targetCatId = effectiveCatId;
    if (!targetCatId) {
      setErrorMessage('Por favor crea o selecciona una lista de destino antes de subir archivos.');
      return;
    }

    setErrorMessage('');
    setIsProcessing(true);
    setProgress(15);
    setStatusMessage(`Analizando ${files.length} archivo(s)...`);
    setLastUploadSummary(null);

    const formData = new FormData();
    formData.append('categoria_id', targetCatId);
    formData.append('check_dns', checkDns.toString());
    formData.append('auto_correct', autoCorrect.toString());
    formData.append('verify_external', verifyExternal.toString());
    formData.append('external_provider', 'debounce');

    files.forEach((file) => {
      formData.append('files', file);
    });

    try {
      setProgress(35);
      setStatusMessage('Extrayendo contactos y validando sintaxis RFC...');

      const interval = setInterval(() => {
        setProgress((prev) => (prev >= 85 ? prev : prev + 10));
      }, 350);

      const response = await fetch('/api/emails/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(interval);
      setProgress(95);
      setStatusMessage('Guardando resultados y deduplicando...');

      const result = await response.json();
      if (!response.ok || !result.success) {
        if (result.quotaExceeded) {
          setUpgradeModalMessage(result.message);
          setIsUpgradeModalOpen(true);
        }
        throw new Error(result.message || 'Error al procesar el archivo.');
      }

      setProgress(100);
      setStatusMessage('¡Proceso completado con éxito!');
      setLastUploadSummary(result.data);
      onUploadSuccess(result.data, targetCatId);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error(err);
      setErrorMessage((err as Error).message || 'Error al subir los archivos.');
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
      }, 1000);
    }
  };

  // Exportar lista limpia a CSV
  const handleExportCsv = async () => {
    const targetCatId = effectiveCatId;
    if (!targetCatId) return;
    setIsExporting(true);
    try {
      const url = `/api/emails/export/${targetCatId}?include_roles=${includeRolesInExport}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Error al generar la descarga del archivo CSV.');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      const safeName = (activeCategory?.nombre || 'List').replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `CleanMail_${safeName}_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (err) {
      setErrorMessage((err as Error).message || 'No se pudo exportar el CSV.');
    } finally {
      setIsExporting(false);
    }
  };

  // Bulk Selection Handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === correos.length && correos.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(correos.map((c) => c.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar correos seleccionados',
      message: `¿Estás seguro de eliminar los ${count} correos seleccionados de "${activeCategory?.nombre}"? Esta acción no se puede deshacer.`,
      confirmLabel: `Eliminar ${count} correos`,
      isDestructive: true,
      onConfirm: async () => {
        setIsConfirmLoading(true);
        setIsBulkDeleting(true);
        try {
          await onBulkDelete(Array.from(selectedIds));
          setSelectedIds(new Set());
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        } catch (err) {
          setErrorMessage((err as Error).message || 'Error al eliminar correos.');
        } finally {
          setIsBulkDeleting(false);
          setIsConfirmLoading(false);
        }
      },
    });
  };

  const handleBulkMove = async () => {
    if (selectedIds.size === 0 || !targetMoveCatId) return;
    try {
      await onBulkMove(Array.from(selectedIds), targetMoveCatId);
      setSelectedIds(new Set());
      setTargetMoveCatId('');
    } catch (err) {
      setErrorMessage((err as Error).message || 'Error al mover correos.');
    }
  };

  const handleExecutePurge = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Purgar correos inválidos',
      message: `¿Deseas purgar y eliminar definitivamente todos los correos con estado INVÁLIDO de la lista "${activeCategory?.nombre}"?`,
      confirmLabel: 'Purgar inválidos',
      isDestructive: true,
      onConfirm: async () => {
        setIsConfirmLoading(true);
        setIsPurging(true);
        try {
          await onPurgeInvalid();
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        } catch (err) {
          setErrorMessage((err as Error).message || 'Error al purgar inválidos.');
        } finally {
          setIsPurging(false);
          setIsConfirmLoading(false);
        }
      },
    });
  };

  const handleExecuteMoveRoles = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Aislar cuentas de rol',
      message: '¿Deseas mover todas las cuentas de rol a una nueva lista de revisión aislada?',
      confirmLabel: 'Aislar cuentas',
      isDestructive: false,
      onConfirm: async () => {
        setIsConfirmLoading(true);
        setIsPurging(true);
        try {
          await onMoveRolesToNewList();
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        } catch (err) {
          setErrorMessage((err as Error).message || 'Error al mover cuentas de rol.');
        } finally {
          setIsPurging(false);
          setIsConfirmLoading(false);
        }
      },
    });
  };

  const getStatusBadge = (estado: EstadoEmail, tipo?: TipoEmail) => {
    switch (estado) {
      case 'VALIDO':
        return (
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Deliverable</span>
          </span>
        );
      case 'GENERICO_ROL':
        if (tipo === 'De_Rol') {
          return (
            <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200 inline-flex items-center gap-1">
              <span>Role Account</span>
            </span>
          );
        }
        return (
          <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 inline-flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            <span>Risky (No verificado)</span>
          </span>
        );
      case 'INVALIDO':
        return (
          <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 inline-flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            <span>Undeliverable</span>
          </span>
        );
    }
  };

  const otherCategories = categories.filter((c) => c.id !== effectiveCatId);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Title & Category Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Verify List</h1>
            <button
              onClick={() => setIsEditCategoryOpen(true)}
              className="p-1.5 text-slate-400 hover:text-[#00a2c7] hover:bg-[#00a2c7]/10 rounded-lg transition cursor-pointer"
              title="Renombrar o editar descripción de esta lista"
            >
              <Edit className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Depuración de listas (CSV, XLSX, TXT) con edición individual, borrado masivo y auditoría MX.
          </p>
        </div>

        {/* Category Picker */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-3 py-1.5 shadow-xs">
            <Layers className="w-3.5 h-3.5 text-[#00a2c7]" />
            <span className="text-xs text-slate-500 font-medium">Lista:</span>
            <select
              value={effectiveCatId}
              onChange={(e) => onSelectCategory(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer max-w-[200px] truncate"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} ({c.total_correos || 0})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={onOpenNewCategoryModal}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[#00a2c7] hover:bg-[#0092b3] text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Crear Lista</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex flex-wrap items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2 font-medium flex-1">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {(errorMessage.toLowerCase().includes('límite') ||
              errorMessage.toLowerCase().includes('plan') ||
              errorMessage.toLowerCase().includes('crédito')) && (
              <button
                onClick={() => {
                  setUpgradeModalMessage(errorMessage);
                  setIsUpgradeModalOpen(true);
                }}
                className="px-3 py-1 bg-[#00a2c7] hover:bg-[#0092b3] text-white font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Actualizar Plan</span>
              </button>
            )}
            <button
              onClick={() => setErrorMessage('')}
              className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Health & Actions Hub */}
      <InteractiveAnalyticsHub
        category={activeCategory}
        onFilterByDomain={(domain) => onSearchChange(domain)}
        onPurgeInvalid={handleExecutePurge}
        onMoveRolesToNewList={handleExecuteMoveRoles}
        onExportDeliverableOnly={handleExportCsv}
        isPurging={isPurging}
      />

      {/* Upload Zone */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        {/* Dropzone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
            isDragging
              ? 'border-[#00a2c7] bg-[#f0f9fb]'
              : 'border-slate-300 bg-[#fafcfd] hover:bg-[#f3f9fb] hover:border-[#00a2c7]'
          } ${isProcessing ? 'pointer-events-none opacity-60' : ''}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".csv,.xlsx,.xls,.txt"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="w-12 h-12 rounded-2xl bg-[#e6f6fa] text-[#00a2c7] flex items-center justify-center shadow-xs">
            <UploadCloud className="w-6 h-6" />
          </div>

          <div>
            <p className="text-sm font-bold text-slate-800">
              Arrastra tus archivos aquí o haz clic para examinarlos
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Formatos soportados: <span className="font-semibold text-slate-700">.CSV, .XLSX, .XLS, .TXT</span>
            </p>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium">
            <span>• Detección automática en cualquier columna</span>
            <span>• Deduplicación instantánea</span>
            <span>• Autocorrección de dominios</span>
          </div>
        </div>

        {/* Options Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
          <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2.5 rounded-xl border border-slate-200 select-none">
            <input
              type="checkbox"
              checked={checkDns}
              onChange={(e) => setCheckDns(e.target.checked)}
              className="w-4 h-4 rounded text-[#00a2c7] focus:ring-[#00a2c7]"
            />
            <span className="font-semibold text-slate-700">Validar Servidores DNS MX</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2.5 rounded-xl border border-slate-200 select-none">
            <input
              type="checkbox"
              checked={autoCorrect}
              onChange={(e) => setAutoCorrect(e.target.checked)}
              className="w-4 h-4 rounded text-[#00a2c7] focus:ring-[#00a2c7]"
            />
            <span className="font-semibold text-slate-700">Autocorregir Errores de Tipeo</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2.5 rounded-xl border border-slate-200 select-none">
            <input
              type="checkbox"
              checked={verifyExternal}
              onChange={(e) => setVerifyExternal(e.target.checked)}
              className="w-4 h-4 rounded text-[#00a2c7] focus:ring-[#00a2c7]"
            />
            <span className="font-semibold text-slate-700">Puntuación de Confianza (0-100%)</span>
          </label>
        </div>

        {/* Processing Progress Bar */}
        {isProcessing && (
          <div className="p-4 rounded-xl bg-[#f0f9fb] border border-[#d2eff6] space-y-2 animate-fade-in">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#00a2c7] font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00a2c7] animate-ping"></span>
                {statusMessage}
              </span>
              <span className="font-mono font-bold text-slate-700">{progress}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-[#00a2c7] h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Processing Summary Card */}
        {lastUploadSummary && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-xs text-emerald-800">
                  Depuración finalizada ({lastUploadSummary.tiempo_procesamiento_ms} ms) - {lastUploadSummary.total_leidos} correos procesados en lista "{activeCategory?.nombre}"
                </span>
              </div>
              <button
                onClick={() => setLastUploadSummary(null)}
                className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer font-bold px-1.5 py-0.5 rounded"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs pt-1">
              <div className="bg-white p-2.5 rounded-lg border border-emerald-200 text-emerald-800">
                <span className="text-[10px] font-bold uppercase block text-emerald-600">Válidos (Deliverable)</span>
                <span className="text-base font-extrabold">{lastUploadSummary.validos}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-amber-200 text-amber-800">
                <span className="text-[10px] font-bold uppercase block text-amber-600">De Rol (Risky)</span>
                <span className="text-base font-extrabold">{lastUploadSummary.genericos_rol}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-rose-200 text-rose-800">
                <span className="text-[10px] font-bold uppercase block text-rose-600">Inválidos / Sin MX</span>
                <span className="text-base font-extrabold">{lastUploadSummary.invalidos}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-purple-200 text-purple-800">
                <span className="text-[10px] font-bold uppercase block text-purple-600">Duplicados Omitidos</span>
                <span className="text-base font-extrabold">{lastUploadSummary.duplicados_omitidos}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-sky-200 text-sky-800">
                <span className="text-[10px] font-bold uppercase block text-sky-600">Score Promedio</span>
                <span className="text-base font-extrabold">{lastUploadSummary.promedio_score}%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total en Lista</p>
          <p className="text-2xl font-black text-slate-900 mt-1 font-mono">
            {activeCategory?.total_correos || 0}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Deliverable</p>
          <p className="text-2xl font-black text-emerald-600 mt-1 font-mono">
            {activeCategory?.validos || 0}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Risky (Roles)</p>
          <p className="text-2xl font-black text-amber-600 mt-1 font-mono">
            {activeCategory?.genericos_rol || 0}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Undeliverable</p>
          <p className="text-2xl font-black text-rose-600 mt-1 font-mono">
            {activeCategory?.invalidos || 0}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#00a2c7]">Score Promedio</p>
          <p className="text-2xl font-black text-[#00a2c7] mt-1 font-mono">
            {activeCategory?.promedio_score || 0}%
          </p>
        </div>
      </div>

      {/* Data Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
        {/* Table Filters & Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row gap-3 md:items-center justify-between">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Buscar correo, dominio u observación..."
                className="w-full text-xs pl-8 pr-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00a2c7]"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value as EstadoEmail | 'TODOS')}
              className="text-xs px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00a2c7]"
            >
              <option value="TODOS">Todos los Estados</option>
              <option value="VALIDO">Deliverable</option>
              <option value="GENERICO_ROL">Risky (Rol)</option>
              <option value="INVALIDO">Undeliverable</option>
            </select>

            {/* Score Filter */}
            <select
              value={scoreFilter}
              onChange={(e) => onScoreFilterChange(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00a2c7]"
            >
              <option value="ALL">Cualquier Score</option>
              <option value="HIGH_80">Alta Confianza (≥ 80)</option>
              <option value="MID_50">Media (50 - 79)</option>
              <option value="LOW_50">Baja / Riesgosa (&lt; 50)</option>
            </select>
          </div>

          {/* Export Button */}
          <div className="flex items-center gap-2 shrink-0">
            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeRolesInExport}
                onChange={(e) => setIncludeRolesInExport(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-[#00a2c7] focus:ring-[#00a2c7]"
              />
              <span className="text-[11px]">Incluir Roles</span>
            </label>

            <button
              onClick={handleExportCsv}
              disabled={isExporting || total === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Exportando...' : 'Exportar CSV Limpio'}</span>
            </button>
          </div>
        </div>

        {/* Bulk Action Bar (Visible when items are selected) */}
        {selectedIds.size > 0 && (
          <div className="px-4 py-2.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 text-xs animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-[#00a2c7]" />
              <span className="font-bold">
                {selectedIds.size} correo{selectedIds.size > 1 ? 's' : ''} seleccionado{selectedIds.size > 1 ? 's' : ''}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {otherCategories.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <select
                    value={targetMoveCatId}
                    onChange={(e) => setTargetMoveCatId(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-white text-xs px-2.5 py-1.5 rounded-lg focus:outline-none"
                  >
                    <option value="">Mover a otra lista...</option>
                    {otherCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleBulkMove}
                    disabled={!targetMoveCatId}
                    className="px-3 py-1.5 rounded-lg bg-[#00a2c7] hover:bg-[#0092b3] disabled:opacity-40 text-white text-xs font-bold transition cursor-pointer"
                  >
                    Mover
                  </button>
                </div>
              )}

              <button
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isBulkDeleting ? 'Eliminando...' : 'Eliminar Seleccionados'}</span>
              </button>

              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Deseleccionar
              </button>
            </div>
          </div>
        )}

        {/* Loading bar indicator */}
        <div className="h-0.5 w-full bg-slate-100 overflow-hidden">
          {loading && <div className="h-full bg-[#00a2c7] animate-pulse w-full"></div>}
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto max-h-[520px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8fafc] text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={correos.length > 0 && selectedIds.size === correos.length}
                    onChange={toggleSelectAll}
                    className="w-3.5 h-3.5 rounded text-[#00a2c7] focus:ring-[#00a2c7] cursor-pointer"
                    title="Seleccionar todos los correos visibles"
                  />
                </th>
                <th className="px-4 py-3">Correo Electrónico</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Score Confianza</th>
                <th className="px-4 py-3">Dominio & DNS MX</th>
                <th className="px-4 py-3">Diagnóstico</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-slate-100 transition-opacity duration-150 ${loading ? 'opacity-60' : 'opacity-100'}`}>
              {loading && correos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-[#00a2c7] animate-ping"></span>
                      <span>Consultando lista...</span>
                    </div>
                  </td>
                </tr>
              ) : correos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-700">No hay correos en esta categoría</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Arrastra tus archivos CSV o XLSX en el área superior para comenzar a depurar.
                    </p>
                  </td>
                </tr>
              ) : (
                correos.map((item) => {
                  const isChecked = selectedIds.has(item.id);
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition ${
                        isChecked ? 'bg-[#f0f9fb]/60' : ''
                      }`}
                    >
                      <td className="px-4 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectOne(item.id)}
                          className="w-3.5 h-3.5 rounded text-[#00a2c7] focus:ring-[#00a2c7] cursor-pointer"
                        />
                      </td>

                      <td className="px-4 py-2.5 font-medium text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs">{item.email}</span>
                          {item.corregido && (
                            <span
                              title={`Original: ${item.original_email}`}
                              className="text-[9px] bg-sky-50 text-sky-700 border border-sky-200 px-1.5 py-0.5 rounded-full"
                            >
                              Corregido
                            </span>
                          )}
                        </div>
                        {item.corregido && (
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                            <span className="line-through">{item.original_email}</span>
                            <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
                            <span className="text-sky-600 font-semibold">{item.email}</span>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-2.5">{getStatusBadge(item.estado, item.tipo)}</td>

                      <td className="px-4 py-2.5">
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                            (item.score_confianza ?? 0) >= 80
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : (item.score_confianza ?? 0) >= 50
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {item.score_confianza ?? 0}/100
                        </span>
                      </td>

                      <td className="px-4 py-2.5 text-slate-600 font-mono text-[11px]">
                        <div>{item.dominio}</div>
                        <div className="text-[10px] text-slate-400 font-sans">
                          {item.mx_valido ? (
                            <span className="text-emerald-600 font-semibold">● Servidor MX Activo</span>
                          ) : (
                            <span className="text-rose-500 font-semibold">○ Sin Servidor MX</span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-2.5 text-slate-500 text-[11px] max-w-xs">
                        <p className="line-clamp-2" title={item.observacion}>
                          {item.observacion}
                        </p>
                      </td>

                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditingEmail(item)}
                            className="p-1.5 text-slate-400 hover:text-[#00a2c7] hover:bg-[#00a2c7]/10 rounded-lg transition cursor-pointer"
                            title="Editar correo"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setConfirmModal({
                                isOpen: true,
                                title: 'Eliminar correo',
                                message: `¿Deseas eliminar permanentemente "${item.email}" de esta lista?`,
                                confirmLabel: 'Eliminar correo',
                                isDestructive: true,
                                onConfirm: async () => {
                                  setIsConfirmLoading(true);
                                  try {
                                    await onDeleteEmail(item.id);
                                    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                                  } catch (err) {
                                    setErrorMessage((err as Error).message || 'Error al eliminar correo.');
                                  } finally {
                                    setIsConfirmLoading(false);
                                  }
                                },
                              });
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Eliminar correo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            Mostrando {total === 0 ? 0 : (page - 1) * limit + 1} - {Math.min(page * limit, total)} de{' '}
            <strong className="text-slate-800">{total}</strong> correos
          </div>

          {totalPages > 1 && (
            <div className="flex items-center space-x-1">
              <button
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-slate-300 bg-white disabled:opacity-40 hover:bg-slate-100 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-mono text-slate-700 font-bold">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-slate-300 bg-white disabled:opacity-40 hover:bg-slate-100 cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Email Modal */}
      <EditEmailModal
        isOpen={Boolean(editingEmail)}
        onClose={() => setEditingEmail(null)}
        emailItem={editingEmail}
        onSave={onEditEmail}
      />

      {/* Edit Category Modal */}
      <EditCategoryModal
        isOpen={isEditCategoryOpen}
        onClose={() => setIsEditCategoryOpen(false)}
        category={activeCategory}
        onSave={onUpdateCategory}
      />

      {/* Confirm Action Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        isDestructive={confirmModal.isDestructive}
        isLoading={isConfirmLoading}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => {
          if (!isConfirmLoading) {
            setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          }
        }}
      />

      {/* Upgrade Plan Modal */}
      <UpgradePlanModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        currentConfig={null}
        onPlanUpgraded={() => {
          setErrorMessage('');
        }}
        message={upgradeModalMessage}
      />
    </div>
  );
};
