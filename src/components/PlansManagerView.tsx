import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Check,
  Star,
  DollarSign,
  Shield,
  Layers,
  ExternalLink,
} from 'lucide-react';
import { LandingPlan, UserSession } from '../server/db/schema.ts';
import { ConfirmModal } from './ConfirmModal.tsx';

interface PlansManagerViewProps {
  session: UserSession;
  onPreviewLanding: () => void;
}

export const PlansManagerView: React.FC<PlansManagerViewProps> = ({
  session,
  onPreviewLanding,
}) => {
  const [plans, setPlans] = useState<LandingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Editing state
  const [editingPlan, setEditingPlan] = useState<LandingPlan | null>(null);
  const [isNewPlanModal, setIsNewPlanModal] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState(49);
  const [formCurrency, setFormCurrency] = useState('USD');
  const [formPeriod, setFormPeriod] = useState('pago único');
  const [formCredits, setFormCredits] = useState(50000);
  const [formBadge, setFormBadge] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formFeaturesText, setFormFeaturesText] = useState('');
  const [formPopular, setFormPopular] = useState(false);
  const [formActive, setFormActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Delete confirm modal state
  const [planToDelete, setPlanToDelete] = useState<LandingPlan | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset confirm modal
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/plans', {
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setPlans(data.data);
      } else {
        setErrorMessage(data.message || 'Error al obtener los planes.');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Error de red al consultar los planes de depuración.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [session.token]);

  const openEditModal = (plan: LandingPlan) => {
    setEditingPlan(plan);
    setIsNewPlanModal(false);
    setFormName(plan.name);
    setFormPrice(plan.price);
    setFormCurrency(plan.currency || 'USD');
    setFormPeriod(plan.period || 'pago único');
    setFormCredits(plan.credits);
    setFormBadge(plan.badge || '');
    setFormDescription(plan.description || '');
    setFormFeaturesText((plan.features || []).join('\n'));
    setFormPopular(Boolean(plan.popular));
    setFormActive(plan.active !== undefined ? plan.active : true);
    setErrorMessage('');
  };

  const openNewPlanModal = () => {
    setEditingPlan(null);
    setIsNewPlanModal(true);
    setFormName('');
    setFormPrice(29);
    setFormCurrency('USD');
    setFormPeriod('pago único');
    setFormCredits(25000);
    setFormBadge('Nuevo Plan');
    setFormDescription('Depuración y verificación técnica para medianas empresas.');
    setFormFeaturesText('25,000 Verificaciones\nInspección DNS MX en vivo\nFiltro de correos temporales\nExportación CSV');
    setFormPopular(false);
    setFormActive(true);
    setErrorMessage('');
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || formPrice < 0 || formCredits <= 0) {
      setErrorMessage('Por favor completa todos los campos requeridos con valores válidos.');
      return;
    }

    const featuresArray = formFeaturesText
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean);

    setIsSaving(true);
    setErrorMessage('');

    try {
      if (isNewPlanModal) {
        // Create new plan
        const res = await fetch('/api/admin/plans', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.token}`,
          },
          body: JSON.stringify({
            name: formName.trim(),
            price: Number(formPrice),
            currency: formCurrency.trim(),
            period: formPeriod.trim(),
            credits: Number(formCredits),
            badge: formBadge.trim() || undefined,
            description: formDescription.trim(),
            features: featuresArray,
            popular: formPopular,
            active: formActive,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Error al crear el plan.');
        }
        setSuccessMessage('¡Nuevo plan creado exitosamente!');
      } else if (editingPlan) {
        // Update existing plan
        const res = await fetch(`/api/admin/plans/${editingPlan.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.token}`,
          },
          body: JSON.stringify({
            name: formName.trim(),
            price: Number(formPrice),
            currency: formCurrency.trim(),
            period: formPeriod.trim(),
            credits: Number(formCredits),
            badge: formBadge.trim() || undefined,
            description: formDescription.trim(),
            features: featuresArray,
            popular: formPopular,
            active: formActive,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Error al actualizar el plan.');
        }
        setSuccessMessage('¡Plan actualizado correctamente! Los cambios ya son visibles en la Landing.');
      }

      setEditingPlan(null);
      setIsNewPlanModal(false);
      await fetchPlans();

      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setErrorMessage((err as Error).message || 'Error al guardar el plan.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePlan = async () => {
    if (!planToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/plans/${planToDelete.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al eliminar el plan.');
      }
      setSuccessMessage(`Plan "${planToDelete.name}" eliminado correctamente.`);
      setPlanToDelete(null);
      await fetchPlans();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setErrorMessage((err as Error).message || 'No se pudo eliminar el plan.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResetPlans = async () => {
    setIsResetting(true);
    try {
      const res = await fetch('/api/admin/plans/reset', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al reiniciar los planes.');
      }
      setSuccessMessage('Planes restablecidos a sus valores iniciales por defecto.');
      setIsResetConfirmOpen(false);
      await fetchPlans();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setErrorMessage((err as Error).message || 'No se pudieron reiniciar los planes.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-extrabold uppercase tracking-wider mb-1 border border-purple-200">
            <Shield className="w-3 h-3" />
            <span>Exclusivo Administrador ({session.name})</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Gestión de Planes de Depuración
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Controla las tarjetas de planes que se muestran a los clientes en la Landing pública. Nadie más tiene acceso a esta sección.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onPreviewLanding}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            title="Ver cómo lucen las tarjetas para los visitantes"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#00a2c7]" />
            <span>Ver Landing Pública</span>
          </button>

          <button
            onClick={openNewPlanModal}
            className="px-4 py-2.5 rounded-xl bg-[#00a2c7] hover:bg-[#0092b3] text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Plan</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Plans List Table / Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#00a2c7]" />
            <span className="font-bold text-xs text-slate-800">
              Planes Registrados en el Sistema ({plans.length})
            </span>
          </div>

          <button
            onClick={() => setIsResetConfirmOpen(true)}
            className="text-[11px] text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1 cursor-pointer"
            title="Restaurar a los 4 planes iniciales"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Restaurar Predeterminados</span>
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <div className="w-6 h-6 border-2 border-[#00a2c7] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <span>Cargando configuración de planes...</span>
          </div>
        ) : plans.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <p>No hay planes configurados.</p>
            <button
              onClick={() => setIsResetConfirmOpen(true)}
              className="mt-3 px-3 py-1.5 rounded-lg bg-[#00a2c7] text-white font-bold"
            >
              Cargar planes predeterminados
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition"
              >
                {/* Plan details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-slate-900 text-sm">{plan.name}</h3>

                    {plan.badge && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-800 text-white uppercase tracking-wider">
                        {plan.badge}
                      </span>
                    )}

                    {plan.popular && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#00a2c7] text-white flex items-center gap-1">
                        <Star className="w-2.5 h-2.5 fill-white" /> Más Popular
                      </span>
                    )}

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        plan.active
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      {plan.active ? '● Activo en Landing' : '○ Oculto'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-1 max-w-xl">{plan.description}</p>

                  <div className="flex flex-wrap items-center gap-4 mt-3 text-xs">
                    <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded-md">
                      {plan.currency} ${plan.price} {plan.period ? `(${plan.period})` : ''}
                    </span>

                    <span className="font-mono font-bold text-[#00a2c7] bg-[#00a2c7]/10 px-2 py-1 rounded-md">
                      {plan.credits.toLocaleString()} verificaciones
                    </span>

                    <span className="text-slate-400 text-[11px]">
                      {plan.features.length} características incluidas
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <button
                    onClick={() => openEditModal(plan)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-[#00a2c7]" />
                    <span>Editar Plan</span>
                  </button>

                  <button
                    onClick={() => setPlanToDelete(plan)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    title="Eliminar este plan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit / Create Modal */}
      {(Boolean(editingPlan) || isNewPlanModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-xl shadow-2xl p-6 my-8 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#00a2c7]/10 text-[#00a2c7] flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    {isNewPlanModal ? 'Crear Nuevo Plan de Depuración' : `Editar: ${formName || 'Plan'}`}
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Este plan se reflejará en vivo en las tarjetas de la Landing pública.
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  setEditingPlan(null);
                  setIsNewPlanModal(false);
                }}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold px-2 py-1 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Nombre */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nombre del Plan *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ej. Básico / Starter, Pro Growth..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00a2c7]"
                  />
                </div>

                {/* Badge opcional */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Etiqueta / Badge (Opcional)</label>
                  <input
                    type="text"
                    value={formBadge}
                    onChange={(e) => setFormBadge(e.target.value)}
                    placeholder="Ej. Más Popular, Para Comenzar..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00a2c7]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* Precio */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Precio *</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#00a2c7]"
                  />
                </div>

                {/* Moneda */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Moneda</label>
                  <input
                    type="text"
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value)}
                    placeholder="USD, EUR, etc."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-[#00a2c7]"
                  />
                </div>

                {/* Período */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Período / Modalidad</label>
                  <input
                    type="text"
                    value={formPeriod}
                    onChange={(e) => setFormPeriod(e.target.value)}
                    placeholder="pago único, /mes, /año"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00a2c7]"
                  />
                </div>
              </div>

              {/* Créditos de verificación */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Créditos de Verificación (Número de Correos) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="500"
                  required
                  value={formCredits}
                  onChange={(e) => setFormCredits(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#00a2c7]"
                />
              </div>

              {/* Descripción breve */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Descripción Breve</label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Ideal para agencias y campañas masivas..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00a2c7]"
                />
              </div>

              {/* Características (una por línea) */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Características de la Tarjeta (un punto por línea)
                </label>
                <textarea
                  rows={4}
                  value={formFeaturesText}
                  onChange={(e) => setFormFeaturesText(e.target.value)}
                  placeholder="Validación estricta de sintaxis RFC&#10;Comprobación DNS MX en vivo&#10;Exportación CSV ilimitada"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00a2c7] font-mono text-xs"
                ></textarea>
              </div>

              {/* Toggles: Destacado / Activo */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2.5 rounded-xl border border-slate-200 select-none">
                  <input
                    type="checkbox"
                    checked={formPopular}
                    onChange={(e) => setFormPopular(e.target.checked)}
                    className="w-4 h-4 rounded text-[#00a2c7] focus:ring-[#00a2c7]"
                  />
                  <span className="font-semibold text-slate-700">Tarjeta Destacada (Más Popular)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2.5 rounded-xl border border-slate-200 select-none">
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    className="w-4 h-4 rounded text-[#00a2c7] focus:ring-[#00a2c7]"
                  />
                  <span className="font-semibold text-slate-700">Activo (Visible en Landing)</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setEditingPlan(null);
                    setIsNewPlanModal(false);
                  }}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-[#00a2c7] hover:bg-[#0092b3] text-white font-bold transition flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSaving && <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin"></span>}
                  <span>{isNewPlanModal ? 'Crear Plan' : 'Guardar Cambios'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Plan Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(planToDelete)}
        title="Eliminar Plan de Depuración"
        message={`¿Estás seguro de eliminar el plan "${planToDelete?.name}"? Dejará de mostrarse en la Landing pública.`}
        confirmLabel="Eliminar Plan"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleDeletePlan}
        onCancel={() => {
          if (!isDeleting) setPlanToDelete(null);
        }}
      />

      {/* Reset Plans Confirm Modal */}
      <ConfirmModal
        isOpen={isResetConfirmOpen}
        title="Restaurar Planes Predeterminados"
        message="¿Deseas restaurar el catálogo a los 4 planes por defecto (Starter, Pro, Enterprise, Ilimitado)? Se sobrescribirán los cambios personalizados."
        confirmLabel="Restaurar Valores"
        isDestructive={true}
        isLoading={isResetting}
        onConfirm={handleResetPlans}
        onCancel={() => {
          if (!isResetting) setIsResetConfirmOpen(false);
        }}
      />
    </div>
  );
};
