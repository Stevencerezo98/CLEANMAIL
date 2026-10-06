import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  Check,
  ShieldCheck,
  Zap,
  ArrowRight,
  Sparkles,
  MailCheck,
  Server,
  Layers,
  HelpCircle,
  LogIn,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Globe,
  Star,
  Users,
} from 'lucide-react';
import { LandingPlan, UserSession } from '../server/db/schema.ts';

interface LandingViewProps {
  onGoToLogin: () => void;
  session: UserSession | null;
  onGoToDashboard: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onGoToLogin,
  session,
  onGoToDashboard,
}) => {
  const [plans, setPlans] = useState<LandingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [listSize, setListSize] = useState<number>(50000);

  // Fetch active plans from public endpoint /api/plans
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/plans');
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setPlans(data.data);
        } else {
          setPlans([]);
        }
      } catch (err) {
        console.error('Error cargando planes en landing:', err);
        setError('No se pudieron cargar los planes de depuración.');
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  return (
    <div className="min-h-screen bg-[#f3f6f9] text-slate-800 antialiased font-sans flex flex-col selection:bg-[#00a2c7] selection:text-white">
      {/* Top Banner if user is logged in */}
      {session && (
        <div className="bg-slate-900 text-white px-4 py-2 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>
              Sesión activa como <strong>{session.name}</strong> ({session.role})
            </span>
          </div>
          <button
            onClick={onGoToDashboard}
            className="px-3 py-1 bg-[#00a2c7] hover:bg-[#0092b3] text-white font-bold rounded-lg transition cursor-pointer flex items-center gap-1"
          >
            <span>Ir a la Plataforma</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Navigation Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 rounded-2xl bg-[#00a2c7] flex items-center justify-center text-white shadow-md shadow-[#00a2c7]/20">
              <CheckCircle className="w-6 h-6 fill-white text-[#00a2c7]" />
            </div>
            <div>
              <span className="font-script text-2xl tracking-wide text-[#00a2c7] font-bold">
                CleanMail
              </span>
              <span className="block text-[10px] font-bold tracking-widest text-slate-400 uppercase -mt-1">
                Email Cleaner &amp; Verifier
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8 text-xs font-semibold text-slate-600">
            <a href="#planes" className="hover:text-[#00a2c7] transition">
              Planes de Depuración
            </a>
            <a href="#caracteristicas" className="hover:text-[#00a2c7] transition">
              Capacidades
            </a>
            <a href="#calculadora" className="hover:text-[#00a2c7] transition">
              Calculadora
            </a>
            <a href="#garantia" className="hover:text-[#00a2c7] transition">
              Garantía &amp; SLA
            </a>
          </nav>

          {/* Action Button */}
          <div className="flex items-center gap-3">
            {session ? (
              <button
                onClick={onGoToDashboard}
                className="px-5 py-2.5 rounded-xl bg-[#00a2c7] hover:bg-[#0092b3] text-white text-xs font-bold transition shadow-sm cursor-pointer flex items-center gap-2"
              >
                <span>Panel de Depuración</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onGoToLogin}
                className="px-5 py-2.5 rounded-xl bg-[#00a2c7] hover:bg-[#0092b3] text-white text-xs font-bold transition shadow-sm cursor-pointer flex items-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Acceso Clientes / Login</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-28 bg-gradient-to-b from-white via-[#f0f9fb]/40 to-[#f3f6f9]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#00a2c7]/10 text-[#00a2c7] border border-[#00a2c7]/20 text-xs font-bold mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Motor de Verificación de Entregabilidad 2026</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.15]">
            Limpia tus listas de correo y{' '}
            <span className="text-[#00a2c7] underline decoration-[#00a2c7]/30 decoration-wavy">
              garantiza el 99%
            </span>{' '}
            de entregabilidad
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Elimina rebotes duros, filtra servidores inexistentes mediante DNS MX en vivo, detecta correos temporales o desechables y obtén puntuación de confianza para tus bases de datos CSV y XLSX.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a
              href="#planes"
              className="px-7 py-3.5 rounded-xl bg-[#00a2c7] hover:bg-[#0092b3] text-white font-extrabold text-sm shadow-lg shadow-[#00a2c7]/25 transition hover:scale-[1.02] flex items-center gap-2 cursor-pointer"
            >
              <span>Ver Planes de Depuración</span>
              <ArrowRight className="w-4 h-4" />
            </a>

            <button
              onClick={onGoToLogin}
              className="px-7 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm border border-slate-300 shadow-xs transition hover:border-slate-400 cursor-pointer flex items-center gap-2"
            >
              <LogIn className="w-4 h-4 text-[#00a2c7]" />
              <span>Iniciar Sesión en el Panel</span>
            </button>
          </div>

          {/* Quick Metrics Banner */}
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-2xl font-black text-slate-900 font-mono">0%</span>
              <span className="block text-[11px] font-bold text-slate-500 uppercase mt-0.5">
                Rebotes Duros
              </span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-2xl font-black text-emerald-600 font-mono">99.8%</span>
              <span className="block text-[11px] font-bold text-slate-500 uppercase mt-0.5">
                Precisión DNS MX
              </span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-2xl font-black text-[#00a2c7] font-mono">0 a 100</span>
              <span className="block text-[11px] font-bold text-slate-500 uppercase mt-0.5">
                Score de Confianza
              </span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-2xl font-black text-purple-600 font-mono">1-Clic</span>
              <span className="block text-[11px] font-bold text-slate-500 uppercase mt-0.5">
                Descarga CSV Limpio
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section (Planes de Depuración) */}
      <section id="planes" className="py-20 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#00a2c7] bg-[#00a2c7]/10 px-3 py-1 rounded-full border border-[#00a2c7]/20">
              Tarifas Transparentes
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-3">
              Planes de Depuración a tu Medida
            </h2>
            <p className="text-sm text-slate-500 mt-3 leading-relaxed">
              Selecciona el paquete de créditos de verificación según el tamaño de tu base de datos. Todos los planes incluyen inspección técnica DNS MX y filtros de rebote.
            </p>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <div className="w-8 h-8 rounded-full border-4 border-[#00a2c7] border-t-transparent animate-spin mx-auto mb-3"></div>
              <p className="text-xs font-semibold">Cargando catálogo de planes...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl max-w-md mx-auto text-center">
              {error}
            </div>
          ) : plans.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No hay planes de depuración activos en este momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {plans.map((plan) => {
                const isPopular = Boolean(plan.popular);
                return (
                  <div
                    key={plan.id}
                    className={`relative rounded-3xl p-6 transition-all duration-200 flex flex-col justify-between ${
                      isPopular
                        ? 'bg-gradient-to-b from-[#f0f9fb] to-white border-2 border-[#00a2c7] shadow-xl shadow-[#00a2c7]/15 ring-2 ring-[#00a2c7]/20 -translate-y-1'
                        : 'bg-white border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md'
                    }`}
                  >
                    {/* Badge */}
                    {plan.badge && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span
                          className={`text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-xs ${
                            isPopular
                              ? 'bg-[#00a2c7] text-white'
                              : 'bg-slate-800 text-white'
                          }`}
                        >
                          {plan.badge}
                        </span>
                      </div>
                    )}

                    <div>
                      {/* Plan Header */}
                      <div className="pb-4 border-b border-slate-100 mt-2">
                        <h3 className="font-extrabold text-lg text-slate-900">{plan.name}</h3>
                        <p className="text-[11px] text-slate-500 mt-1 min-h-[32px] leading-tight">
                          {plan.description}
                        </p>
                      </div>

                      {/* Pricing block */}
                      <div className="py-5">
                        <div className="flex items-baseline gap-1">
                          <span className="text-xs font-bold text-slate-500">
                            {plan.currency === 'USD' ? '$' : plan.currency}
                          </span>
                          <span className="text-4xl font-black text-slate-900 tracking-tight font-mono">
                            {plan.price}
                          </span>
                          <span className="text-xs font-bold text-slate-400">
                            {plan.currency}
                          </span>
                          <span className="text-xs text-slate-500 ml-1">
                            {plan.period ? `/${plan.period}` : ''}
                          </span>
                        </div>

                        {/* Credits Highlight Pill */}
                        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold font-mono">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{plan.credits.toLocaleString()} Verificaciones</span>
                        </div>
                      </div>

                      {/* Features List */}
                      <div className="space-y-2.5 py-4 border-t border-slate-100">
                        <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                          Incluye:
                        </p>
                        {plan.features.map((feature, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                            <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            <span className="leading-snug">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Card CTA */}
                    <div className="pt-6">
                      <button
                        onClick={session ? onGoToDashboard : onGoToLogin}
                        className={`w-full py-3 rounded-xl font-extrabold text-xs transition shadow-xs cursor-pointer flex items-center justify-center gap-2 ${
                          isPopular
                            ? 'bg-[#00a2c7] hover:bg-[#0092b3] text-white shadow-md shadow-[#00a2c7]/20'
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                        }`}
                      >
                        <span>{session ? 'Comenzar a Depurar' : 'Adquirir / Iniciar'}</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Feature Capabilities */}
      <section id="caracteristicas" className="py-20 bg-[#f3f6f9]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              ¿Cómo protege CleanMail la reputación de tu dominio?
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              Validación en 5 capas que filtra los correos antes de que dañen tu tasa de entrega en Mailchimp, SendGrid, Brevo o Amazon SES.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-4">
                <Server className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm mb-2">Comprobación DNS MX en Vivo</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Consultamos en tiempo real los servidores de correo del dominio receptor. Si el dominio no tiene registros MX activos, el correo es clasificado como INVÁLIDO.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm mb-2">Filtro de Correos Desechables</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Bloqueamos dominios temporales tipo 10MinuteMail, TempMail o GuerrillaMail que los usuarios utilizan para pruebas y que aumentan tus rebotes.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm mb-2">Aislamiento de Cuentas de Rol</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Identificamos buzones departamentales (info@, ventas@, soporte@) para que decidas si incluirlos en campañas principales o en listas secundarias.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Calculator Section */}
      <section id="calculadora" className="py-16 bg-white border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white shadow-xl">
            <div className="max-w-2xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#00a2c7] bg-[#00a2c7]/20 px-2.5 py-1 rounded-full">
                Calculadora de Ahorro
              </span>
              <h3 className="text-2xl font-black mt-2">¿Cuántos correos necesitas verificar?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Ajusta el volumen para encontrar el plan óptimo y el ahorro en costos de rebote.
              </p>

              <div className="mt-6">
                <div className="flex justify-between text-xs font-mono font-bold text-slate-300 mb-2">
                  <span>10,000</span>
                  <span className="text-[#00a2c7] text-base">{listSize.toLocaleString()} contactos</span>
                  <span>1,000,000</span>
                </div>
                <input
                  type="range"
                  min="10000"
                  max="1000000"
                  step="10000"
                  value={listSize}
                  onChange={(e) => setListSize(Number(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#00a2c7]"
                />
              </div>

              <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                  <span className="text-slate-400 block text-[10px]">Rebotes Evitados (Est.)</span>
                  <span className="text-lg font-bold text-rose-400 font-mono">
                    ~{Math.round(listSize * 0.14).toLocaleString()}
                  </span>
                </div>
                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                  <span className="text-slate-400 block text-[10px]">Entregabilidad Esperada</span>
                  <span className="text-lg font-bold text-emerald-400 font-mono">99.4%</span>
                </div>
                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 col-span-2 sm:col-span-1">
                  <span className="text-slate-400 block text-[10px]">Plan Recomendado</span>
                  <span className="text-sm font-bold text-[#00a2c7]">
                    {listSize <= 10000
                      ? 'Básico Starter'
                      : listSize <= 50000
                      ? 'Profesional Growth'
                      : listSize <= 250000
                      ? 'Enterprise Volume'
                      : 'Ilimitado Anual'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Guarantee */}
      <section id="garantia" className="py-16 bg-[#f3f6f9]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <ShieldCheck className="w-12 h-12 text-[#00a2c7] mx-auto mb-3" />
          <h3 className="text-2xl font-black text-slate-900">Seguridad &amp; Privacidad de tus Datos</h3>
          <p className="text-xs text-slate-500 mt-2 max-w-xl mx-auto leading-relaxed">
            Nunca compartimos ni vendemos tus bases de datos. Los archivos subidos se procesan directamente en memoria volátil de alta velocidad y se organizan en categorías aisladas.
          </p>

          <div className="mt-8 flex justify-center">
            <button
              onClick={onGoToLogin}
              className="px-6 py-3 rounded-xl bg-[#00a2c7] hover:bg-[#0092b3] text-white text-xs font-bold transition shadow-md cursor-pointer flex items-center gap-2"
            >
              <span>Acceder a la Plataforma CleanMail</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-10 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-script text-xl text-[#00a2c7] font-bold">CleanMail</span>
            <span>&copy; {new Date().getFullYear()} - Sistema Profesional de Depuración de Correos</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <button onClick={onGoToLogin} className="hover:text-slate-800 transition cursor-pointer">
              Iniciar Sesión
            </button>
            <span>•</span>
            <a href="#planes" className="hover:text-slate-800 transition">
              Planes
            </a>
            <span>•</span>
            <span className="text-emerald-600 font-bold">● Servicio Activo</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
