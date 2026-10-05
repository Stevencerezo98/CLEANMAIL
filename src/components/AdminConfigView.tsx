import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CreditCard,
  Zap,
  Sliders,
  CheckCircle2,
  Users,
  AlertTriangle,
  Save,
  PlusCircle,
  Sparkles,
} from 'lucide-react';
import { SystemConfig, UserSession } from '../server/db/schema.ts';

interface AdminConfigViewProps {
  session: UserSession;
}

export const AdminConfigView: React.FC<AdminConfigViewProps> = ({ session }) => {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Form states
  const [planName, setPlanName] = useState('');
  const [planType, setPlanType] = useState<'starter' | 'pro' | 'enterprise' | 'unlimited'>('enterprise');
  const [creditosDisponibles, setCreditosDisponibles] = useState<number>(100000);
  const [limiteMensual, setLimiteMensual] = useState<number>(250000);
  const [autoCleanDuplicates, setAutoCleanDuplicates] = useState(true);
  const [strictMxChecking, setStrictMxChecking] = useState(true);
  const [alertaCreditosBajos, setAlertaCreditosBajos] = useState(true);
  const [umbralAlerta, setUmbralAlerta] = useState<number>(5000);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/config', {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setConfig(data.data);
        setPlanName(data.data.planName || '');
        setPlanType(data.data.planType || 'enterprise');
        setCreditosDisponibles(data.data.creditosDisponibles || 100000);
        setLimiteMensual(data.data.limiteMensual || 250000);
        setAutoCleanDuplicates(Boolean(data.data.autoCleanDuplicates));
        setStrictMxChecking(Boolean(data.data.strictMxChecking));
        setAlertaCreditosBajos(Boolean(data.data.alertaCreditosBajos));
        setUmbralAlerta(data.data.umbralAlerta || 5000);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Error al cargar la configuración administrativa.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const res = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          planName,
          planType,
          creditosDisponibles,
          limiteMensual,
          autoCleanDuplicates,
          strictMxChecking,
          alertaCreditosBajos,
          umbralAlerta,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al guardar la configuración.');
      }

      setConfig(data.data);
      setSuccessMessage('¡Configuración de Plan y Créditos actualizada con éxito!');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setErrorMessage((err as Error).message || 'Error al actualizar.');
    } finally {
      setSaving(false);
    }
  };

  const addCreditsPreset = (amount: number) => {
    setCreditosDisponibles((prev) => prev + amount);
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="flex items-center justify-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#00a2c7] animate-ping"></span>
          <span className="text-xs font-semibold">Cargando panel de administración...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Configuración & Plan del Sistema
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-black uppercase tracking-wider border border-purple-200">
              Admin Exclusivo
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestión de plan activo, asignación de créditos disponibles, límites mensuales y matriz de roles.
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-fade-in font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-fade-in font-semibold">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Admin Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Plan & Credits Overview Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
            <CreditCard className="w-5 h-5 text-[#00a2c7]" />
            <h2 className="text-base font-bold text-slate-900">Plan y Asignación de Créditos</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Plan Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Nombre Personalizado del Plan</label>
              <input
                type="text"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="ej: Plan Corporativo Enterprise 2026..."
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00a2c7]"
              />
            </div>

            {/* Plan Tier Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Tipo de Licencia / Plan</label>
              <select
                value={planType}
                onChange={(e) => setPlanType(e.target.value as any)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#00a2c7] font-semibold"
              >
                <option value="starter">Starter (10,000 créditos)</option>
                <option value="pro">Profesional (50,000 créditos)</option>
                <option value="enterprise">Enterprise (Ilimitadas categorías + 100,000+ créditos)</option>
                <option value="unlimited">Ilimitado Total (Sin restricciones de créditos)</option>
              </select>
            </div>
          </div>

          {/* Credits Control */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-50 to-[#f0f9fb] border border-[#d2eff6] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  Créditos Disponibles en Cuenta
                </span>
                <span className="text-[11px] text-slate-500">
                  {config?.creditosUsados || 0} correos procesados y guardados en la base de datos actualmente.
                </span>
              </div>

              {/* Quick Add Presets */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500 font-semibold mr-1">Recargar:</span>
                <button
                  type="button"
                  onClick={() => addCreditsPreset(10000)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:border-[#00a2c7] text-slate-700 text-[11px] font-bold transition cursor-pointer"
                >
                  +10K
                </button>
                <button
                  type="button"
                  onClick={() => addCreditsPreset(50000)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:border-[#00a2c7] text-slate-700 text-[11px] font-bold transition cursor-pointer"
                >
                  +50K
                </button>
                <button
                  type="button"
                  onClick={() => addCreditsPreset(100000)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:border-[#00a2c7] text-slate-700 text-[11px] font-bold transition cursor-pointer"
                >
                  +100K
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Saldo de Créditos Disponibles
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={creditosDisponibles}
                  onChange={(e) => setCreditosDisponibles(parseInt(e.target.value, 10) || 0)}
                  className="w-full text-base font-extrabold font-mono px-3.5 py-2.5 rounded-xl border border-slate-300 text-[#00a2c7] bg-white focus:outline-none focus:ring-2 focus:ring-[#00a2c7]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Límite Mensual de Verificación
                </label>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  value={limiteMensual}
                  onChange={(e) => setLimiteMensual(parseInt(e.target.value, 10) || 0)}
                  className="w-full text-base font-extrabold font-mono px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#00a2c7]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* System Policies & Automation */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
            <Sliders className="w-5 h-5 text-[#00a2c7]" />
            <h2 className="text-base font-bold text-slate-900">Políticas de Depuración del Sistema</h2>
          </div>

          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoCleanDuplicates}
                onChange={(e) => setAutoCleanDuplicates(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-[#00a2c7] focus:ring-[#00a2c7]"
              />
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  Deduplicación Automática en Carga Masiva
                </span>
                <span className="text-[11px] text-slate-500">
                  Omite correos idénticos previamente cargados en la misma categoría para no duplicar contactos.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={strictMxChecking}
                onChange={(e) => setStrictMxChecking(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-[#00a2c7] focus:ring-[#00a2c7]"
              />
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  Auditoría Estricta de Servidores MX (DNS Global)
                </span>
                <span className="text-[11px] text-slate-500">
                  Marca inmediatamente como inválido cualquier dominio sin servidores de recepción de correo activos.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={alertaCreditosBajos}
                onChange={(e) => setAlertaCreditosBajos(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-[#00a2c7] focus:ring-[#00a2c7]"
              />
              <div className="flex-1">
                <span className="text-xs font-bold text-slate-800 block">
                  Alerta Temprana de Créditos Bajos
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-slate-500">Avisar cuando queden menos de:</span>
                  <input
                    type="number"
                    value={umbralAlerta}
                    onChange={(e) => setUmbralAlerta(parseInt(e.target.value, 10) || 1000)}
                    className="w-24 text-xs font-mono px-2 py-0.5 rounded border border-slate-300"
                  />
                  <span className="text-[11px] text-slate-500">créditos</span>
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Roles and Permissions Matrix */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
            <Users className="w-5 h-5 text-[#00a2c7]" />
            <h2 className="text-base font-bold text-slate-900">
              Matriz de Permisos por Rol (RBAC)
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">Funcionalidad</th>
                  <th className="px-4 py-2.5 text-center">Administrador</th>
                  <th className="px-4 py-2.5 text-center">Digitalizador</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-4 py-2.5 font-medium text-slate-800">
                    Subir y procesar archivos masivos (.csv, .xlsx, .txt)
                  </td>
                  <td className="px-4 py-2.5 text-center text-emerald-600 font-bold">✓ Permitido</td>
                  <td className="px-4 py-2.5 text-center text-emerald-600 font-bold">✓ Permitido</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium text-slate-800">
                    Exportar listas limpias a formato CSV
                  </td>
                  <td className="px-4 py-2.5 text-center text-emerald-600 font-bold">✓ Permitido</td>
                  <td className="px-4 py-2.5 text-center text-emerald-600 font-bold">✓ Permitido</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium text-slate-800">
                    Editar y corregir correos individuales en la tabla
                  </td>
                  <td className="px-4 py-2.5 text-center text-emerald-600 font-bold">✓ Permitido</td>
                  <td className="px-4 py-2.5 text-center text-emerald-600 font-bold">✓ Permitido</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium text-slate-800">
                    Borrado masivo y purga de correos inválidos
                  </td>
                  <td className="px-4 py-2.5 text-center text-emerald-600 font-bold">✓ Permitido</td>
                  <td className="px-4 py-2.5 text-center text-emerald-600 font-bold">✓ Permitido</td>
                </tr>
                <tr className="bg-purple-50/40">
                  <td className="px-4 py-2.5 font-bold text-purple-950">
                    Modificar Plan del Sistema y Asignación de Créditos
                  </td>
                  <td className="px-4 py-2.5 text-center text-purple-700 font-black">✓ Exclusivo</td>
                  <td className="px-4 py-2.5 text-center text-rose-500 font-bold">✕ Denegado</td>
                </tr>
                <tr className="bg-purple-50/40">
                  <td className="px-4 py-2.5 font-bold text-purple-950">
                    Configuración de políticas del motor de depuración
                  </td>
                  <td className="px-4 py-2.5 text-center text-purple-700 font-black">✓ Exclusivo</td>
                  <td className="px-4 py-2.5 text-center text-rose-500 font-bold">✕ Denegado</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-[#00a2c7] hover:bg-[#0092b3] disabled:opacity-50 text-white text-xs font-bold transition shadow-md cursor-pointer flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Guardando...' : 'Guardar Cambios de Configuración'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
