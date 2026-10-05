import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Globe,
  Sparkles,
  Layers,
  ArrowRight,
  Download,
  Trash2,
} from 'lucide-react';
import { Categoria } from '../server/db/schema.ts';

interface AnalyticsViewProps {
  categories: Categoria[];
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
  onGoToVerifyList: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onGoToVerifyList,
}) => {
  const activeCategory = categories.find((c) => c.id === selectedCategoryId) || categories[0];
  const [domainBreakdown, setDomainBreakdown] = useState<any[]>([]);

  useEffect(() => {
    if (!activeCategory?.id) return;
    fetch(`/api/categories/${activeCategory.id}/analytics`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.domains) {
          setDomainBreakdown(data.data.domains);
        }
      })
      .catch((err) => console.error(err));
  }, [activeCategory?.id]);

  const total = activeCategory?.total_correos || 0;
  const validos = activeCategory?.validos || 0;
  const roles = activeCategory?.genericos_rol || 0;
  const invalidos = activeCategory?.invalidos || 0;

  const deliverabilityRate = total > 0 ? Math.round((validos / total) * 100) : 0;
  const bounceRiskRate = total > 0 ? ((invalidos / total) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      {/* Title & Category Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Salud de Entrega & Analítica
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Diagnóstico profundo de reputación, riesgo de rebotes duros y desglose de proveedores.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-3 py-1.5 shadow-xs">
          <Layers className="w-3.5 h-3.5 text-[#00a2c7]" />
          <span className="text-xs text-slate-500 font-medium">Lista:</span>
          <select
            value={activeCategory?.id}
            onChange={(e) => onSelectCategory(e.target.value)}
            className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} ({c.total_correos || 0})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Entregabilidad Estimada
            </span>
            <span className="text-3xl font-black text-slate-900 font-mono mt-1 block">
              {deliverabilityRate}%
            </span>
            <span className="text-xs font-semibold text-emerald-600 mt-1 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{deliverabilityRate >= 80 ? 'Seguro para Envío' : 'Requiere Depuración'}</span>
            </span>
          </div>

          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg border border-emerald-200">
            {deliverabilityRate}%
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Riesgo de Rebote (Bounce)
            </span>
            <span className="text-3xl font-black text-rose-600 font-mono mt-1 block">
              {bounceRiskRate}%
            </span>
            <span className="text-xs text-slate-500 mt-1 block">
              {invalidos} contactos provocarían rebote duro
            </span>
          </div>

          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-lg border border-rose-200">
            <AlertTriangle className="w-7 h-7" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Cuentas Departamentales (Rol)
            </span>
            <span className="text-3xl font-black text-amber-600 font-mono mt-1 block">
              {roles}
            </span>
            <span className="text-xs text-slate-500 mt-1 block">
              Buzones info@, ventas@, soporte@
            </span>
          </div>

          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg border border-amber-200">
            <Sparkles className="w-7 h-7" />
          </div>
        </div>
      </div>

      {/* Domain Breakdown Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-[#00a2c7]" />
            <h2 className="text-base font-bold text-slate-900">
              Desglose de Servidores de Correo (Top Dominios)
            </h2>
          </div>
          <span className="text-xs text-slate-400">{total} correos totales</span>
        </div>

        {domainBreakdown.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8">
            No hay suficientes datos de dominios en esta lista.
          </p>
        ) : (
          <div className="space-y-3 pt-2">
            {domainBreakdown.map((item) => (
              <div key={item.domain} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">{item.domain}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500">{item.total} correos</span>
                    <span className="font-mono font-bold text-slate-700">{item.porcentaje}%</span>
                  </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-[#00a2c7] h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(item.porcentaje, 4)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action CTA */}
      <div className="p-5 rounded-2xl bg-[#00a2c7] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
        <div>
          <h3 className="font-bold text-sm">Gestionar registros en Verify List</h3>
          <p className="text-xs text-cyan-100 mt-0.5">
            Ver tabla completa, editar correos, realizar borrado masivo o exportar CSV limpio.
          </p>
        </div>

        <button
          onClick={onGoToVerifyList}
          className="px-5 py-2.5 rounded-xl bg-white text-[#00a2c7] font-bold text-xs hover:bg-cyan-50 transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>Ir a la Tabla de Correos</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
