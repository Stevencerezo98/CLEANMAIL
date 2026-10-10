/**
 * Validador profundo de buzones, patrones y reglas de proveedores (Gmail, Yahoo, Outlook, etc.)
 * Detecta cuentas imposibles, secuencias numéricas inválidas, entropía/gibberish y palabras de prueba.
 */

import crypto from 'crypto';

export interface MailboxValidationResult {
  isValid: boolean;
  isDeliverable: boolean;
  score: number; // 0 - 100
  reasonCode:
    | 'ACCEPTED_EMAIL'
    | 'UNVERIFIED_MAILBOX'
    | 'INVALID_PROVIDER_SYNTAX'
    | 'SUSPICIOUS_PATTERN'
    | 'ROLE_ACCOUNT'
    | 'DISPOSABLE'
    | 'NO_MX'
    | 'CATCH_ALL';
  observation: string;
  isCatchAll: boolean;
  isFreeProvider: boolean;
  accountStatus: {
    mailboxConfirmed: boolean;
    hasProfile: boolean;
    syntaxCompliant: boolean;
    providerRulesPass: boolean;
  };
}

// Dominios que NO son Catch-All (rechazan cuentas inexistentes de forma estricta)
export const NON_CATCH_ALL_DOMAINS = new Set<string>([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.es',
  'hotmail.com',
  'hotmail.es',
  'outlook.com',
  'outlook.es',
  'live.com',
  'icloud.com',
  'proton.me',
  'protonmail.com',
]);

// Palabras clave típicas de cuentas de prueba, inventadas o ficticias
const TEST_KEYWORDS = [
  'test',
  'prueba',
  'testing',
  'fake',
  'faker',
  'dummy',
  'sample',
  'ejemplo',
  'demo',
  'cualquiera',
  'cualquiercosa',
  'noexiste',
  'correodeprueba',
  'probando',
  'temporal',
  'tempmail',
  'trash',
  'fakeemail',
  'nonexistent',
  'placeholder',
  'correofalso',
  'inventado',
  'asdf',
  'qwer',
  'zxcv',
];

// Patrones de teclado y secuencias numéricas/alfabéticas sospechosas
const KEYBOARD_WALKS = [
  '12345',
  '123456',
  '1234567',
  '12345678',
  '123456789',
  '987654',
  'qwerty',
  'qwert',
  'asdfgh',
  'asdfg',
  'asdf',
  'zxcvb',
  'zxcvbn',
  'abcdef',
  'qazwsx',
  'wsxedc',
  '123123',
  '112233',
];

/**
 * Calcula entropía de Shannon básica para detectar cadenas aleatorias (gibberish)
 */
