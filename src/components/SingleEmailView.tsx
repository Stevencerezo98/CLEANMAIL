import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  Trash2,
} from 'lucide-react';

interface SingleRequestItem {
  id: string;
  email: string;
  original_email: string;
  estado: 'VALIDO' | 'GENERICO_ROL' | 'INVALIDO';
  tipo: 'Personal' | 'Corporativo' | 'De_Rol';
  dominio: string;
  corregido: boolean;
  mx_valido: boolean;
  score_confianza: number;
  observacion: string;
  fuente_verificacion: string;
  detalles: {
    sintaxis: boolean;
    error_sintaxis?: string;
    desechable: boolean;
    es_rol: boolean;
    mx: boolean;
    mx_detalle?: string;
    spf?: boolean;
    dmarc?: boolean;
    score?: number;
    provider?: string;
    reasonCode?: string;
    isCatchAll?: boolean;
    mailboxConfirmed?: boolean;
    providerRulesPass?: boolean;
    providerReason?: string;
    suspiciousPattern?: boolean;
    patternReason?: string;
  };
  timestamp: string;
}

export const SingleEmailView: React.FC = () => {
  const [emailInput, setEmailInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [requestsHistory, setRequestsHistory] = useState<SingleRequestItem[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = emailInput.trim();
    if (!trimmed) return;

    setLoading(true);
    setErrorMsg('');

    try {
      const response = await fetch('/api/emails/validate-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, provider: 'debounce' }),
      });

      const res = await response.json();
      if (!response.ok || !res.success) {
        throw new Error(res.message || 'Error al validar el correo.');
      }

      const item: SingleRequestItem = {
        id: 'req_' + Date.now(),
        ...res.data,
        timestamp: new Date().toLocaleTimeString(),
      };

      setRequestsHistory((prev) => [item, ...prev]);
      setEmailInput('');
    } catch (err) {
      setErrorMsg((err as Error).message || 'Error de red al consultar el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    setRequestsHistory([]);
  };

  const getStatusBadge = (item: SingleRequestItem) => {
    if (item.estado === 'INVALIDO') {
      return (
        <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
          Undeliverable
        </span>
      );
    }
    if (item.estado === 'GENERICO_ROL') {
      return (
        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
          Risky
        </span>
      );
    }
    return (
      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
        Deliverable
      </span>
    );
  };

  const getReasonBadge = (item: SingleRequestItem) => {
    // 1. Inválidos / Undeliverable
    if (!item.detalles.sintaxis) {
      return (
        <span className="text-[11px] font-extrabold uppercase tracking-wide bg-rose-100 text-rose-700 px-2 py-0.5 rounded">
          INVALID SYNTAX
        </span>
      );
    }
    if (item.detalles.desechable) {
      return (
        <span className="text-[11px] font-extrabold uppercase tracking-wide bg-rose-100 text-rose-700 px-2 py-0.5 rounded">
          DISPOSABLE EMAIL
        </span>
      );
    }
    if (!item.detalles.mx) {
      return (
        <span className="text-[11px] font-extrabold uppercase tracking-wide bg-rose-100 text-rose-700 px-2 py-0.5 rounded">
          NO MX SERVER
        </span>
      );
    }
    if (item.detalles.providerRulesPass === false) {
      return (
        <span className="text-[11px] font-extrabold uppercase tracking-wide bg-rose-100 text-rose-700 px-2 py-0.5 rounded">
          PROVIDER RULE REJECTED
        </span>
      );
    }
    if (item.detalles.suspiciousPattern) {
      return (
        <span className="text-[11px] font-extrabold uppercase tracking-wide bg-rose-100 text-rose-700 px-2 py-0.5 rounded">
          SUSPICIOUS / TEST PATTERN
        </span>
      );
    }
    if (item.estado === 'INVALIDO') {
      return (
        <span className="text-[11px] font-extrabold uppercase tracking-wide bg-rose-100 text-rose-700 px-2 py-0.5 rounded">
          UNDELIVERABLE
        </span>
      );
    }

    // 2. Riesgosos / Risky
    if (item.detalles.es_rol) {
      return (
        <span className="text-[11px] font-extrabold uppercase tracking-wide bg-[#ffe7db] text-[#e05e26] px-2 py-0.5 rounded">
          ROLE / GENERIC ACCOUNT
        </span>
      );
    }
    if (item.detalles.isCatchAll) {
      return (
        <span className="text-[11px] font-extrabold uppercase tracking-wide bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
          CATCH-ALL SERVER
        </span>
      );
    }
    if (item.detalles.reasonCode === 'UNVERIFIED_MAILBOX' || item.score_confianza < 75) {
      return (
        <span className="text-[11px] font-extrabold uppercase tracking-wide bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
          UNVERIFIED MAILBOX (RISK)
        </span>
      );
    }

    // 3. Válidos / Deliverable
    if (item.detalles.mailboxConfirmed) {
      return (
        <span className="text-[11px] font-extrabold uppercase tracking-wide bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
          ACCEPTED (PROFILE CONFIRMED)
        </span>
      );
    }
    return (
      <span className="text-[11px] font-extrabold uppercase tracking-wide bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
        ACCEPTED EMAIL
      </span>
    );
  };

  const getExplanation = (item: SingleRequestItem) => {
    if (item.detalles.providerRulesPass === false) {
      return `Rechazado por regla del proveedor: ${item.detalles.providerReason || 'Formato de cuenta no permitido.'} Este buzón no puede existir.`;
    }
    if (item.detalles.suspiciousPattern) {
      return `Patrón sospechoso o cuenta no real: ${item.detalles.patternReason || 'Secuencia de teclado o prueba detectada.'} Alto riesgo de rebote inmediato.`;
    }
    if (item.detalles.desechable) {
      return 'El dominio proviene de un servicio de correo temporal o desechable bloqueado. Los mensajes enviados aquí serán destruidos o rebotados.';
    }
    if (!item.detalles.mx) {
      return `El dominio "${item.dominio}" no tiene servidores MX activos o no existe en DNS. No se puede entregar ningún correo.`;
    }
    if (!item.detalles.sintaxis) {
      return `Sintaxis RFC inválida: ${item.detalles.error_sintaxis || 'Estructura de correo no admitida.'}`;
    }
    if (item.detalles.es_rol) {
      return 'La dirección pertenece a una cuenta de rol o departamental (info, ventas, soporte, admin). Puede tener menor tasa de apertura o llegar a bandejas compartidas.';
    }
    if (item.detalles.isCatchAll) {
      return 'El servidor de correo está en modo "Catch-All" (acepta cualquier dirección entrante sin validar si el buzón individual existe). Conlleva riesgo medio de rebote.';
    }
    if (item.detalles.reasonCode === 'UNVERIFIED_MAILBOX' || item.score_confianza < 75) {
      return `Los servidores MX de ${item.dominio} están activos y autenticados (SPF/DMARC ok), pero este buzón específico no cuenta con perfil público verificado. Si la dirección fue inventada o adivinada, existe riesgo de rebote.`;
    }
    return 'Puedes enviar correos a esta dirección con total seguridad. Confirmamos que el dominio, los servidores de correo y la autenticación técnica están activos y entregables.';
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Verify single email
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Comprueba la entregabilidad, servidor MX, autenticación SPF/DMARC, reglas de proveedor y score de confianza en tiempo real.
        </p>
      </div>

      {/* Input Form Box (Soft Peach Container like Bouncer) */}
      <form onSubmit={handleVerify}>
        <div className="bg-[#fef4ea] border border-[#fce3ce] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-3 shadow-xs">
          <div className="relative w-full max-w-lg">
            <input
              type="text"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="Email (ej. contacto@empresa.com, juan@gmail.com)"
              required
              className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00a2c7] focus:border-transparent shadow-xs font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !emailInput.trim()}
            className={`w-full sm:w-auto px-7 py-3 rounded-xl font-bold text-sm transition shadow-xs cursor-pointer ${
              emailInput.trim()
                ? 'bg-[#00a2c7] hover:bg-[#0092b3] text-white'
                : 'bg-[#d8d3cf] text-slate-600 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Verifying...
              </span>
            ) : (
              'Verify'
            )}
          </button>
        </div>
        {errorMsg && <p className="text-xs text-rose-500 mt-2 font-medium">{errorMsg}</p>}
      </form>

      {/* Requests Section */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h2 className="text-2xl font-bold text-slate-900">Requests</h2>
          {requestsHistory.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="px-3 py-1 rounded-lg border border-[#00a2c7] text-[#00a2c7] hover:bg-[#00a2c7]/10 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>

        {requestsHistory.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 p-8">
            <Search className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">Sin consultas recientes</p>
            <p className="text-xs text-slate-400 mt-1">
              Ingresa un correo en el campo superior para analizar su entregabilidad exacta.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {requestsHistory.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4 transition"
              >
                {/* Header: Email and Status */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {item.estado === 'VALIDO' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : item.estado === 'GENERICO_ROL' ? (
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-500" />
                    )}
                    <span className="font-mono text-base font-bold text-slate-900">
                      {item.email}
                    </span>
                    {item.corregido && (
                      <span className="text-[11px] bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-full font-sans">
                        Typo Corregido
                      </span>
                    )}
                  </div>

                  <span className="text-xs text-slate-400 font-mono">{item.timestamp}</span>
                </div>

                {/* Status & Reason Rows (Exact Bouncer Layout) */}
                <div className="space-y-1.5 text-xs text-slate-700">
                  <div className="flex items-center gap-4">
                    <span className="w-16 font-semibold text-slate-500">Status</span>
                    {getStatusBadge(item)}
                    <span className="font-mono text-slate-400 text-[11px] ml-2">
                      Score: <strong className="text-slate-800">{item.score_confianza}/100</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="w-16 font-semibold text-slate-500">Reason</span>
                    {getReasonBadge(item)}
                  </div>
                </div>

                {/* Explanation text paragraph */}
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                  {getExplanation(item)}
                </p>

                {/* 3 Detail Cards (Domain, Account, Provider) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {/* Domain Card */}
                  <div className="bg-[#f8fafc] border border-slate-200/80 rounded-xl p-3.5 space-y-1.5 text-xs">
                    <h4 className="font-bold text-slate-900 text-xs mb-2">Domain</h4>
                    <div className="flex justify-between text-slate-600">
                      <span className="text-slate-400">name:</span>
                      <span className="font-mono font-medium text-slate-800">{item.dominio}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span className="text-slate-400">accept all:</span>
                      <span className="font-medium text-slate-800">
                        {item.detalles.isCatchAll ? 'yes (catch-all)' : 'no'}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span className="text-slate-400">disposable:</span>
                      <span className="font-medium text-slate-800">
                        {item.detalles.desechable ? 'yes' : 'no'}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span className="text-slate-400">free:</span>
                      <span className="font-medium text-slate-800">
                        {item.tipo === 'Personal' ? 'yes' : 'no'}
                      </span>
                    </div>
                  </div>

                  {/* Account Card */}
                  <div className="bg-[#f8fafc] border border-slate-200/80 rounded-xl p-3.5 space-y-1.5 text-xs">
                    <h4 className="font-bold text-slate-900 text-xs mb-2">Account</h4>
                    <div className="flex justify-between text-slate-600">
                      <span className="text-slate-400">role:</span>
                      <span className="font-medium text-slate-800">
                        {item.detalles.es_rol ? 'yes' : 'no'}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span className="text-slate-400">pattern:</span>
                      <span className={`font-medium ${item.detalles.suspiciousPattern ? 'text-rose-600 font-bold' : 'text-slate-800'}`}>
                        {item.detalles.suspiciousPattern ? 'suspicious' : 'clean'}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span className="text-slate-400">mailbox:</span>
                      <span className={`font-medium ${item.detalles.mailboxConfirmed ? 'text-emerald-600 font-bold' : item.detalles.providerRulesPass === false ? 'text-rose-600 font-bold' : 'text-slate-800'}`}>
                        {item.detalles.mailboxConfirmed ? 'confirmed' : item.detalles.providerRulesPass === false ? 'rejected' : item.estado === 'INVALIDO' ? 'invalid' : 'unverified'}
                      </span>
                    </div>
                  </div>

                  {/* Provider Card */}
                  <div className="bg-[#f8fafc] border border-slate-200/80 rounded-xl p-3.5 space-y-1.5 text-xs">
                    <h4 className="font-bold text-slate-900 text-xs mb-2">Provider</h4>
                    <div className="flex justify-between text-slate-600">
                      <span className="text-slate-400">domain:</span>
                      <span className="font-mono font-medium text-slate-800 truncate max-w-[120px]">
                        {item.dominio}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span className="text-slate-400">mx server:</span>
                      <span className={`font-medium ${item.detalles.mx ? 'text-slate-800' : 'text-rose-600 font-bold'}`}>
                        {item.detalles.mx ? 'active' : 'none'}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span className="text-slate-400">auth:</span>
                      <span className="font-medium text-slate-800">
                        {(item.detalles.spf ? 'SPF✓ ' : '') + (item.detalles.dmarc ? 'DMARC✓' : '') || 'none'}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span className="text-slate-400">source:</span>
                      <span className="font-medium text-slate-800 truncate max-w-[110px]" title={item.fuente_verificacion}>
                        {item.fuente_verificacion}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
