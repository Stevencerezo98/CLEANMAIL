export type EstadoEmail = 'VALIDO' | 'GENERICO_ROL' | 'INVALIDO';
export type TipoEmail = 'Personal' | 'Corporativo' | 'De_Rol';
export type UserRole = 'admin' | 'digitalizador';

export interface UserSession {
  username: string;
  name: string;
  role: UserRole;
  token: string;
}

export interface LandingPlan {
  id: string;
  name: string;
  badge?: string;
  credits: number;
  price: number;
  currency: string;
  period: string;
  description: string;
  features: string[];
  popular?: boolean;
  active: boolean;
}

export interface SystemConfig {
  planName: string;
  planType: 'starter' | 'pro' | 'enterprise' | 'unlimited';
  creditosDisponibles: number;
  creditosUsados: number;
  limiteMensual: number;
  autoCleanDuplicates: boolean;
  strictMxChecking: boolean;
  alertaCreditosBajos: boolean;
  umbralAlerta: number;
}

export interface Categoria {
  id: string;
  nombre: string;
  descripcion?: string;
  fecha_creacion: string;
  // Conteo agregado
  total_correos?: number;
  validos?: number;
  genericos_rol?: number;
  invalidos?: number;
  corregidos?: number;
  promedio_score?: number;
}

export interface Correo {
  id: string;
  categoria_id: string;
  email: string;
  original_email: string;
  estado: EstadoEmail;
  tipo: TipoEmail;
  dominio: string;
  observacion: string;
  mx_valido: boolean;
  corregido: boolean;
  score_confianza: number; // Puntuación de confianza (0 - 100)
  verificado_externo: boolean;
  fuente_verificacion: string;
  fecha_creacion: string;
}

export interface EmailFilterOptions {
  categoria_id?: string;
  estado?: EstadoEmail | 'TODOS';
  tipo?: TipoEmail | 'TODOS';
  search?: string;
  min_score?: number;
  max_score?: number;
  page?: number;
  limit?: number;
}

export interface UploadProcessSummary {
  total_leidos: number;
  validos: number;
  genericos_rol: number;
  invalidos: number;
  corregidos: number;
  duplicados_omitidos: number;
  con_verificacion_externa: number;
  promedio_score: number;
  tiempo_procesamiento_ms: number;
  muestra_procesada: Correo[];
}

export type ExternalValidationProvider = 'debounce' | 'hunter' | 'zerobounce' | 'abstract' | 'auto';

export interface ExternalVerifyOptions {
  enabled: boolean;
  provider?: ExternalValidationProvider;
  apiKey?: string;
}
