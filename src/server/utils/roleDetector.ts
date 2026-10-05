/**
 * Identificación de correos de rol / genéricos y clasificación de tipo de cuenta
 */
import { TipoEmail } from '../db/schema.ts';

// Prefijos de cuentas de rol / genéricas comunes (en español e inglés)
const ROLE_PREFIXES = new Set<string>([
  'info',
  'ventas',
  'sales',
  'contacto',
  'contact',
  'admin',
  'administrator',
  'soporte',
  'support',
  'atencion',
  'atencionalcliente',
  'servicio',
  'servicioalcliente',
  'facturacion',
  'billing',
  'pagos',
  'cobranzas',
  'contabilidad',
  'recursoshumanos',
  'rrhh',
  'hr',
  'jobs',
  'empleo',
  'reclutamiento',
  'marketing',
  'prensa',
  'press',
  'media',
  'comunicacion',
  'recepcion',
  'postmaster',
  'hostmaster',
  'webmaster',
  'root',
  'no-reply',
  'noreply',
  'donotreply',
  'newsletter',
  'suscripciones',
  'hola',
  'hello',
  'team',
  'equipo',
  'general',
  'legal',
  'privacy',
  'compliance',
  'seguridad',
  'security',
]);

// Proveedores gratuitos / de consumo masivo para clasificar como 'Personal'
const FREE_EMAIL_PROVIDERS = new Set<string>([
  'gmail.com',
  'googlemail.com',
  'hotmail.com',
  'hotmail.es',
  'outlook.com',
  'outlook.es',
  'yahoo.com',
  'yahoo.es',
  'icloud.com',
  'me.com',
  'mac.com',
  'live.com',
  'live.com.ar',
  'msn.com',
  'aol.com',
  'protonmail.com',
  'proton.me',
  'zoho.com',
  'mail.com',
  'gmx.com',
  'gmx.es',
  'yandex.com',
]);

export function isRoleAccount(localPart: string): boolean {
  if (!localPart) return false;
  const clean = localPart.toLowerCase().trim();

  // Coincidencia exacta
  if (ROLE_PREFIXES.has(clean)) {
    return true;
  }

  // Coincidencia con separadores como info.ventas, soporte_tecnico, contacto-empresa
  const subTokens = clean.split(/[._+-]/);
  for (const token of subTokens) {
    if (ROLE_PREFIXES.has(token)) {
      return true;
    }
  }

  return false;
}

export function determineEmailType(domain: string, isRole: boolean): TipoEmail {
  if (isRole) {
    return 'De_Rol';
  }

  const cleanDomain = domain.toLowerCase().trim();
  if (FREE_EMAIL_PROVIDERS.has(cleanDomain)) {
    return 'Personal';
  }

  return 'Corporativo';
}
