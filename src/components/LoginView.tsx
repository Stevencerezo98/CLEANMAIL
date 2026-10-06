import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, ShieldCheck, MailCheck, AlertCircle, ArrowLeft } from 'lucide-react';
import { UserSession } from '../server/db/schema.ts';

interface LoginViewProps {
  onLoginSuccess: (session: UserSession) => void;
  onGoToLanding?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, onGoToLanding }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMessage('Por favor ingrese su usuario y contraseña.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Credenciales incorrectas.');
      }

      // Guardar token en localStorage
      localStorage.setItem('cleanmail_session', JSON.stringify(data.data));
      onLoginSuccess(data.data);
    } catch (err) {
      setErrorMessage((err as Error).message || 'No se pudo iniciar sesión.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-[#005f75] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-fade-in">
        {/* Brand header */}
        <div className="bg-[#00a2c7] px-8 pt-8 pb-7 text-center relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
          <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-black/10 rounded-full blur-lg pointer-events-none"></div>

          <div className="w-14 h-14 bg-white/15 backdrop-blur-xs rounded-2xl mx-auto flex items-center justify-center text-white mb-3 shadow-inner">
            <MailCheck className="w-8 h-8" />
          </div>

          <h1 className="text-3xl font-black tracking-tight text-white font-serif italic">
            CleanMail
          </h1>
          <p className="text-cyan-100 text-xs mt-1 font-medium">
            Depuración Inteligente de Correos & Auditoría MX
          </p>
        </div>

        {/* Form Container */}
        <div className="p-8">
          {onGoToLanding && (
            <button
              type="button"
              onClick={onGoToLanding}
              className="mb-4 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#00a2c7] font-semibold transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a la Landing de Planes</span>
            </button>
          )}

          <div className="mb-6">
            <h2 className="text-xl font-extrabold text-slate-800">Iniciar Sesión</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Accede con tus credenciales de usuario autorizado.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Usuario</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ingresa tu usuario..."
                  required
                  autoFocus
                  className="w-full text-xs pl-10 pr-3 py-3 rounded-xl border border-slate-300 bg-slate-50/50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00a2c7] focus:bg-white transition"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña..."
                  required
                  className="w-full text-xs pl-10 pr-10 py-3 rounded-xl border border-slate-300 bg-slate-50/50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00a2c7] focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-[#00a2c7] hover:bg-[#0092b3] disabled:opacity-50 text-white text-xs font-bold transition shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                    <span>Validando acceso...</span>
                  </span>
                ) : (
                  <span>Ingresar a CleanMail</span>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sistema Seguro con Control de Acceso Basado en Roles (RBAC)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
