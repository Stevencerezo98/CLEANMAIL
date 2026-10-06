import React, { useState } from 'react';
import { Plus, ChevronDown, RefreshCw, Menu, LogOut, ShieldCheck, UserCheck, Settings, ExternalLink } from 'lucide-react';
import { UserSession } from '../server/db/schema.ts';

interface TopBarProps {
  totalEmails: number;
  availableCredits: number;
  planName: string;
  session: UserSession | null;
  onOpenNewCategoryModal: () => void;
  onRefresh: () => void;
  loading: boolean;
  onToggleMobileSidebar: () => void;
  onLogout: () => void;
  onGoToAdminConfig: () => void;
  onOpenLanding?: () => void;
}

export const CleanMailTopBar: React.FC<TopBarProps> = ({
  totalEmails,
  availableCredits,
  planName,
  session,
  onOpenNewCategoryModal,
  onRefresh,
  loading,
  onToggleMobileSidebar,
  onLogout,
  onGoToAdminConfig,
  onOpenLanding,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const isAdmin = session?.role === 'admin';

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      {/* Mobile Toggle & Status */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Motor CleanMail :3000 Activo</span>
        </div>

        {/* Plan badge */}
        <span className="hidden md:inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#00a2c7]/10 text-[#00a2c7] border border-[#00a2c7]/20 uppercase tracking-wider">
          {planName || 'Enterprise'}
        </span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-3.5">
        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={loading}
          title="Actualizar datos"
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#00a2c7]' : ''}`} />
        </button>

        {/* Available Credits / Stat */}
        <div className="text-xs text-slate-600 font-medium hidden sm:block">
          <span>Créditos: </span>
          <span className="font-bold text-[#f27438] font-mono text-sm ml-1">
            {availableCredits > 0 ? availableCredits.toLocaleString() : 'Ilimitado'}
          </span>
          <span className="text-[10px] text-slate-400 ml-1">({totalEmails} en lista)</span>
        </div>

        {/* Ver Landing Button */}
        {onOpenLanding && (
          <button
            onClick={onOpenLanding}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition shadow-2xs cursor-pointer"
            title="Ver la Landing pública de planes"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#00a2c7]" />
            <span>Landing Planes</span>
          </button>
        )}

        {/* + Nueva Lista Button */}
        <button
          onClick={onOpenNewCategoryModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-[#f27438] text-[#f27438] hover:bg-[#f27438]/10 text-xs font-bold transition shadow-xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Nueva Lista</span>
        </button>

        {/* User Profile & Role Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 pl-2 border-l border-slate-200 cursor-pointer select-none"
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-inner ${
                isAdmin ? 'bg-purple-100 text-purple-800 border border-purple-300' : 'bg-cyan-100 text-cyan-800 border border-cyan-300'
              }`}
            >
              {session?.username ? session.username.charAt(0).toUpperCase() : 'U'}
            </div>

            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-800 leading-tight">
                {session?.username || 'Usuario'}
              </span>
              <span
                className={`text-[9px] font-black uppercase tracking-wider ${
                  isAdmin ? 'text-purple-600' : 'text-cyan-600'
                }`}
              >
                {isAdmin ? 'Administrador' : 'Digitalizador'}
              </span>
            </div>

            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Profile Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-xl py-2 z-50 animate-fade-in">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">{session?.name}</p>
                <p className="text-[10px] text-slate-400 capitalize">Rol: {session?.role}</p>
              </div>

              {isAdmin && (
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onGoToAdminConfig();
                  }}
                  className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-[#00a2c7]/10 hover:text-[#00a2c7] flex items-center gap-2 cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Configuración & Plan</span>
                </button>
              )}

              {onOpenLanding && (
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onOpenLanding();
                  }}
                  className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-[#00a2c7]/10 hover:text-[#00a2c7] flex items-center gap-2 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Ver Landing de Planes</span>
                </button>
              )}

              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  onLogout();
                }}
                className="w-full px-4 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
