/**
 * Corrección automática de dominios con errores tipográficos comunes
 */

export interface TypoCorrectionResult {
  hasTypo: boolean;
  originalDomain: string;
  correctedDomain: string;
  correctedEmail: string;
  observation?: string;
}

// Diccionario de errores tipográficos frecuentes
const COMMON_TYPOS: Record<string, string> = {
  // Gmail
  'gmai.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmeil.com': 'gmail.com',
  'gmaik.com': 'gmail.com',
  'gmaio.com': 'gmail.com',
  'gemail.com': 'gmail.com',

  // Hotmail
  'hotmai.com': 'hotmail.com',
  'hotmial.com': 'hotmail.com',
  'hotmal.com': 'hotmail.com',
  'hotmaill.com': 'hotmail.com',
  'hotmeil.com': 'hotmail.com',
  'hormail.com': 'hotmail.com',
  'hotmaol.com': 'hotmail.com',
  'hotmsil.com': 'hotmail.com',
  'hotmail.co': 'hotmail.com',

  // Outlook
  'outlok.com': 'outlook.com',
  'outlokk.com': 'outlook.com',
  'outloo.com': 'outlook.com',
  'outllok.com': 'outlook.com',
  'outloock.com': 'outlook.com',
  'outloook.com': 'outlook.com',
  'autlook.com': 'outlook.com',
  'outlook.co': 'outlook.com',

  // Yahoo
  'yaho.com': 'yahoo.com',
  'yahou.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yhaoo.com': 'yahoo.com',
  'yahoo.co': 'yahoo.com',

  // iCloud / Apple
  'iclou.com': 'icloud.com',
  'icloud.co': 'icloud.com',
  'iclud.com': 'icloud.com',
  'icoud.com': 'icloud.com',

  // ProtonMail
  'protonmai.com': 'protonmail.com',
  'protonmial.com': 'protonmail.com',
  'prontonmail.com': 'protonmail.com',

  // Live / MSN
  'live.co': 'live.com',
  'livecom': 'live.com',
  'msn.co': 'msn.com',
};

const POPULAR_DOMAINS = [
  'gmail.com',
  'hotmail.com',
  'outlook.com',
  'yahoo.com',
  'icloud.com',
  'protonmail.com',
  'live.com',
];

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // sustitución
          matrix[i][j - 1] + 1,     // inserción
          matrix[i - 1][j] + 1      // eliminación
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

export function correctEmailTypo(email: string): TypoCorrectionResult {
  const parts = email.split('@');
  if (parts.length !== 2) {
    return {
      hasTypo: false,
      originalDomain: '',
      correctedDomain: '',
      correctedEmail: email,
    };
  }

  const [localPart, domain] = parts;
  const lowerDomain = domain.toLowerCase().trim();

  // 1. Verificación directa en el diccionario
  if (COMMON_TYPOS[lowerDomain]) {
    const correctedDomain = COMMON_TYPOS[lowerDomain];
    return {
      hasTypo: true,
      originalDomain: lowerDomain,
      correctedDomain,
      correctedEmail: `${localPart}@${correctedDomain}`,
      observation: `Dominio corregido automáticamente de "${lowerDomain}" a "${correctedDomain}"`,
    };
  }

  // 2. Si tiene distancia Levenshtein de 1 respecto a proveedores principales (y no es el mismo)
  for (const popular of POPULAR_DOMAINS) {
    if (lowerDomain !== popular && Math.abs(lowerDomain.length - popular.length) <= 1) {
      const dist = levenshteinDistance(lowerDomain, popular);
      if (dist === 1) {
        return {
          hasTypo: true,
          originalDomain: lowerDomain,
          correctedDomain: popular,
          correctedEmail: `${localPart}@${popular}`,
          observation: `Corrección por similitud tipográfica: "${lowerDomain}" ➔ "${popular}"`,
        };
      }
    }
  }

  return {
    hasTypo: false,
    originalDomain: lowerDomain,
    correctedDomain: lowerDomain,
    correctedEmail: email,
  };
}
