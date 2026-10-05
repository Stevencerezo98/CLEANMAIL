import React from 'react';
import {
  Home,
  MailCheck,
  UploadCloud,
  Code2,
  FolderTree,
  HelpCircle,
  Info,
  CheckCircle,
  TrendingUp,
  Settings,
  ShieldAlert,
} from 'lucide-react';
import { UserRole } from '../server/db/schema.ts';

export type CleanMailTab =
  | 'single'
  | 'list'
  | 'analytics'
  | 'categories'
  | 'admin_config'
  | 'api'
  | 'faq'
  | 'terminology';

interface SidebarProps {
  activeTab: CleanMailTab;
  onSelectTab: (tab: CleanMailTab) => void;
  categoriesCount: number;
  totalEmails: number;
  userRole?: UserRole;
}

export const CleanMailSidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  categoriesCount,
  userRole,
}) => {
  const isAdmin = userRole === 'admin';

  return (
    <aside className="w-64 bg-[#00a2c7] text-white flex flex-col shrink-0 min-h-screen select-none shadow-xl transition-all">
      {/* Brand Header */}
      <div className="p-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onSelectTab('list')}>
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white border border-white/30 shadow-sm">
            <CheckCircle className="w-5 h-5 fill-white text-[#00a2c7]" />
          </div>
          <div>
            <span className="font-script text-2xl tracking-wide text-white drop-shadow-sm font-bold">
              CleanMail
            </span>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-4 py-2 space-y-5 overflow-y-auto">
        {/* Section: PRINCIPAL */}
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-bold text-white/60 uppercase tracking-wider">
            DEPURACIÓN & LISTAS
          </p>

          <button
            onClick={() => onSelectTab('list')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
              activeTab === 'list'
                ? 'bg-white/20 text-white font-semibold shadow-inner border border-white/20'
                : 'text-white/85 hover:text-white hover:bg-white/10'
            }`}
          >
            <div className="flex items-center gap-3">
              <UploadCloud className="w-4 h-4" />
              <span>Verify List (Archivos)</span>
            </div>
            {activeTab === 'list' && (
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
            )}
          </button>

          <button
            onClick={() => onSelectTab('analytics')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-white/20 text-white font-semibold shadow-inner border border-white/20'
                : 'text-white/85 hover:text-white hover:bg-white/10'
            }`}
          >
            <div className="flex items-center gap-3">
              <TrendingUp className="w-4 h-4" />
              <span>Salud & Acciones</span>
            </div>
          </button>

          <button
            onClick={() => onSelectTab('single')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
              activeTab === 'single'
                ? 'bg-white/20 text-white font-semibold shadow-inner border border-white/20'
                : 'text-white/85 hover:text-white hover:bg-white/10'
            }`}
          >
            <div className="flex items-center gap-3">
              <MailCheck className="w-4 h-4" />
              <span>Single Email</span>
            </div>
          </button>
        </div>

        {/* Section: ORGANIZACIÓN */}
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-bold text-white/60 uppercase tracking-wider">
            ORGANIZACIÓN
          </p>

          <button
            onClick={() => onSelectTab('categories')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
              activeTab === 'categories'
                ? 'bg-white/20 text-white font-semibold shadow-inner border border-white/20'
                : 'text-white/85 hover:text-white hover:bg-white/10'
            }`}
          >
            <div className="flex items-center gap-3">
              <FolderTree className="w-4 h-4" />
              <span>Listas / Categorías</span>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/20 text-white font-semibold">
              {categoriesCount}
            </span>
          </button>
        </div>

        {/* Section: ADMINISTRACIÓN (Solo Administrador) */}
        {isAdmin && (
          <div className="space-y-1 pt-1">
            <p className="px-3 text-[10px] font-bold text-purple-200 uppercase tracking-wider flex items-center gap-1.5">
              <span>ADMINISTRACIÓN</span>
            </p>

            <button
              onClick={() => onSelectTab('admin_config')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                activeTab === 'admin_config'
                  ? 'bg-white/25 text-white font-bold shadow-inner border border-white/30'
                  : 'text-purple-100 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <Settings className="w-4 h-4" />
                <span>Configuración & Plan</span>
              </div>
              <span className="text-[9px] bg-purple-900/40 text-purple-100 px-1.5 py-0.5 rounded font-bold">
                ADMIN
              </span>
            </button>

            <button
              onClick={() => onSelectTab('api')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                activeTab === 'api'
                  ? 'bg-white/20 text-white font-semibold shadow-inner border border-white/20'
                  : 'text-white/85 hover:text-white hover:bg-white/10'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>API & Proveedores</span>
            </button>
          </div>
        )}

        {/* Section: INFO */}
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-bold text-white/60 uppercase tracking-wider">
            INFO
          </p>

          <button
            onClick={() => onSelectTab('terminology')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
              activeTab === 'terminology'
                ? 'bg-white/20 text-white font-semibold shadow-inner border border-white/20'
                : 'text-white/85 hover:text-white hover:bg-white/10'
            }`}
          >
            <Info className="w-4 h-4" />
            <span>Terminology</span>
          </button>

          <button
            onClick={() => onSelectTab('faq')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
              activeTab === 'faq'
                ? 'bg-white/20 text-white font-semibold shadow-inner border border-white/20'
                : 'text-white/85 hover:text-white hover:bg-white/10'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>FAQ & Ayuda</span>
          </button>
        </div>
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-white/15 text-xs text-white/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-300"></span>
          <span className="text-[11px] capitalize">{userRole || 'Conectado'}</span>
        </div>
        <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono">v2.5</span>
      </div>
    </aside>
  );
};
