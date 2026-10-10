import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Zap,
  CheckCircle2,
  X,
  CreditCard,
  Check,
  ShieldCheck,
  Star,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { LandingPlan, SystemConfig } from '../server/db/schema.ts';

interface UpgradePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: SystemConfig | null;
  onPlanUpgraded: (newConfig: SystemConfig) => void;
  message?: string;
}

export const UpgradePlanModal: React.FC<UpgradePlanModalProps> = ({
  isOpen,
  onClose,
  currentConfig,
  onPlanUpgraded,
  message,
}) => {
  const [plans, setPlans] = useState<LandingPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [upgradingPlanId, setUpgradingPlanId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const fetchPlans = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/plans');
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setPlans(data.data);
        }
      } catch (err) {
        console.error('Error cargando planes en modal:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectPlan = async (plan: LandingPlan) => {
    setUpgradingPlanId(plan.id);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/plans/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al actualizar el plan.');
      }

      setSuccessMessage(data.message || `¡Plan actualizado con éxito a ${plan.name}!`);
      if (data.data?.config) {
        onPlanUpgraded(data.data.config);
      }

      setTimeout(() => {
        onClose();
        setSuccessMessage('');
      }, 1600);
    } catch (err) {
      setErrorMessage((err as Error).message || 'Error de conexión.');
    } finally {
      setUpgradingPlanId(null);
    }
  };

  const availableCredits = currentConfig?.creditosDisponibles ?? 0;
  const currentPlanName = currentConfig?.planName || 'Plan Inicial';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00a2c7]/20 text-[#00a2c7] border border-[#00a2c7]/30 text-xs font-bold">
              <Zap className="w-3.5 h-3.5" />
              <span>Planes de Depuración CleanMail</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white">
              Actualizar Plan &amp; Créditos
            </h2>
            <p className="text-xs text-slate-300 max-w-xl">
              {message ||
                'Aumenta el cupo de depuración de tu cuenta para continuar procesando listas masivas y verificaciones en vivo.'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current status banner */}
        <div className="px-6 py-3 bg-amber-50 border-b border-amber-200/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            <span className="text-amber-900 font-semibold">
              Plan Actual: <strong>{currentPlanName}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-600">Créditos Disponibles:</span>
            <span className="font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-200/80 text-amber-900 text-xs">
              {availableCredits.toLocaleString()} créditos
            </span>
          </div>
        </div>

        {/* Alert / Feedback Messages */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Body Plans Grid */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <div className="w-8 h-8 border-3 border-[#00a2c7] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs font-semibold">Cargando opciones de planes...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {plans.map((plan) => {
                const isPopular = Boolean(plan.popular);
                const isUpgrading = upgradingPlanId === plan.id;

                return (
                  <div
                    key={plan.id}
                    className={`rounded-2xl p-5 border flex flex-col justify-between transition-all hover:shadow-lg ${
                      isPopular
                        ? 'border-[#00a2c7] bg-[#f0f9fb]/40 ring-2 ring-[#00a2c7]/20 shadow-md'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div>
                      {/* Badge / Popular */}
                      <div className="h-6 flex items-center justify-between mb-2">
                        {plan.badge && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                              isPopular
                                ? 'bg-[#00a2c7] text-white'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {plan.badge}
                          </span>
                        )}
                        {isPopular && (
                          <Star className="w-4 h-4 text-amber-500 fill-amber-500 ml-auto" />
                        )}
                      </div>

                      {/* Plan Name & Credits */}
                      <h3 className="font-extrabold text-slate-900 text-sm leading-snug">
                        {plan.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                        {plan.description}
                      </p>

                      {/* Pricing */}
                      <div className="my-3.5">
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-slate-900 font-mono">
                            ${plan.price}
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold">
                            {plan.currency}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            /{plan.period || 'único'}
                          </span>
                        </div>

                        {/* Credits pill */}
                        <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold font-mono">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>{plan.credits.toLocaleString()} depuraciones</span>
                        </div>
                      </div>

                      {/* Features */}
                      <div className="space-y-1.5 py-2.5 border-t border-slate-100 text-[11px] text-slate-600">
                        {plan.features.slice(0, 4).map((feat, i) => (
                          <div key={i} className="flex items-start gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <span className="line-clamp-2 leading-tight">{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* CTA Button */}
                    <div className="pt-4">
                      <button
                        onClick={() => handleSelectPlan(plan)}
                        disabled={isUpgrading}
                        className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs ${
                          isPopular
                            ? 'bg-[#00a2c7] hover:bg-[#0092b3] text-white'
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                        }`}
                      >
                        {isUpgrading ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                            <span>Actualizando...</span>
                          </>
                        ) : (
                          <>
                            <span>Contratar Plan</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Actualización instantánea. Créditos asignados de inmediato a tu cuenta.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
