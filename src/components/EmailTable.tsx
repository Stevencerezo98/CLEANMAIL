import React, { useState } from 'react';
import {
  Download,
  Search,
  Trash2,
  CheckCircle2,
  Users,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Globe,
  FileSpreadsheet,
  ArrowRight,
  Sparkles,
  Award,
  Globe2,
} from 'lucide-react';
import { Correo, EstadoEmail, TipoEmail, Categoria } from '../server/db/schema.ts';

interface EmailTableProps {
  category?: Categoria;
  correos: Correo[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  searchTerm: string;
  statusFilter: EstadoEmail | 'TODOS';
  typeFilter: TipoEmail | 'TODOS';
  scoreFilter: string; // 'ALL', 'HIGH_80', 'MID_50', 'LOW_50'
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: EstadoEmail | 'TODOS') => void;
  onTypeFilterChange: (value: TipoEmail | 'TODOS') => void;
  onScoreFilterChange: (value: string) => void;
  onPageChange: (newPage: number) => void;
  onDeleteEmail: (id: string) => Promise<void>;
  loading: boolean;
}

export const EmailTable: React.FC<EmailTableProps> = ({
  category,
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
  loading,
}) => {
  const [includeRolesInExport, setIncludeRolesInExport] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Endpoint 5: GET /api/emails/export/:id
  const handleExportCsv = async () => {
    if (!category) return;
    setIsExporting(true);
    try {
      const url = `/api/emails/export/${category.id}?include_roles=${includeRolesInExport}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Error al generar la descarga del archivo CSV.');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      const safeName = category.nombre.replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `Emails_Limpios_${safeName}_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const getEstadoBadge = (estado: EstadoEmail) => {
    switch (estado) {
      case 'VALIDO':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> VÁLIDO
          </span>
        );
      case 'GENERICO_ROL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Users className="w-3 h-3" /> ROL / GENÉRICO
          </span>
        );
      case 'INVALIDO':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-3 h-3" /> INVÁLIDO
          </span>
        );
    }
  };

  const getTipoBadge = (tipo: TipoEmail) => {
    switch (tipo) {
      case 'Corporativo':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            Corporativo
          </span>
        );
      case 'Personal':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-500/10 text-sky-300 border border-sky-500/20">
            Personal
          </span>
        );
      case 'De_Rol':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
            De Rol
          </span>
        );
    }
  };

  const getScoreBadge = (score: number, source: string) => {
    let colorClass = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    let label = 'Riesgoso';

    if (score >= 80) {
      colorClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      label = 'Excelente';
    } else if (score >= 50) {
      colorClass = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      label = 'Moderado';
    }

    return (
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${colorClass}`}>
            {score}/100
          </span>
          <span className="text-[10px] text-slate-400 font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-1 text-[9px] text-slate-500 truncate max-w-[130px]" title={source}>
          <Globe2 className="w-2.5 h-2.5 text-slate-500 shrink-0" />
          <span className="truncate">{source || 'Local'}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 shadow-md backdrop-blur-sm overflow-hidden flex flex-col">
      {/* Barra de Controles y Exportación */}
      <div className="p-4 border-b border-slate-700/60 bg-slate-800/40 flex flex-col md:flex-row gap-3 md:items-center justify-between">
        {/* Filtros y Búsqueda */}
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Buscador */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar por correo, dominio u observación..."
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Filtro Estado */}
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as EstadoEmail | 'TODOS')}
            className="text-xs px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="TODOS">Todos los Estados</option>
            <option value="VALIDO">Sólo Válidos</option>
            <option value="GENERICO_ROL">Sólo Genéricos/Rol</option>
            <option value="INVALIDO">Sólo Inválidos</option>
          </select>

          {/* Filtro Tipo */}
          <select
            value={typeFilter}
            onChange={(e) => onTypeFilterChange(e.target.value as TipoEmail | 'TODOS')}
            className="text-xs px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="TODOS">Todos los Tipos</option>
            <option value="Corporativo">Corporativo</option>
            <option value="Personal">Personal</option>
            <option value="De_Rol">De Rol</option>
          </select>

          {/* Filtro Puntuación de Confianza (Endpoint Requirement) */}
          <select
            value={scoreFilter}
            onChange={(e) => onScoreFilterChange(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-xl bg-indigo-950/40 border border-indigo-500/40 text-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Cualquier Score</option>
            <option value="HIGH_80">Alta Confianza (≥ 80)</option>
            <option value="MID_50">Confianza Media (50 - 79)</option>
            <option value="LOW_50">Riesgoso (&lt; 50)</option>
          </select>
        </div>

        {/* Acciones de Exportación */}
        <div className="flex items-center gap-2 shrink-0">
          <label className="hidden sm:flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeRolesInExport}
              onChange={(e) => setIncludeRolesInExport(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-sky-500 bg-slate-900 border-slate-700 focus:ring-sky-500"
            />
            <span className="text-[11px] text-slate-300">Incluir De Rol</span>
          </label>

          <button
            onClick={handleExportCsv}
            disabled={isExporting || total === 0}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-emerald-700/20 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Generando CSV...' : 'Exportar CSV Limpio'}</span>
          </button>
        </div>
      </div>

      {/* Tabla de Resultados */}
      <div className="overflow-x-auto max-h-[500px]">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/90 text-slate-400 font-semibold sticky top-0 z-10 uppercase tracking-wider text-[10px] border-b border-slate-800">
            <tr>
              <th className="px-4 py-3">Correo Depurado</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Score Confianza</th>
              <th className="px-4 py-3">Dominio & DNS MX</th>
              <th className="px-4 py-3">Observación / Diagnóstico</th>
              <th className="px-4 py-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-sky-400 animate-ping"></span>
                    <span>Cargando lista de correos...</span>
                  </div>
                </td>
              </tr>
            ) : correos.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400">
                  <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-slate-500 opacity-60" />
                  <p className="font-semibold text-slate-300">No hay correos en esta vista</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Sube un archivo a esta categoría o ajusta los filtros de búsqueda o score.
                  </p>
                </td>
              </tr>
            ) : (
              correos.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-700/20 transition duration-150 group"
                >
                  {/* Correo y si fue corregido */}
                  <td className="px-4 py-2.5 font-medium text-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{item.email}</span>
                      {item.corregido && (
                        <span
                          title={`Original: ${item.original_email}`}
                          className="flex items-center gap-1 text-[10px] text-sky-400 bg-sky-400/10 px-1.5 py-0.5 rounded border border-sky-400/20 font-sans"
                        >
                          <Sparkles className="w-2.5 h-2.5" /> Corregido
                        </span>
                      )}
                    </div>
                    {item.corregido && (
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                        <span className="line-through">{item.original_email}</span>
                        <ArrowRight className="w-2.5 h-2.5 text-slate-500" />
                        <span className="text-sky-300">{item.email}</span>
                      </div>
                    )}
                  </td>

                  {/* Estado */}
                  <td className="px-4 py-2.5">{getEstadoBadge(item.estado)}</td>

                  {/* Tipo */}
                  <td className="px-4 py-2.5">{getTipoBadge(item.tipo)}</td>

                  {/* Puntuación de Confianza Externa */}
                  <td className="px-4 py-2.5">
                    {getScoreBadge(item.score_confianza ?? 0, item.fuente_verificacion)}
                  </td>

                  {/* Dominio y MX */}
                  <td className="px-4 py-2.5 text-slate-300">
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      <Globe className="w-3 h-3 text-slate-500" />
                      <span>{item.dominio}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                      {item.mx_valido ? (
                        <span className="text-emerald-400 font-semibold">● MX Activo</span>
                      ) : (
                        <span className="text-rose-400 font-semibold">○ Sin MX</span>
                      )}
                    </div>
                  </td>

                  {/* Observación */}
                  <td className="px-4 py-2.5 text-slate-400 text-[11px] max-w-xs">
                    <p className="line-clamp-2 leading-relaxed" title={item.observacion}>
                      {item.observacion}
                    </p>
                  </td>

                  {/* Acciones */}
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => onDeleteEmail(item.id)}
                      title="Eliminar de la lista"
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación y contador inferior */}
      <div className="p-3 border-t border-slate-700/60 bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
        <div>
          Mostrando{' '}
          <span className="font-bold text-slate-200">
            {total === 0 ? 0 : (page - 1) * limit + 1}
          </span>{' '}
          - <span className="font-bold text-slate-200">{Math.min(page * limit, total)}</span> de{' '}
          <span className="font-bold text-slate-200">{total}</span> correos en{' '}
          <span className="text-sky-400 font-semibold">"{category?.nombre || 'Categoría'}"</span>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center space-x-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-700 text-slate-200"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono text-slate-300 font-semibold">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-700 text-slate-200"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
