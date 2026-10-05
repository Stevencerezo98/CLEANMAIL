/**
 * Verificación de registros DNS MX con el módulo nativo 'dns' de Node.js
 * Incluye caché en memoria para alto rendimiento en procesamiento por lotes.
 */
import dns from 'dns';

const { resolveMx, resolve4 } = dns.promises;

interface DnsCheckResult {
  hasMx: boolean;
  servers: string[];
  observation: string;
}

// Caché en memoria para evitar saturar DNS y acelerar miles de correos del mismo dominio
const DNS_CACHE = new Map<string, { result: DnsCheckResult; timestamp: number }>();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutos

// Dominios populares con MX garantizados
const KNOWN_VALID_DOMAINS = new Set<string>([
  'gmail.com',
  'googlemail.com',
  'hotmail.com',
  'outlook.com',
  'yahoo.com',
  'icloud.com',
  'live.com',
  'protonmail.com',
  'proton.me',
  'aol.com',
  'zoho.com',
]);

function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMessage)), ms)),
  ]);
}

export async function verifyDomainMx(domain: string, timeoutMs = 2500): Promise<DnsCheckResult> {
  const cleanDomain = domain.toLowerCase().trim();

  // 1. Verificación en Dominios Populares Conocidos (optimización instantánea)
  if (KNOWN_VALID_DOMAINS.has(cleanDomain)) {
    return {
      hasMx: true,
      servers: [`mail.${cleanDomain}`],
      observation: `Servidores MX reconocidos para ${cleanDomain}`,
    };
  }

  // 2. Comprobar caché
  const cached = DNS_CACHE.get(cleanDomain);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  try {
    // 3. Consultar registros MX con timeout de 2.5s
    const mxRecords = await withTimeout(
      resolveMx(cleanDomain),
      timeoutMs,
      `Timeout consultando DNS MX para ${cleanDomain}`
    );

    if (mxRecords && mxRecords.length > 0) {
      // Ordenar por prioridad MX
      const sorted = mxRecords.sort((a, b) => a.priority - b.priority);
      const topServers = sorted.map((r) => r.exchange);
      const result: DnsCheckResult = {
        hasMx: true,
        servers: topServers,
        observation: `Servidor MX activo: ${topServers[0]} (prioridad ${sorted[0].priority})`,
      };

      DNS_CACHE.set(cleanDomain, { result, timestamp: Date.now() });
      return result;
    }
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };

    // Si no tiene registro MX (ENODATA o ENOTFOUND), intentar RFC 5321 Fallback a registro A
    if (error.code === 'ENODATA' || error.code === 'ENOTFOUND') {
      try {
        const aRecords = await withTimeout(resolve4(cleanDomain), 1500, 'Timeout en fallback A');
        if (aRecords && aRecords.length > 0) {
          const result: DnsCheckResult = {
            hasMx: true,
            servers: [cleanDomain],
            observation: `Sin registro MX explícito; activo mediante registro A directo (${aRecords[0]})`,
          };
          DNS_CACHE.set(cleanDomain, { result, timestamp: Date.now() });
          return result;
        }
      } catch {
        // Fallback también falló
      }
    }

    const failureReason =
      error.code === 'ENOTFOUND'
        ? `El dominio "${cleanDomain}" no existe en DNS`
        : error.code === 'ENODATA'
        ? `El dominio "${cleanDomain}" no tiene registros de correo (MX)`
        : error.message?.includes('Timeout')
        ? `Tiempo de espera agotado al consultar DNS para "${cleanDomain}"`
        : `Falla en resolución DNS para "${cleanDomain}" (${error.code || 'Error desconocido'})`;

    const failResult: DnsCheckResult = {
      hasMx: false,
      servers: [],
      observation: failureReason,
    };

    DNS_CACHE.set(cleanDomain, { result: failResult, timestamp: Date.now() });
    return failResult;
  }

  const noMxResult: DnsCheckResult = {
    hasMx: false,
    servers: [],
    observation: `No se encontraron registros de servidor de correo para "${cleanDomain}"`,
  };
  DNS_CACHE.set(cleanDomain, { result: noMxResult, timestamp: Date.now() });
  return noMxResult;
}
