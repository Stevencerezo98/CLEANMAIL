import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CleanMailSidebar, CleanMailTab } from './components/CleanMailSidebar.tsx';
import { CleanMailTopBar } from './components/CleanMailTopBar.tsx';
import { SingleEmailView } from './components/SingleEmailView.tsx';
import { VerifyListView } from './components/VerifyListView.tsx';
import { CategoriesView } from './components/CategoriesView.tsx';
import { AnalyticsView } from './components/AnalyticsView.tsx';
import { AdminConfigView } from './components/AdminConfigView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { TerminologyView, FaqView } from './components/InfoViews.tsx';
import { NewCategoryModal } from './components/NewCategoryModal.tsx';
import { LoginView } from './components/LoginView.tsx';
import { LandingView } from './components/LandingView.tsx';
import { PlansManagerView } from './components/PlansManagerView.tsx';
import { UpgradePlanModal } from './components/UpgradePlanModal.tsx';
import {
  Categoria,
  Correo,
  EstadoEmail,
  TipoEmail,
  UploadProcessSummary,
  UserSession,
  SystemConfig,
} from './server/db/schema.ts';
import { Smile } from 'lucide-react';

export default function App() {
  // Estado de autenticación
  const [session, setSession] = useState<UserSession | null>(() => {
    try {
      const saved = localStorage.getItem('cleanmail_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState<CleanMailTab>('list');
  const [showLanding, setShowLanding] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('cleanmail_session');
      return !saved;
    } catch {
      return true;
    }
  });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [correos, setCorreos] = useState<Correo[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<EstadoEmail | 'TODOS'>('TODOS');
  const [typeFilter, setTypeFilter] = useState<TipoEmail | 'TODOS'>('TODOS');
  const [scoreFilter, setScoreFilter] = useState<string>('ALL');

  // Configuración de créditos y plan
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
  const [isGlobalUpgradeModalOpen, setIsGlobalUpgradeModalOpen] = useState(false);

  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [isNewCatModalOpen, setIsNewCatModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // AbortController para cancelar peticiones pendientes al paginar o filtrar
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cargar estadísticas globales y configuración de plan
  const fetchGlobalStats = useCallback(async () => {
    try {
      const res = await fetch('/api/emails/stats');
      const data = await res.json();
      if (data.success && data.data?.config) {
        setSystemConfig(data.data.config);
      }
    } catch (err) {
      console.error('Error cargando estadísticas:', err);
    }
  }, []);

  // Obtener categorías desde GET /api/categories
  const fetchCategories = useCallback(async () => {
    try {
      setLoadingCategories(true);
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setCategories(data.data);
        setSelectedCategoryId((curr) => {
          if (!curr && data.data.length > 0) {
            return data.data[0].id;
          }
          return curr;
        });
      }
    } catch (err) {
      console.error('Error cargando categorías:', err);
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  // Obtener correos de la categoría activa
  const fetchEmails = useCallback(
    async (catIdOverride?: string) => {
      const targetId = catIdOverride || selectedCategoryId;
      if (!targetId) return;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        setLoadingEmails(true);
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });
        if (statusFilter !== 'TODOS') params.append('estado', statusFilter);
        if (typeFilter !== 'TODOS') params.append('tipo', typeFilter);
        if (searchTerm.trim()) params.append('search', searchTerm.trim());

        if (scoreFilter === 'HIGH_80') {
          params.append('min_score', '80');
        } else if (scoreFilter === 'MID_50') {
          params.append('min_score', '50');
          params.append('max_score', '79');
        } else if (scoreFilter === 'LOW_50') {
          params.append('max_score', '49');
        }

        const res = await fetch(`/api/emails/category/${targetId}?${params.toString()}`, {
          signal: controller.signal,
        });
        const data = await res.json();

        if (data.success && data.data) {
          setCorreos(data.data.correos);
          setTotalRecords(data.data.total);
          setTotalPages(data.data.totalPages);
        }
      } catch (err: unknown) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Error cargando correos:', err);
        }
      } finally {
        setLoadingEmails(false);
      }
    },
    [selectedCategoryId, page, limit, statusFilter, typeFilter, scoreFilter, searchTerm]
  );

  // Inicializar datos cuando el usuario tiene sesión activa
  useEffect(() => {
    if (session) {
      fetchCategories();
      fetchGlobalStats();
    }
  }, [session, fetchCategories, fetchGlobalStats]);

  // Consultar correos cuando cambian filtros o categoría
  useEffect(() => {
    if (session && selectedCategoryId) {
      fetchEmails(selectedCategoryId);
    }
  }, [session, selectedCategoryId, page, limit, statusFilter, typeFilter, scoreFilter, searchTerm, fetchEmails]);

  // Manejo de Cerrar Sesión
  const handleLogout = async () => {
    if (session?.token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.token}` },
        });
      } catch (e) {
        console.error(e);
      }
    }
    localStorage.removeItem('cleanmail_session');
    setSession(null);
    setShowLanding(true);
    setShowLoginModal(false);
  };

  // Crear categoría POST /api/categories
  const handleCreateCategory = async (nombre: string, descripcion?: string) => {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, descripcion }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Error al crear la categoría.');
    }

    await fetchCategories();
    if (data.data && data.data.id) {
      setSelectedCategoryId(data.data.id);
      setPage(1);
    }
  };

  // Actualizar categoría PUT /api/categories/:id
  const handleUpdateCategory = async (id: string, nombre: string, descripcion?: string) => {
    const res = await fetch(`/api/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, descripcion }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Error al actualizar categoría.');
    }
    fetchCategories();
  };

  // Eliminar categoría DELETE /api/categories/:id
  const handleDeleteCategory = async (id: string) => {
    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al eliminar categoría.');
      }

      const remaining = categories.filter((c) => c.id !== id);
      setCategories(remaining);
      if (selectedCategoryId === id && remaining.length > 0) {
        setSelectedCategoryId(remaining[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Editar correo PUT /api/emails/:id
  const handleEditEmail = async (
    id: string,
    updateData: { email: string; estado: EstadoEmail; observacion: string; reVerify: boolean }
  ) => {
    const res = await fetch(`/api/emails/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Error al actualizar correo.');
    }
    fetchEmails();
    fetchCategories();
    fetchGlobalStats();
  };

  // Eliminar correo individual DELETE /api/emails/:id
  const handleDeleteEmail = async (id: string) => {
    try {
      // Actualización optimista inmediata en la UI
      setCorreos((prev) => prev.filter((c) => c.id !== id));
      setTotalRecords((prev) => Math.max(0, prev - 1));

      const res = await fetch(`/api/emails/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al eliminar correo.');
      }
      const targetCat = selectedCategoryId || (categories.length > 0 ? categories[0].id : '');
      if (targetCat) fetchEmails(targetCat);
      fetchCategories();
      fetchGlobalStats();
    } catch (err) {
      console.error('Error al eliminar correo:', err);
      fetchEmails();
      throw err;
    }
  };

  // Borrado masivo POST /api/emails/bulk-delete
  const handleBulkDelete = async (ids: string[]) => {
    try {
      // Actualización optimista inmediata
      const idSet = new Set(ids);
      setCorreos((prev) => prev.filter((c) => !idSet.has(c.id)));
      setTotalRecords((prev) => Math.max(0, prev - ids.length));

      const res = await fetch('/api/emails/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error en borrado masivo.');
      }
      const targetCat = selectedCategoryId || (categories.length > 0 ? categories[0].id : '');
      if (targetCat) fetchEmails(targetCat);
      fetchCategories();
      fetchGlobalStats();
    } catch (err) {
      console.error('Error en borrado masivo:', err);
      fetchEmails();
      throw err;
    }
  };

  // Mover correos masivamente POST /api/emails/bulk-move
  const handleBulkMove = async (ids: string[], targetCategoryId: string) => {
    const res = await fetch('/api/emails/bulk-move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, target_categoria_id: targetCategoryId }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Error al mover correos.');
    }
    const idSet = new Set(ids);
    setCorreos((prev) => prev.filter((c) => !idSet.has(c.id)));
    setTotalRecords((prev) => Math.max(0, prev - ids.length));
    fetchEmails();
    fetchCategories();
  };

  // Purgar todos los inválidos de la categoría activa
  const handlePurgeInvalid = async () => {
    const targetCat = selectedCategoryId || (categories.length > 0 ? categories[0].id : '');
    if (!targetCat) return;

    try {
      // Actualización optimista inmediata
      setCorreos((prev) => prev.filter((c) => c.estado !== 'INVALIDO'));

      const res = await fetch('/api/emails/bulk-delete-filter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoria_id: targetCat, filter: 'INVALIDOS' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al purgar inválidos.');
      }
      fetchEmails(targetCat);
      fetchCategories();
      fetchGlobalStats();
    } catch (err) {
      console.error('Error al purgar inválidos:', err);
      fetchEmails();
      throw err;
    }
  };

  // Mover todas las cuentas de rol a una lista de revisión aislada
  const handleMoveRolesToNewList = async () => {
    if (!selectedCategoryId) return;
    // 1. Encontrar o crear la lista de revisión
    let reviewCat = categories.find((c) => c.nombre.toLowerCase().includes('revisión') || c.nombre.toLowerCase().includes('revision'));
    if (!reviewCat) {
      const createRes = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: 'Cuentas de Rol - En Revisión',
          descripcion: 'Buzones departamentales (info@, ventas@, soporte@) aislados para campañas secundarias.',
        }),
      });
      const created = await createRes.json();
      if (created.success && created.data) {
        reviewCat = created.data;
      }
    }

    if (!reviewCat) throw new Error('No se pudo crear la lista de revisión.');

    // 2. Obtener los IDs de correos de rol en la categoría activa
    const getRolesRes = await fetch(`/api/emails/category/${selectedCategoryId}?estado=GENERICO_ROL&limit=5000`);
    const rolesData = await getRolesRes.json();
    const roleIds = (rolesData.data?.correos || []).map((c: Correo) => c.id);

    if (roleIds.length > 0) {
      await handleBulkMove(roleIds, reviewCat.id);
    }
    fetchCategories();
    fetchEmails();
  };

  // Callback inmediato al procesar archivos
  const handleUploadSuccess = (_summary: UploadProcessSummary, targetCatId?: string) => {
    const catToUse = targetCatId || selectedCategoryId;
    if (catToUse) {
      setSelectedCategoryId(catToUse);
    }

    setStatusFilter('TODOS');
    setTypeFilter('TODOS');
    setScoreFilter('ALL');
    setSearchTerm('');
    setPage(1);

    fetchCategories();
    fetchGlobalStats();
    if (catToUse) {
      fetchEmails(catToUse);
    }
  };

  // Si no hay sesión autenticada
  if (!session) {
    if (showLoginModal) {
      return (
        <LoginView
          onLoginSuccess={(sess) => {
            setSession(sess);
            setShowLanding(false);
            setShowLoginModal(false);
          }}
          onGoToLanding={() => setShowLoginModal(false)}
        />
      );
    }

    return (
      <LandingView
        onGoToLogin={() => setShowLoginModal(true)}
        session={null}
        onGoToDashboard={() => setShowLoginModal(true)}
      />
    );
  }

  // Si el usuario con sesión activa desea previsualizar la landing pública
  if (showLanding) {
    return (
      <LandingView
        onGoToLogin={() => setShowLanding(false)}
        session={session}
        onGoToDashboard={() => setShowLanding(false)}
      />
    );
  }

  const totalAllEmails = categories.reduce((acc, c) => acc + (c.total_correos || 0), 0);
  const activePlanName = systemConfig?.planName || 'Plan Enterprise CleanMail';
  const availableCredits = systemConfig?.creditosDisponibles || 100000;

  return (
    <div className="flex min-h-screen bg-[#f3f6f9] text-slate-800 antialiased font-sans">
      {/* Sidebar Desktop */}
      <div className="hidden lg:block">
        <CleanMailSidebar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            // Protección de rol: Si no es admin y quiere entrar a admin_config o planes, redirigir
            if ((tab === 'admin_config' || tab === 'plans') && session.role !== 'admin') {
              setActiveTab('list');
              return;
            }
            setActiveTab(tab);
          }}
          categoriesCount={categories.length}
          totalEmails={totalAllEmails}
          userRole={session.role}
          onOpenLanding={() => setShowLanding(true)}
        />
      </div>

      {/* Sidebar Mobile Overlay */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60"
            onClick={() => setIsMobileSidebarOpen(false)}
          ></div>
          <div className="relative z-10">
            <CleanMailSidebar
              activeTab={activeTab}
              onSelectTab={(tab) => {
                if ((tab === 'admin_config' || tab === 'plans') && session.role !== 'admin') {
                  setActiveTab('list');
                } else {
                  setActiveTab(tab);
                }
                setIsMobileSidebarOpen(false);
              }}
              categoriesCount={categories.length}
              totalEmails={totalAllEmails}
              userRole={session.role}
              onOpenLanding={() => {
                setIsMobileSidebarOpen(false);
                setShowLanding(true);
              }}
            />
          </div>
        </div>
      )}

      {/* Main Workspace Column */}
      <div className="flex-1 flex flex-col min-w-0">
        <CleanMailTopBar
          totalEmails={totalAllEmails}
          availableCredits={availableCredits}
          planName={activePlanName}
          isUnlimited={systemConfig?.planType === 'unlimited'}
          onOpenUpgradeModal={() => setIsGlobalUpgradeModalOpen(true)}
          session={session}
          onOpenNewCategoryModal={() => setIsNewCatModalOpen(true)}
          onRefresh={() => {
            fetchCategories();
            fetchEmails();
            fetchGlobalStats();
          }}
          loading={loadingCategories || loadingEmails}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          onLogout={handleLogout}
          onGoToAdminConfig={() => setActiveTab('admin_config')}
          onOpenLanding={() => setShowLanding(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'single' && <SingleEmailView />}

          {activeTab === 'list' && (
            <VerifyListView
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={(id) => {
                setSelectedCategoryId(id);
                setPage(1);
              }}
              onOpenNewCategoryModal={() => setIsNewCatModalOpen(true)}
              onUpdateCategory={handleUpdateCategory}
              correos={correos}
              total={totalRecords}
              page={page}
              limit={limit}
              totalPages={totalPages}
              searchTerm={searchTerm}
              statusFilter={statusFilter}
              typeFilter={typeFilter}
              scoreFilter={scoreFilter}
              onSearchChange={(val) => {
                setSearchTerm(val);
                setPage(1);
              }}
              onStatusFilterChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
              onTypeFilterChange={(val) => {
                setTypeFilter(val);
                setPage(1);
              }}
              onScoreFilterChange={(val) => {
                setScoreFilter(val);
                setPage(1);
              }}
              onPageChange={(p) => setPage(p)}
              onDeleteEmail={handleDeleteEmail}
              onBulkDelete={handleBulkDelete}
              onBulkMove={handleBulkMove}
              onPurgeInvalid={handlePurgeInvalid}
              onMoveRolesToNewList={handleMoveRolesToNewList}
              onEditEmail={handleEditEmail}
              onUploadSuccess={handleUploadSuccess}
              loading={loadingEmails}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsView
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={(id) => setSelectedCategoryId(id)}
              onGoToVerifyList={() => setActiveTab('list')}
            />
          )}

          {activeTab === 'categories' && (
            <CategoriesView
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={(id) => {
                setSelectedCategoryId(id);
                setPage(1);
              }}
              onCreateCategory={handleCreateCategory}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
              onGoToVerifyList={() => setActiveTab('list')}
            />
          )}

          {/* Gestión de Planes de Depuración (Exclusivo Administrador: no sale a nadie más) */}
          {activeTab === 'plans' && session.role === 'admin' && (
            <PlansManagerView
              session={session}
              onPreviewLanding={() => setShowLanding(true)}
            />
          )}

          {activeTab === 'admin_config' && session.role === 'admin' && (
            <AdminConfigView session={session} />
          )}

          {activeTab === 'api' && <SettingsView />}
          {activeTab === 'terminology' && <TerminologyView />}
          {activeTab === 'faq' && <FaqView />}
        </main>
      </div>

      {/* Modal for + Nueva Lista */}
      <NewCategoryModal
        isOpen={isNewCatModalOpen}
        onClose={() => setIsNewCatModalOpen(false)}
        onCreateCategory={handleCreateCategory}
      />

      {/* Signature Floating Orange Smile Widget */}
      <div
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-[#f27438] hover:bg-[#e06226] text-white flex items-center justify-center shadow-xl cursor-pointer hover:scale-105 transition duration-200 z-30"
        title="CleanMail Support & Status"
        onClick={() => setActiveTab('faq')}
      >
        <Smile className="w-6 h-6 stroke-[2.5]" />
      </div>

      {/* Global Upgrade Plan Modal */}
      <UpgradePlanModal
        isOpen={isGlobalUpgradeModalOpen}
        onClose={() => setIsGlobalUpgradeModalOpen(false)}
        currentConfig={systemConfig}
        onPlanUpgraded={(newConfig) => {
          setSystemConfig(newConfig);
          fetchGlobalStats();
        }}
      />
    </div>
  );
}