function calculateEntropy(str: string): number {
  const len = str.length;
  if (len === 0) return 0;
  const frequencies = new Map<string, number>();
  for (const char of str) {
    frequencies.set(char, (frequencies.get(char) || 0) + 1);
  }
  let entropy = 0;
  for (const count of frequencies.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

/**
 * Valida reglas estrictas de nombres de usuario específicas de cada proveedor
 */
export function validateProviderSpecificRules(
  localPart: string,
  domain: string
): { pass: boolean; reason?: string } {
  const localLower = localPart.toLowerCase();
  const domainLower = domain.toLowerCase();

  // 1. GMAIL / GOOGLEMAIL
  if (domainLower === 'gmail.com' || domainLower === 'googlemail.com') {
    // Regla 1: Longitud entre 6 y 30 caracteres
    if (localLower.length < 6) {
      return {
        pass: false,
        reason: 'Gmail exige un mínimo de 6 caracteres en el nombre de usuario (RFC válido pero cuenta inexistente en Google)',
      };
    }
    if (localLower.length > 30) {
      return {
        pass: false,
        reason: 'Gmail no permite nombres de usuario superiores a 30 caracteres',
      };
    }

    // Regla 2: Solo caracteres alfanuméricos y puntos (Gmail NO permite guiones ni guión bajo)
    if (!/^[a-z0-9.]+$/.test(localLower)) {
      return {
        pass: false,
        reason: 'Gmail solo permite letras (a-z), números (0-9) y puntos (.) en la dirección. No permite guiones bajos ni símbolos.',
      };
    }

    // Regla 3: No puede empezar ni terminar con punto, ni puntos consecutivos
    if (localLower.startsWith('.') || localLower.endsWith('.') || localLower.includes('..')) {
      return {
        pass: false,
        reason: 'Gmail no permite puntos al inicio, final ni puntos consecutivos',
      };
    }

    // Regla 4 CRÍTICA: Google requiere obligatoriamente al menos una letra (a-z).
    // NO existen cuentas de Gmail compuestas exclusivamente por números (ej. 12347818@gmail.com).
    const hasAtLeastOneLetter = /[a-z]/.test(localLower);
    if (!hasAtLeastOneLetter) {
      return {
        pass: false,
        reason: 'Google requiere al menos una letra (a-z) en la cuenta de Gmail. Una cuenta puramente numérica no puede existir.',
      };
    }
  }

  // 2. YAHOO
  if (domainLower === 'yahoo.com' || domainLower === 'yahoo.es' || domainLower === 'ymail.com') {
    if (localLower.length < 4 || localLower.length > 32) {
      return {
        pass: false,
        reason: 'Yahoo requiere nombres de usuario entre 4 y 32 caracteres',
      };
    }
    if (!/^[a-z]/.test(localLower)) {
      return {
        pass: false,
        reason: 'Las cuentas de Yahoo deben comenzar obligatoriamente con una letra (a-z)',
      };
    }
    if (!/^[a-z0-9_.]+$/.test(localLower)) {
      return {
        pass: false,
        reason: 'Yahoo no permite caracteres especiales distintos de letras, números, puntos o guión bajo',
      };
    }
  }

  // 3. OUTLOOK / HOTMAIL / LIVE / MSN
  if (
    domainLower === 'outlook.com' ||
    domainLower === 'outlook.es' ||
    domainLower === 'hotmail.com' ||
    domainLower === 'hotmail.es' ||
    domainLower === 'live.com' ||
    domainLower === 'msn.com'
  ) {
    if (localLower.length < 3 || localLower.length > 64) {
      return {
        pass: false,
        reason: 'Microsoft requiere nombres de cuenta entre 3 y 64 caracteres',
      };
    }
    if (!/^[a-z0-9]/.test(localLower)) {
      return {
        pass: false,
        reason: 'Las cuentas de Microsoft deben iniciar con una letra o número',
      };
    }
    if (localLower.endsWith('.') || localLower.includes('..')) {
      return {
        pass: false,
        reason: 'Microsoft no permite puntos al final ni consecutivos en el nombre de cuenta',
      };
    }
  }

  // 4. ICLOUD / APPLE
  if (domainLower === 'icloud.com' || domainLower === 'me.com' || domainLower === 'mac.com') {
    if (localLower.length < 3) {
      return {
        pass: false,
        reason: 'Apple iCloud exige nombres de cuenta de al menos 3 caracteres',
      };
    }
    if (!/^[a-z]/.test(localLower)) {
      return {
        pass: false,
        reason: 'Las cuentas de Apple iCloud deben iniciar con una letra',
      };
    }
  }

  return { pass: true };
}

/**
 * Detecta patrones de prueba, palabras clave ficticias, secuencias de teclado o caracteres arbitrarios
 */
export function detectSuspiciousPatterns(localPart: string): { isSuspicious: boolean; reason?: string } {
  const clean = localPart.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (!clean) {
    return { isSuspicious: true, reason: 'Identificador vacío o solo caracteres especiales' };
  }

  // 1. Detección de palabras clave obvias de prueba o cuentas simuladas
  for (const kw of TEST_KEYWORDS) {
    if (clean === kw || clean.startsWith(kw) || clean.endsWith(kw)) {
      return {
        isSuspicious: true,
        reason: `Contiene término de prueba o ficticio ("${kw}")`,
      };
    }
  }

  // 2. Coincidencia con secuencias de teclado obvias (ej. asdfgh, qwerty, 123456)
  for (const walk of KEYBOARD_WALKS) {
    if (clean.includes(walk)) {
      return {
        isSuspicious: true,
        reason: `Contiene secuencia de teclado de prueba ("${walk}")`,
      };
    }
  }

  // 3. Repetición excesiva de un solo caracter (ej. aaaaa, 11111)
  if (/([a-z0-9])\1{3,}/.test(clean)) {
    return {
      isSuspicious: true,
      reason: 'Caracteres repetitivos idénticos consecutivos (patrón no orgánico)',
    };
  }

  // 4. Cadena sin vocales de longitud >= 5 (gibberish/consonant cluster)
  if (clean.length >= 5 && !/[aeiouy]/.test(clean)) {
    return {
      isSuspicious: true,
      reason: 'Nombre de usuario sin vocales (probable texto generado al azar o bot)',
    };
  }

  // 5. Clúster excesivo de consonantes seguidas (ej. zxcvbn, dfghjk)
  if (/[bcdfghjklmnpqrstvwxz]{6,}/i.test(clean)) {
    return {
      isSuspicious: true,
      reason: 'Secuencia no pronunciable de consonantes continuas (gibberish detectado)',
    };
  }

  // 6. Cuentas puramente numéricas de 6+ dígitos con patrones secuenciales o repetitivos
  if (/^\d{6,}$/.test(clean)) {
    const isSequential = '01234567890123456789'.includes(clean) || '98765432109876543210'.includes(clean);
    if (isSequential) {
      return {
        isSuspicious: true,
        reason: 'Secuencia puramente numérica progresiva de prueba',
      };
    }
  }

  // 7. Entropía excesiva en cadenas de longitud media/alta
  if (clean.length >= 12 && calculateEntropy(clean) > 3.4) {
    return {
      isSuspicious: true,
      reason: 'Alta aleatoriedad de caracteres (probable identificador sintético o hash)',
    };
  }

  return { isSuspicious: false };
}

/**
 * Consulta pública de perfil Gravatar (verificación de buzón real sin enviar correo)
 */
export async function checkGravatarProfile(email: string, timeoutMs = 2000): Promise<boolean> {
  try {
    const hash = crypto.createHash('md5').update(email.toLowerCase().trim()).digest('hex');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const resp = await fetch(`https://en.gravatar.com/${hash}.json`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'CleanMail-Verifier/2.5',
      },
    });
    clearTimeout(timeout);

    return resp.status === 200;
  } catch {
    return false;
  }
}

/**
 * Consulta API pública de Disify para metadatos de entregabilidad
 */
export async function checkDisifyPublic(email: string, timeoutMs = 2500): Promise<{
  disposable?: boolean;
  dns?: boolean;
  confidence?: number;
} | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const resp = await fetch(`https://disify.com/api/email/${encodeURIComponent(email)}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (resp.ok) {
      const data = await resp.json() as {
        disposable?: boolean;
        dns?: boolean;
        confidence?: number;
      };
      return data;
    }
  } catch {
    // Si falla por timeout, continuar con validaciones locales
  }
  return null;
}
