/**
 * Validador profundo de buzones, patrones y reglas de proveedores (Gmail, Yahoo, Outlook, etc.)
 * Detecta cuentas ficticias, inventadas, secuencias numéricas, combinaciones de teclado,
 * entropía artificial y valida consistencia orgánica de nombres.
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

// Dominios que NO son Catch-All (rechazan cuentas inexistentes de forma estricta en sus servidores)
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
  'msn.com',
  'icloud.com',
  'proton.me',
  'protonmail.com',
]);

// Palabras clave típicas de cuentas de prueba, inventadas, ficticias o simuladas
const TEST_KEYWORDS = [
  'test',
  'tests',
  'testing',
  'tester',
  'prueba',
  'pruebas',
  'probando',
  'fake',
  'faker',
  'fakeemail',
  'fictici',
  'ficticio',
  'ficticia',
  'dummy',
  'sample',
  'ejemplo',
  'example',
  'demo',
  'cualquiera',
  'cualquiercosa',
  'inventad',
  'inventado',
  'inventada',
  'inventados',
  'aleatori',
  'aleatorio',
  'aleatoria',
  'random',
  'noexiste',
  'nonexistent',
  'correodeprueba',
  'correofalso',
  'sinusuario',
  'sinnombre',
  'nadie',
  'anonim',
  'anonymous',
  'temporal',
  'tempmail',
  'trash',
  'basura',
  'spam',
  'borrar',
  'placeholder',
  'null',
  'void',
  'undefined',
  'asdf',
  'qwer',
  'zxcv',
];

// Patrones de teclado en diferentes filas y sentidos (directo e inverso)
const KEYBOARD_WALKS = [
  // Fila QWERTY
  'qwerty',
  'qwert',
  'ytrewq',
  'poiuy',
  'poiuyt',
  // Fila ASDF
  'asdfgh',
  'asdfg',
  'asdf',
  'hgfdsa',
  'lkjhg',
  'lkjhgf',
  // Fila ZXCV
  'zxcvb',
  'zxcvbn',
  'nbvcxz',
  'mnbvc',
  // Secuencias numéricas
  '12345',
  '123456',
  '1234567',
  '12345678',
  '123456789',
  '98765',
  '987654',
  '98765432',
  '987654321',
  '123123',
  '112233',
  '12341234',
  // Secuencias alfabéticas
  'abcdef',
  'bcdefg',
  'cdefgh',
  'defghi',
  'fedcba',
  // Diagonales de teclado
  'qazwsx',
  'wsxedc',
  'edcrfv',
  'rfvtgb',
];

// Nombres y apellidos comunes orgánicos (para verificar plausibilidad en cuentas personales)
const ORGANIC_NAME_TOKENS = new Set<string>([
  'carlos', 'maria', 'juan', 'jose', 'ana', 'luis', 'pedro', 'david', 'jorge', 'miguel',
  'fernando', 'diego', 'alejandro', 'daniel', 'roberto', 'javier', 'rosa', 'elena', 'laura',
  'marta', 'sandra', 'andres', 'pablo', 'raul', 'sergio', 'alberto', 'enrique', 'victor',
  'manuel', 'francisco', 'antonio', 'gabriel', 'hugo', 'adrian', 'lucas', 'mateo', 'santiago',
  'sebastian', 'camila', 'valentina', 'valeria', 'daniela', 'paula', 'carolina', 'andrea',
  'john', 'michael', 'david', 'james', 'robert', 'mary', 'sarah', 'alex', 'chris', 'mark',
  'steve', 'brian', 'kevin', 'jason', 'paul', 'lisa', 'emily', 'jessica', 'ashley',
  'garcia', 'martinez', 'lopez', 'gonzalez', 'rodriguez', 'perez', 'sanchez', 'ramirez',
  'torres', 'flores', 'rivera', 'gomez', 'diaz', 'cruz', 'morales', 'reyes', 'gutierrez',
  'ortiz', 'ramos', 'castillo', 'smith', 'johnson', 'williams', 'brown', 'jones', 'miller',
  'davis', 'wilson', 'taylor', 'anderson', 'thomas', 'jackson', 'white', 'harris', 'martin',
]);

/**
 * Calcula entropía de Shannon básica para detectar cadenas aleatorias (gibberish/hashes)
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
 * Valida reglas estrictas de nombres de usuario específicas de cada proveedor de correo
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
        reason: 'Gmail exige un mínimo de 6 caracteres en el nombre de usuario (dirección inexistente en Google)',
      };
    }
    if (localLower.length > 30) {
      return {
        pass: false,
        reason: 'Gmail no admite nombres de usuario superiores a 30 caracteres',
      };
    }

    // Regla 2 CRÍTICA: Gmail NO permite guiones ni guión bajo (solo a-z, 0-9 y .)
    if (!/^[a-z0-9.]+$/.test(localLower)) {
      return {
        pass: false,
        reason: 'Gmail solo admite letras (a-z), números (0-9) y puntos (.). No admite guiones bajos (_) ni guiones (-)',
      };
    }

    // Regla 3: No puede empezar ni terminar con punto, ni puntos consecutivos
    if (localLower.startsWith('.') || localLower.endsWith('.') || localLower.includes('..')) {
      return {
        pass: false,
        reason: 'Gmail no permite puntos al inicio, al final ni puntos consecutivos en el nombre de usuario',
      };
    }

    // Regla 4 CRÍTICA: Google requiere obligatoriamente al menos una letra (a-z).
    // NO existen cuentas de Gmail compuestas exclusivamente por números (ej. 12347818@gmail.com).
    const hasAtLeastOneLetter = /[a-z]/.test(localLower);
    if (!hasAtLeastOneLetter) {
      return {
        pass: false,
        reason: 'Google requiere al menos una letra (a-z) en la cuenta de Gmail. Una cuenta puramente numérica no existe.',
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

  // 1. Detección de palabras clave obvias de prueba o cuentas simuladas (como subcadena)
  for (const kw of TEST_KEYWORDS) {
    if (clean.includes(kw)) {
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

  // 3. Repetición excesiva de un solo caracter consecutivo (ej. aaaaa, 11111)
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

  // 5. Clúster excesivo de 4 o más consonantes seguidas sin vocales intermedias
  if (/[bcdfghjklmnpqrstvwxz]{5,}/i.test(clean)) {
    return {
      isSuspicious: true,
      reason: 'Secuencia no pronunciable de consonantes continuas (gibberish detectado)',
    };
  }

  // 6. Cuentas con 5 o más dígitos numéricos finales consecutivos (ej. jhon199928374, test998877)
  const trailingDigitsMatch = clean.match(/(\d{5,})$/);
  if (trailingDigitsMatch) {
    const digits = trailingDigitsMatch[1];
    // Excluir años legítimos (ej. 1980 a 2025 son 4 dígitos, aquí son 5+)
    return {
      isSuspicious: true,
      reason: `Exceso de dígitos aleatorios al final ("${digits}") característico de cuentas falsas o bots`,
    };
  }

  // 7. Cuentas puramente numéricas de 6+ dígitos
  if (/^\d{6,}$/.test(clean)) {
    return {
      isSuspicious: true,
      reason: 'Identificador puramente numérico (cuenta de prueba o sistema)',
    };
  }

  // 8. Entropía artificial en cadenas de alta mezcla de letras y números (hashes o identificadores aleatorios no orgánicos)
  const isOrganic = isOrganicNamePattern(localPart);
  if (!isOrganic) {
    const hasMixedAlphaNum = /[a-z]/.test(clean) && /\d/.test(clean);
    if (clean.length >= 12 && hasMixedAlphaNum && calculateEntropy(clean) > 3.45) {
      return {
        isSuspicious: true,
        reason: 'Alta aleatoriedad de caracteres mixtos (probable identificador sintético o hash generado)',
      };
    }
  }

  return { isSuspicious: false };
}

/**
 * Evalúa si el identificador local parece un nombre/apellido orgánico real
 */
export function isOrganicNamePattern(localPart: string): boolean {
  const parts = localPart.toLowerCase().split(/[._-]/).filter(Boolean);
  if (parts.length === 0) return false;

  for (const part of parts) {
    const lettersOnly = part.replace(/[^a-z]/g, '');
    if (ORGANIC_NAME_TOKENS.has(lettersOnly)) {
      return true;
    }
  }

  // Si tiene formato de nombre y apellido: palabra_letras + . + palabra_letras
  if (parts.length >= 2) {
    const p1 = parts[0].replace(/[^a-z]/g, '');
    const p2 = parts[1].replace(/[^a-z]/g, '');
    if (p1.length >= 3 && p2.length >= 3 && /[aeiouy]/.test(p1) && /[aeiouy]/.test(p2)) {
      return true;
    }
  }

  return false;
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
      const data = (await resp.json()) as {
        disposable?: boolean;
        dns?: boolean;
        confidence?: number;
      };
      return data;
    }
    return null;
  } catch {
    return null;
  }
}
