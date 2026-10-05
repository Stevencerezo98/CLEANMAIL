import React from 'react';
import { CheckCircle2, Users, AlertOctagon, Sparkles, Database, Award } from 'lucide-react';
import { Categoria } from '../server/db/schema.ts';

interface StatsCardsProps {
  category?: Categoria;
  totalLoaded: number;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ category, totalLoaded }) => {
  const total = category?.total_correos ?? totalLoaded;
  const validos = category?.validos ?? 0;
  const genericos = category?.genericos_rol ?? 0;
  const invalidos = category?.invalidos ?? 0;
  const corregidos = category?.corregidos ?? 0;
  const promedioScore = category?.promedio_score ?? 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* Total */}
      <div className="bg-slate-800/80 rounded-2xl p-3.5 border border-slate-700/80 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Correos</span>
          <Database className="w-3.5 h-3.5 text-slate-400" />
        </div>
        <p className="text-xl font-black text-white mt-1 font-mono">{total}</p>
        <span className="text-[10px] text-slate-500">En esta lista</span>
      </div>

      {/* Válidos */}
      <div className="bg-emerald-950/20 rounded-2xl p-3.5 border border-emerald-500/30 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Válidos</span>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <p className="text-xl font-black text-emerald-400 mt-1 font-mono">{validos}</p>
        <span className="text-[10px] text-emerald-500/80">Listos para envío</span>
      </div>

      {/* Genéricos / Rol */}
      <div className="bg-amber-950/20 rounded-2xl p-3.5 border border-amber-500/30 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">De Rol</span>
          <Users className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <p className="text-xl font-black text-amber-400 mt-1 font-mono">{genericos}</p>
        <span className="text-[10px] text-amber-500/80">info@, ventas@, etc.</span>
      </div>

      {/* Inválidos */}
      <div className="bg-rose-950/20 rounded-2xl p-3.5 border border-rose-500/30 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Descartados</span>
          <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
        </div>
        <p className="text-xl font-black text-rose-400 mt-1 font-mono">{invalidos}</p>
        <span className="text-[10px] text-rose-500/80">Sin MX / Desechables</span>
      </div>

      {/* Corregidos */}
      <div className="bg-sky-950/20 rounded-2xl p-3.5 border border-sky-500/30 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">Autocorregidos</span>
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
        </div>
        <p className="text-xl font-black text-sky-400 mt-1 font-mono">{corregidos}</p>
        <span className="text-[10px] text-sky-500/80">Errores de tipeo</span>
      </div>

      {/* Puntuación de Confianza Media */}
      <div className="bg-gradient-to-br from-indigo-950/30 to-purple-950/30 rounded-2xl p-3.5 border border-indigo-500/30 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Score Medio</span>
          <Award className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <p className="text-xl font-black text-indigo-300 mt-1 font-mono">
          {promedioScore}
          <span className="text-xs text-indigo-400 font-sans font-semibold">/100</span>
        </p>
        <span className="text-[10px] text-indigo-400/80">Calidad de lista</span>
      </div>
    </div>
  );
};
