import React, { useState, useEffect } from 'react';
import { X, Edit3, CheckCircle2, ShieldCheck, RefreshCw } from 'lucide-react';
import { Correo, EstadoEmail } from '../server/db/schema.ts';

interface EditEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  emailItem: Correo | null;
  onSave: (id: string, data: { email: string; estado: EstadoEmail; observacion: string; reVerify: boolean }) => Promise<void>;
}

export const EditEmailModal: React.FC<EditEmailModalProps> = ({
  isOpen,
  onClose,
  emailItem,
  onSave,
}) => {
  const [email, setEmail] = useState('');
  const [estado, setEstado] = useState<EstadoEmail>('VALIDO');
  const [observacion, setObservacion] = useState('');
  const [reVerify, setReVerify] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (emailItem) {
      setEmail(emailItem.email);
      setEstado(emailItem.estado);
      setObservacion(emailItem.observacion);
      setReVerify(false);
      setErrorMsg('');
    }
  }, [emailItem]);

  if (!isOpen || !emailItem) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSaving(true);
    setErrorMsg('');
    try {
      await onSave(emailItem.id, {
        email: email.trim(),
        estado,
        observacion: observacion.trim(),
        reVerify,
      });
      onClose();
    } catch (err) {
      setErrorMsg((err as Error).message || 'Error al actualizar el correo.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-lg shadow-2xl overflow-hidden p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#00a2c7]/10 text-[#00a2c7] flex items-center justify-center">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Editar Registro de Correo</h3>
              <p className="text-[11px] text-slate-400">ID: {emailItem.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Dirección de Correo</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (e.target.value !== emailItem.email) {
                  setReVerify(true);
                }
              }}
              required
              className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00a2c7]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Estado de Entregabilidad</label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value as EstadoEmail)}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#00a2c7]"
              >
                <option value="VALIDO">Deliverable (Válido)</option>
                <option value="GENERICO_ROL">Risky (Cuenta de Rol)</option>
                <option value="INVALIDO">Undeliverable (Inválido)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Score de Confianza</label>
              <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-700">
                {emailItem.score_confianza ?? 0}/100
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Diagnóstico / Observación</label>
            <textarea
              rows={2}
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00a2c7]"
            />
          </div>

          <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={reVerify}
              onChange={(e) => setReVerify(e.target.checked)}
              className="w-4 h-4 rounded text-[#00a2c7] focus:ring-[#00a2c7]"
            />
            <span className="text-xs font-semibold text-slate-700">
              Re-evaluar automáticamente con motor DNS MX y recalcular score al guardar
            </span>
          </label>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-[#00a2c7] hover:bg-[#0092b3] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
