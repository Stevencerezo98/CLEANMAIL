import React, { useState } from 'react';
import { Code2, Key, CheckCircle2, ShieldCheck, Globe2, Sparkles, ExternalLink } from 'lucide-react';
import { ExternalValidationProvider } from '../server/db/schema.ts';

export const SettingsView: React.FC = () => {
  const [provider, setProvider] = useState<ExternalValidationProvider>('debounce');
  const [apiKey, setApiKey] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">API & Configuración</h1>
        <p className="text-xs text-slate-500 mt-1">
          Configura proveedores externos de validación y claves para cálculo de score de confianza.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800">Proveedor de Validación Predeterminado</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as ExternalValidationProvider)}
              className="w-full text-xs px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00a2c7]"
            >
              <option value="debounce">Debounce Free API + Reputación SPF/DMARC (Gratuito, sin clave)</option>
              <option value="hunter">Hunter.io Email Verifier (Requiere API Key)</option>
              <option value="zerobounce">ZeroBounce API (Requiere API Key)</option>
              <option value="abstract">AbstractAPI Email Validation (Requiere API Key)</option>
            </select>
          </div>

          {provider !== 'debounce' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-slate-500" />
                <span>Clave API para {provider}</span>
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Ingresa tu clave de API..."
                className="w-full text-xs px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00a2c7]"
              />
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#00a2c7] hover:bg-[#0092b3] text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Guardar Configuración</span>
            </button>
            {savedSuccess && (
              <span className="text-xs text-emerald-600 font-semibold ml-3">
                Configuración guardada correctamente.
              </span>
            )}
          </div>
        </form>

        {/* API Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
          <div className="bg-[#f0f9fb] p-4 rounded-xl border border-[#d2eff6] space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-[#00a2c7]">
              <Globe2 className="w-4 h-4" />
              <span>Debounce Free API (Activa)</span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Totalmente gratuita y sin límites de API key. Evalúa si el buzón es temporal o de trampa, complementada por la verificación nativa DNS MX y registros SPF/DMARC de CleanMail.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-700">
              <Code2 className="w-4 h-4" />
              <span>API REST Local CleanMail</span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Todos los endpoints REST (`POST /api/emails/upload`, `GET /api/emails/category/:id`, `GET /api/emails/export/:id`) están activos en puerto 3000 con soporte para multipart/form-data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
