import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Trash2,
  FolderInput,
  Download,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Globe,
  Filter,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { Categoria } from '../server/db/schema.ts';

interface InteractiveAnalyticsHubProps {
  category: Categoria | undefined;
  onFilterByDomain: (domain: string) => void;
  onPurgeInvalid: () => Promise<void>;
  onMoveRolesToNewList: () => Promise<void>;
  onExportDeliverableOnly: () => void;
  isPurging: boolean;
}

interface DomainStat {
  domain: string;
  total: number;
  validos: number;
  invalidos: number;
  porcentaje: number;
}

export const InteractiveAnalyticsHub: React.FC<InteractiveAnalyticsHubProps> = ({
  category,
  onFilterByDomain,
  onPurgeInvalid,
  onMoveRolesToNewList,
  onExportDeliverableOnly,
  isPurging,
}) => {
  const [domainStats, setDomainStats] = useState<DomainStat[]>([]);
  const [loadingDomains, setLoadingDomains] = useState(false);

  useEffect(() => {
    if (!category?.id) return;
    const fetchDomains = async () => {
      try {
        setLoadingDomains(true);
        const res = await fetch(`/api/categories/${category.id}/analytics`);
        const data = await res.json();
        if (data.success && data.data?.domains) {
          setDomainStats(data.data.domains);
        }
      } catch (err) {
        console.error('Error cargando analítica de dominios:', err);
      } finally {
        setLoadingDomains(false);
      }
    };

    fetchDomains();
  }, [category?.id, category?.total_correos]);

  if (!category || (category.total_correos || 0) === 0) {
    return null;
  }

  const total = category.total_correos || 0;
  const validos = category.validos || 0;
  const genericos = category.genericos_rol || 0;
  const invalidos = category.invalidos || 0;
  const healthRate = total > 0 ? Math.round((validos / total) * 100) : 0;
  const bounceRiskRate = total > 0 ? ((invalidos / total) * 100).toFixed(1) : '0';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5 animate-fade-in">
      {/* Header with Quick Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#00a2c7]" />
            <h3 className="font-extrabold text-sm text-slate-800">
              Centro de Acciones Dinámicas & Salud de la Lista
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Optimiza tu base de datos en 1 clic: elimina rebotes y segmenta cuentas departamentales.
          </p>
        </div>

        {/* 1-Click Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {invalidos > 0 && (
            <button
              onClick={onPurgeInvalid}
              disabled={isPurging}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50"
              title="Elimina todos los correos inválidos de esta lista con 1 clic"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isPurging ? 'Purgando...' : `Purgar ${invalidos} Inválidos`}</span>
            </button>
          )}

          {genericos > 0 && (
            <button
              onClick={onMoveRolesToNewList}
              disabled={isPurging}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50"
              title="Mueve los correos de rol a una lista de revisión aislada"
            >
              <FolderInput className="w-3.5 h-3.5" />
              <span>Aislar {genericos} Cuentas de Rol</span>
            </button>
          )}

          <button
            onClick={onExportDeliverableOnly}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-2xs cursor-pointer"
            title="Descarga exclusivamente los correos Deliverable comprobados"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar {validos} Deliverables</span>
          </button>
        </div>
      </div>

      {/* Health Dial & Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Health Indicator */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-[#f0f9fb] to-white border border-[#d2eff6] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Salud de Entrega
            </span>
            <span className="text-2xl font-black text-slate-900 font-mono">
              {healthRate}%
            </span>
            <p className="text-[11px] text-emerald-700 font-semibold mt-0.5 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{healthRate >= 80 ? 'Excelente Entregabilidad' : healthRate >= 60 ? 'Entregabilidad Moderada' : 'Riesgo Alto'}</span>
            </p>
          </div>

          <div className="w-14 h-14 rounded-full border-4 border-[#00a2c7] flex items-center justify-center font-bold text-xs text-[#00a2c7] bg-white shadow-xs">
            {healthRate}%
          </div>
        </div>

        {/* Bounce Risk Indicator */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Tasa de Rebote Estimada
            </span>
            <span className="text-2xl font-black text-rose-600 font-mono">
              {bounceRiskRate}%
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {invalidos} contactos provocarían rebote duro (Hard Bounce).
            </p>
          </div>

          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Clean Efficiency */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Score Promedio de Calidad
            </span>
            <span className="text-2xl font-black text-[#00a2c7] font-mono">
              {category.promedio_score || 0}/100
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Auditoría DNS MX y sintaxis RFC completada.
            </p>
          </div>

          <div className="w-12 h-12 rounded-2xl bg-[#e6f6fa] text-[#00a2c7] flex items-center justify-center border border-[#b2e5f1]">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Interactive Domain Distribution Breakdown */}
      {domainStats.length > 0 && (
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-[#00a2c7]" />
              <span>Distribución por Dominio (Haz clic en un dominio para filtrar la tabla)</span>
            </span>
            <span className="text-[11px] text-slate-400">
              {domainStats.length} proveedores principales
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {domainStats.map((ds) => (
              <button
                key={ds.domain}
                onClick={() => onFilterByDomain(ds.domain)}
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-[#f0f9fb] hover:border-[#00a2c7] transition text-left cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 group-hover:text-[#00a2c7] truncate">
                    {ds.domain}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-500">
                    {ds.porcentaje}%
                  </span>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className="bg-[#00a2c7] h-full rounded-full"
                    style={{ width: `${Math.max(ds.porcentaje, 6)}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                  <span>{ds.total} correos</span>
                  <span className="text-emerald-600 font-semibold">{ds.validos} válidos</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
