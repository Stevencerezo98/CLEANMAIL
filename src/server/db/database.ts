import fs from 'fs';
import path from 'path';
import { Categoria, Correo, EmailFilterOptions, SystemConfig, LandingPlan } from './schema.ts';

interface DatabaseData {
  categorias: Categoria[];
  correos: Correo[];
  config?: SystemConfig;
  landingPlans: LandingPlan[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const DEFAULT_LANDING_PLANS: LandingPlan[] = [
  {
    id: 'plan-starter',
    name: 'Básico / Starter',
    badge: 'Para Comenzar',
    credits: 10000,
    price: 19,
    currency: 'USD',
    period: 'pago único',
    description: 'Ideal para pequeñas empresas y depuración de listas puntuales.',
    features: [
      '10,000 Verificaciones de correo',
      'Validación estricta de sintaxis RFC',
      'Comprobación de servidores DNS MX en vivo',
      'Autocorrección de errores de tipeo (.gmai -> .gmail)',
      'Exportación ilimitada a CSV limpio',
    ],
    popular: false,
    active: true,
  },
  {
    id: 'plan-pro',
    name: 'Profesional Growth',
    badge: 'Más Popular',
    credits: 50000,
    price: 49,
    currency: 'USD',
    period: 'pago único',
    description: 'El paquete más elegido para agencias y campañas de Email Marketing.',
    features: [
      '50,000 Verificaciones de correo',
      'Filtro avanzado de dominios desechables y temporales',
      'Identificación de cuentas de rol (info@, ventas@)',
      'Score de confianza de entregabilidad (0 a 100%)',
      'Deduplicación automática de contactos',
      'Soporte prioritario por email',
    ],
    popular: true,
    active: true,
  },
  {
    id: 'plan-enterprise',
    name: 'Enterprise Volume',
    badge: 'Gran Volumen',
    credits: 250000,
    price: 149,
    currency: 'USD',
    period: 'pago único',
    description: 'Alto rendimiento para plataformas SaaS, e-commerce y bases de datos masivas.',
    features: [
      '250,000 Verificaciones de correo',
      'Múltiples operadores y roles (Admin & Digitalizador)',
      'Auditoría profunda de registros SPF y DMARC',
      'Herramienta de purgado de rebotes duros en 1 clic',
      'Aislamiento de cuentas departamentales a listas secundarias',
      'Exportación CSV segmentada',
    ],
    popular: false,
    active: true,
  },
  {
    id: 'plan-unlimited',
    name: 'Ilimitado Anual',
    badge: 'Acceso Total',
    credits: 1000000,
    price: 399,
    currency: 'USD',
    period: '/año',
    description: 'Sin restricciones de volumen ni límites de créditos para corporativos.',
    features: [
      'Créditos Ilimitados de verificación',
      'Categorías y listas ilimitadas con total aislamiento',
      'Acceso exclusivo al panel de control de planes',
      'Asesoría técnica para evitar listas negras (Blacklists)',
      'SLA de disponibilidad garantizado',
    ],
    popular: false,
    active: true,
  },
];

const DEFAULT_CONFIG: SystemConfig = {
  planName: 'Plan Enterprise CleanMail Pro',
  planType: 'enterprise',
  creditosDisponibles: 100000,
  creditosUsados: 0,
  limiteMensual: 250000,
  autoCleanDuplicates: true,
  strictMxChecking: true,
  alertaCreditosBajos: true,
  umbralAlerta: 5000,
};

class Database {
  private data: DatabaseData = {
    categorias: [],
    correos: [],
    config: DEFAULT_CONFIG,
    landingPlans: [],
  };
  private isLoaded = false;

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);

        // Garantizar retrocompatibilidad si existen correos sin campos de score
        for (const c of this.data.correos) {
          if (c.score_confianza === undefined) {
            c.score_confianza = c.estado === 'VALIDO' ? 90 : c.estado === 'GENERICO_ROL' ? 65 : 10;
          }
          if (c.verificado_externo === undefined) {
            c.verificado_externo = false;
          }
          if (!c.fuente_verificacion) {
            c.fuente_verificacion = 'Local';
          }
        }

        if (!this.data.config) {
          this.data.config = {
            ...DEFAULT_CONFIG,
            creditosUsados: this.data.correos.length,
          };
        }

        if (!this.data.landingPlans || !Array.isArray(this.data.landingPlans) || this.data.landingPlans.length === 0) {
          this.data.landingPlans = JSON.parse(JSON.stringify(DEFAULT_LANDING_PLANS));
        }
      } else {
        const now = new Date().toISOString();
        this.data = {
          categorias: [
            { id: 'cat-general', nombre: 'General / Sin Categorizar', fecha_creacion: now },
          ],
          correos: [],
          config: DEFAULT_CONFIG,
          landingPlans: JSON.parse(JSON.stringify(DEFAULT_LANDING_PLANS)),
        };
        this.persist();
      }
      this.isLoaded = true;
    } catch (error) {
      console.error('Error inicializando la base de datos local:', error);
      this.data = { categorias: [], correos: [], config: DEFAULT_CONFIG, landingPlans: [] };
    }
  }

  private persist() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error guardando en archivo db.json:', error);
    }
  }

  // --- MÉTODOS DE CONFIGURACIÓN Y PLANES ---

  public getSystemConfig(): SystemConfig {
    if (!this.data.config) {
      this.data.config = { ...DEFAULT_CONFIG, creditosUsados: this.data.correos.length };
    }
    this.data.config.creditosUsados = this.data.correos.length;
    return this.data.config;
  }

  public updateSystemConfig(updates: Partial<SystemConfig>): SystemConfig {
    if (!this.data.config) {
      this.data.config = { ...DEFAULT_CONFIG };
    }
    this.data.config = {
      ...this.data.config,
      ...updates,
      creditosUsados: this.data.correos.length,
    };
    this.persist();
    return this.data.config;
  }

  // --- MÉTODOS DE PLANES DE DEPURACIÓN (LANDING) ---

  public getLandingPlans(): LandingPlan[] {
    if (!this.data.landingPlans || !Array.isArray(this.data.landingPlans) || this.data.landingPlans.length === 0) {
      this.data.landingPlans = JSON.parse(JSON.stringify(DEFAULT_LANDING_PLANS));
      this.persist();
    }
    return this.data.landingPlans;
  }

  public updateLandingPlan(id: string, updates: Partial<LandingPlan>): LandingPlan | null {
    const plans = this.getLandingPlans();
    const idx = plans.findIndex((p) => p.id === id);
    if (idx === -1) return null;

    plans[idx] = {
      ...plans[idx],
      ...updates,
      id, // inmutable
    };
    this.persist();
    return plans[idx];
  }

  public createLandingPlan(plan: Omit<LandingPlan, 'id'>): LandingPlan {
    const plans = this.getLandingPlans();
    const id = 'plan-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const newPlan: LandingPlan = {
      ...plan,
      id,
    };
    plans.push(newPlan);
    this.persist();
    return newPlan;
  }

  public deleteLandingPlan(id: string): boolean {
    const plans = this.getLandingPlans();
    const idx = plans.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    plans.splice(idx, 1);
    this.persist();
    return true;
  }

  public resetLandingPlans(): LandingPlan[] {
    this.data.landingPlans = JSON.parse(JSON.stringify(DEFAULT_LANDING_PLANS));
    this.persist();
    return this.data.landingPlans;
  }

  // --- MÉTODOS DE CATEGORÍAS ---

  public getAllCategories(): Categoria[] {
    return this.data.categorias.map((cat) => {
      const correosCat = this.data.correos.filter((c) => c.categoria_id === cat.id);
      const total = correosCat.length;
      const validos = correosCat.filter((c) => c.estado === 'VALIDO').length;
      const genericos = correosCat.filter((c) => c.estado === 'GENERICO_ROL').length;
      const invalidos = correosCat.filter((c) => c.estado === 'INVALIDO').length;
      const corregidos = correosCat.filter((c) => c.corregido).length;
      const totalScore = correosCat.reduce((acc, c) => acc + (c.score_confianza || 0), 0);
      const promedioScore = total > 0 ? Math.round(totalScore / total) : 0;

      return {
        ...cat,
        total_correos: total,
        validos,
        genericos_rol: genericos,
        invalidos,
        corregidos,
        promedio_score: promedioScore,
      };
    });
  }

  public getCategoryById(id: string): Categoria | null {
    const cat = this.data.categorias.find((c) => c.id === id);
    if (!cat) return null;

    const correosCat = this.data.correos.filter((c) => c.categoria_id === cat.id);
    const total = correosCat.length;
    const validos = correosCat.filter((c) => c.estado === 'VALIDO').length;
    const genericos = correosCat.filter((c) => c.estado === 'GENERICO_ROL').length;
    const invalidos = correosCat.filter((c) => c.estado === 'INVALIDO').length;
    const corregidos = correosCat.filter((c) => c.corregido).length;
    const totalScore = correosCat.reduce((acc, c) => acc + (c.score_confianza || 0), 0);
    const promedioScore = total > 0 ? Math.round(totalScore / total) : 0;

    return {
      ...cat,
      total_correos: total,
      validos,
      genericos_rol: genericos,
      invalidos,
      corregidos,
      promedio_score: promedioScore,
    };
  }

  public createCategory(nombre: string, descripcion?: string): Categoria {
    const id = 'cat-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const nuevaCategoria: Categoria = {
      id,
      nombre,
      descripcion,
      fecha_creacion: new Date().toISOString(),
      total_correos: 0,
      validos: 0,
      genericos_rol: 0,
      invalidos: 0,
      corregidos: 0,
      promedio_score: 0,
    };
    this.data.categorias.push(nuevaCategoria);
    this.persist();
    return nuevaCategoria;
  }

  public updateCategory(id: string, updates: { nombre?: string; descripcion?: string }): Categoria | null {
    const cat = this.data.categorias.find((c) => c.id === id);
    if (!cat) return null;

    if (updates.nombre && updates.nombre.trim()) {
      cat.nombre = updates.nombre.trim();
    }
    if (updates.descripcion !== undefined) {
      cat.descripcion = updates.descripcion.trim();
    }
    this.persist();
    return this.getCategoryById(id);
  }

  public deleteCategory(id: string): boolean {
    const idx = this.data.categorias.findIndex((c) => c.id === id);
    if (idx === -1) return false;

    this.data.categorias.splice(idx, 1);
    this.data.correos = this.data.correos.filter((c) => c.categoria_id !== id);
    this.persist();
    return true;
  }

  // --- MÉTODOS DE CORREOS ---

  public getEmailsByCategory(
    categoria_id: string,
    filters: EmailFilterOptions = {}
  ): { total: number; page: number; limit: number; totalPages: number; correos: Correo[] } {
    let list = this.data.correos.filter((c) => c.categoria_id === categoria_id);

    if (filters.estado && filters.estado !== 'TODOS') {
      list = list.filter((c) => c.estado === filters.estado);
    }

    if (filters.tipo && filters.tipo !== 'TODOS') {
      list = list.filter((c) => c.tipo === filters.tipo);
    }

    if (filters.min_score !== undefined && !isNaN(filters.min_score)) {
      list = list.filter((c) => (c.score_confianza ?? 0) >= filters.min_score!);
    }

    if (filters.max_score !== undefined && !isNaN(filters.max_score)) {
      list = list.filter((c) => (c.score_confianza ?? 0) <= filters.max_score!);
    }

    if (filters.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.email.toLowerCase().includes(q) ||
          c.dominio.toLowerCase().includes(q) ||
          c.observacion.toLowerCase().includes(q) ||
          (c.fuente_verificacion && c.fuente_verificacion.toLowerCase().includes(q))
      );
    }

    // Ordenar descendente por fecha con comparación rápida ISO
    list.sort((a, b) => (b.fecha_creacion > a.fecha_creacion ? 1 : b.fecha_creacion < a.fecha_creacion ? -1 : 0));

    const total = list.length;
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 50;
    const startIndex = (page - 1) * limit;
    const paginated = list.slice(startIndex, startIndex + limit);
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      total,
      page,
      limit,
      totalPages,
      correos: paginated,
    };
  }

  public getEmailById(id: string): Correo | null {
    return this.data.correos.find((c) => c.id === id) || null;
  }

  public updateEmail(id: string, updates: Partial<Correo>): Correo | null {
    const idx = this.data.correos.findIndex((c) => c.id === id);
    if (idx === -1) return null;

    this.data.correos[idx] = {
      ...this.data.correos[idx],
      ...updates,
      id, // garantizar inmutabilidad de id
    };
    this.persist();
    return this.data.correos[idx];
  }

  public getExistingEmailsSet(categoria_id: string): Set<string> {
    const set = new Set<string>();
    this.data.correos
      .filter((c) => c.categoria_id === categoria_id)
      .forEach((c) => set.add(c.email.toLowerCase()));
    return set;
  }

  public insertEmailsBatch(categoria_id: string, correosNuevos: Omit<Correo, 'id' | 'fecha_creacion'>[]): Correo[] {
    const inserted: Correo[] = [];
    const now = new Date().toISOString();

    for (const c of correosNuevos) {
      const correoObj: Correo = {
        id: 'cor-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
        categoria_id,
        email: c.email,
        original_email: c.original_email,
        estado: c.estado,
        tipo: c.tipo,
        dominio: c.dominio,
        observacion: c.observacion,
        mx_valido: c.mx_valido,
        corregido: c.corregido,
        score_confianza: c.score_confianza ?? (c.estado === 'VALIDO' ? 90 : c.estado === 'GENERICO_ROL' ? 65 : 10),
        verificado_externo: c.verificado_externo ?? false,
        fuente_verificacion: c.fuente_verificacion || 'Local',
        fecha_creacion: now,
      };
      this.data.correos.push(correoObj);
      inserted.push(correoObj);
    }

    this.persist();
    return inserted;
  }

  public deleteEmail(id: string): boolean {
    const idx = this.data.correos.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    this.data.correos.splice(idx, 1);
    this.persist();
    return true;
  }

  // Eliminación masiva por IDs seleccionados
  public deleteEmailsBulk(ids: string[]): number {
    const set = new Set(ids);
    const initialCount = this.data.correos.length;
    this.data.correos = this.data.correos.filter((c) => !set.has(c.id));
    const deletedCount = initialCount - this.data.correos.length;
    this.persist();
    return deletedCount;
  }

  // Eliminación por filtro en categoría (ej: purgar todos los inválidos)
  public deleteEmailsByFilter(categoria_id: string, filter: 'INVALIDOS' | 'GENERICOS_ROL' | 'ALL'): number {
    const initialCount = this.data.correos.length;
    this.data.correos = this.data.correos.filter((c) => {
      if (c.categoria_id !== categoria_id) return true;
      if (filter === 'ALL') return false;
      if (filter === 'INVALIDOS' && c.estado === 'INVALIDO') return false;
      if (filter === 'GENERICOS_ROL' && c.estado === 'GENERICO_ROL') return false;
      return true;
    });
    const deletedCount = initialCount - this.data.correos.length;
    this.persist();
    return deletedCount;
  }

  // Mover correos masivamente de una categoría a otra
  public moveEmailsBulk(ids: string[], target_categoria_id: string): number {
    const set = new Set(ids);
    let movedCount = 0;
    for (const c of this.data.correos) {
      if (set.has(c.id)) {
        c.categoria_id = target_categoria_id;
        movedCount++;
      }
    }
    this.persist();
    return movedCount;
  }

  public getCleanEmailsForExport(categoria_id: string, includeRoles = false): Correo[] {
    return this.data.correos.filter((c) => {
      if (c.categoria_id !== categoria_id) return false;
      if (includeRoles) {
        return c.estado === 'VALIDO' || c.estado === 'GENERICO_ROL';
      }
      return c.estado === 'VALIDO';
    });
  }

  // Distribución dinámica de dominios y métricas analíticas
  public getDomainBreakdown(categoria_id: string): {
    domain: string;
    total: number;
    validos: number;
    invalidos: number;
    porcentaje: number;
  }[] {
    const list = this.data.correos.filter((c) => c.categoria_id === categoria_id);
    const domainMap = new Map<string, { total: number; validos: number; invalidos: number }>();

    for (const c of list) {
      const d = c.dominio || 'desconocido';
      const cur = domainMap.get(d) || { total: 0, validos: 0, invalidos: 0 };
      cur.total++;
      if (c.estado === 'VALIDO') cur.validos++;
      else if (c.estado === 'INVALIDO') cur.invalidos++;
      domainMap.set(d, cur);
    }

    const totalCount = list.length || 1;
    const sorted = Array.from(domainMap.entries())
      .map(([domain, counts]) => ({
        domain,
        total: counts.total,
        validos: counts.validos,
        invalidos: counts.invalidos,
        porcentaje: Math.round((counts.total / totalCount) * 100),
      }))
      .sort((a, b) => b.total - a.total);

    return sorted.slice(0, 8); // Top 8 dominios
  }

  public getGlobalStats() {
    const total = this.data.correos.length;
    const validos = this.data.correos.filter((c) => c.estado === 'VALIDO').length;
    const genericos = this.data.correos.filter((c) => c.estado === 'GENERICO_ROL').length;
    const invalidos = this.data.correos.filter((c) => c.estado === 'INVALIDO').length;
    const corregidos = this.data.correos.filter((c) => c.corregido).length;
    const totalScore = this.data.correos.reduce((acc, c) => acc + (c.score_confianza || 0), 0);
    const promedioScore = total > 0 ? Math.round(totalScore / total) : 0;

    return {
      total_listas: this.data.categorias.length,
      total_correos: total,
      validos,
      genericos_rol: genericos,
      invalidos,
      corregidos,
      promedio_score: promedioScore,
      config: this.getSystemConfig(),
    };
  }
}

export const db = new Database();
