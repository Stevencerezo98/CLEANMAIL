import React, { useState } from 'react';
import {
  X,
  Search,
  CheckCircle2,
  AlertOctagon,
  Sparkles,
  Server,
  Mail,
  ArrowRight,
  Award,
  Globe2,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { ExternalValidationProvider } from '../server/db/schema.ts';

interface SingleValidatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ValidationResponse {
  email: string;
  original_email: string;
  estado: 'VALIDO' | 'GENERICO_ROL' | 'INVALIDO';
  tipo: 'Personal' | 'Corporativo' | 'De_Rol';
  dominio: string;
  corregido: boolean;
  mx_valido: boolean;
  score_confianza: number;
  verificado_externo: boolean;
  fuente_verificacion: string;
  observacion: string;
  detalles: {
    sintaxis: boolean;
    error_sintaxis?: string;
    desechable: boolean;
    es_rol: boolean;
    mx: boolean;
    mx_detalle?: string;
    score?: number;
    provider?: string;
    spf?: boolean;
    dmarc?: boolean;
  };
}

export const SingleValidatorModal: React.FC<SingleValidatorModalProps> = ({ isOpen, onClose }) => {
  const [testEmail, setTestEmail] = useState('');
  const [provider, setProvider] = useState<ExternalValidationProvider>('debounce');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValidationResponse | null>(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/emails/validate-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail.trim(),
          provider,
          api_key: apiKey.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error en la validación.');
      }

      setResult(data.data);
    } catch (err) {
      setError((err as Error).message || 'Error comunicando con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (email: string) => {
    setTestEmail(email);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/40">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Prueba de Correo Individual & Score</h3>
              <p className="text-[11px] text-slate-400">
                Evalúa sintaxis, DNS MX y consulta en vivo la API externa de confianza
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          <form onSubmit={handleValidate} className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="ej. carlos@gmai.com, info@empresa.com..."
                  required
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !testEmail.trim()}
                className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-sky-600/20"
              >
                <Search className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>{loading ? 'Consultando...' : 'Diagnosticar'}</span>
              </button>
            </div>

            {/* Opciones de API Externa */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
              <div>
                <label className="text-[10px] text-slate-400 block font-semibold mb-0.5">
                  Proveedor de Score:
                </label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as ExternalValidationProvider)}
                  className="w-full text-[11px] px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-200"
                >
                  <option value="debounce">Debounce Free API + SPF/DMARC</option>
                  <option value="hunter">Hunter.io (Requiere Key)</option>
                  <option value="zerobounce">ZeroBounce (Requiere Key)</option>
                  <option value="abstract">AbstractAPI (Requiere Key)</option>
                </select>
              </div>

              {provider !== 'debounce' && (
                <div>
                  <label className="text-[10px] text-slate-400 block font-semibold mb-0.5">Clave API:</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Tu clave API..."
                    className="w-full text-[11px] px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-200"
                  />
                </div>
              )}
            </div>

            {/* Ejemplos rápidos */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
              <span className="text-slate-500">Ejemplos:</span>
              <button
                type="button"
                onClick={() => handleQuickFill('test.user@gmai.com')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                Typo (gmai.com)
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('ventas@microsoft.com')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                Rol (ventas@)
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('fake99@mailinator.com')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                Desechable
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('usuario@dominio-inexistente-xyz-123.org')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                Sin MX
              </button>
            </div>
          </form>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {error}
            </div>
          )}

          {/* Resultado del diagnóstico */}
          {result && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 animate-fade-in text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-white">{result.email}</span>
                  {result.corregido && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                      Autocorregido
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      result.estado === 'VALIDO'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : result.estado === 'GENERICO_ROL'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {result.estado}
                  </span>
                </div>
              </div>

              {/* Score Gauge Card */}
              <div className="p-3 rounded-xl bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900 border border-indigo-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" />
                    Puntuación de Confianza Externa
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-2xl font-black font-mono text-white">
                      {result.score_confianza}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">/100</span>
                    <span className="text-[11px] ml-2 text-indigo-300 font-medium">
                      {result.score_confianza >= 80
                        ? 'Excelente entregabilidad'
                        : result.score_confianza >= 50
                        ? 'Moderada / Precaución'
                        : 'Alto riesgo de rebote o bloqueo'}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[9px] uppercase text-slate-500 font-bold block">Proveedor</span>
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1 justify-end">
                    <Globe2 className="w-3 h-3 text-indigo-400" />
                    {result.fuente_verificacion}
                  </span>
                </div>
              </div>

              {result.corregido && (
                <div className="p-2 rounded bg-sky-500/10 border border-sky-500/20 text-sky-300 text-[11px] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    El correo original <span className="font-mono line-through">{result.original_email}</span> fue
                    reparado a <span className="font-mono font-bold">{result.email}</span>
                  </span>
                </div>
              )}

              {/* Grid de Checks */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Sintaxis Regex</span>
                  {result.detalles.sintaxis ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Válida
                    </span>
                  ) : (
                    <span className="text-rose-400 font-bold flex items-center gap-1">
                      <AlertOctagon className="w-3.5 h-3.5" /> Inválida
                    </span>
                  )}
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">DNS Servidor MX</span>
                  {result.detalles.mx ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <Server className="w-3.5 h-3.5" /> Activo
                    </span>
                  ) : (
                    <span className="text-rose-400 font-bold flex items-center gap-1">
                      <AlertOctagon className="w-3.5 h-3.5" /> Inexistente
                    </span>
                  )}
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Desechable/Temp</span>
                  {result.detalles.desechable ? (
                    <span className="text-rose-400 font-bold">Sí (Bloqueado)</span>
                  ) : (
                    <span className="text-emerald-400 font-bold">No (Limpio)</span>
                  )}
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Cuenta de Rol</span>
                  {result.detalles.es_rol ? (
                    <span className="text-amber-400 font-bold">Sí (Genérico)</span>
                  ) : (
                    <span className="text-slate-300 font-bold">No (Personal/Indiv.)</span>
                  )}
                </div>

                {result.detalles.spf !== undefined && (
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400">Registro SPF</span>
                    {result.detalles.spf ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> Configurado
                      </span>
                    ) : (
                      <span className="text-slate-500 font-medium">No detectado</span>
                    )}
                  </div>
                )}

                {result.detalles.dmarc !== undefined && (
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400">Política DMARC</span>
                    {result.detalles.dmarc ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> Activa
                      </span>
                    ) : (
                      <span className="text-slate-500 font-medium">No detectada</span>
                    )}
                  </div>
                )}
              </div>

              {/* Diagnóstico extendido */}
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Diagnóstico Completo
                </span>
                <p className="text-slate-300 leading-relaxed text-xs">{result.observacion}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
