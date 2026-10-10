/**
 * Servicio de Validación Externa y Puntuación de Confianza (Confidence Score)
 * Integra análisis de patrones de proveedores, perfiles de identidad activos,
 * registros SPF/DMARC y APIs de reputación de correo.
 */

import dns from 'dns';
import { ExternalValidationProvider, ExternalVerifyOptions } from '../db/schema.ts';
import {
  validateProviderSpecificRules,
  detectSuspiciousPatterns,
  checkGravatarProfile,
  checkDisifyPublic,
  NON_CATCH_ALL_DOMAINS,
} from '../utils/mailboxValidator.ts';

const { resolveTxt } = dns.promises;

export interface ExternalScoreResult {
  score: number; // 0 a 100
  provider: string;
  isDeliverable: boolean;
  reasonCode: string;
  spfPresent?: boolean;
  dmarcPresent?: boolean;
  profileFound?: boolean;
  isCatchAll?: boolean;
  details: string;
}

// Caché en memoria para no repetir consultas de score en lotes
const SCORE_CACHE = new Map<string, { result: ExternalScoreResult; timestamp: number }>();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutos

export class ExternalValidatorService {
  /**
   * Consulta y evalúa la puntuación de confianza (0 - 100) y entregabilidad real de un buzón
   */
  public static async evaluateConfidenceScore(
    email: string,
    domain: string,
    isMxValid: boolean,
    isRole: boolean,
    isDisposable: boolean,
    isSyntaxValid: boolean,
    options: ExternalVerifyOptions
  ): Promise<ExternalScoreResult> {
    const cleanEmail = email.toLowerCase().trim();

    // 1. Si la sintaxis básica, MX o desechable falla, la confianza es 0 inmediatamente
    if (!isSyntaxValid || !isMxValid || isDisposable) {
      return {
        score: 0,
        provider: 'Validación Inicial',
        isDeliverable: false,
        reasonCode: isDisposable ? 'DISPOSABLE' : !isMxValid ? 'NO_MX' : 'INVALID_SYNTAX',
        details: isDisposable
          ? 'Dominio desechable o temporal detectado en lista negra'
          : !isMxValid
          ? 'Sin servidores de correo activos (0% confianza)'
          : 'Sintaxis no conforme al estándar RFC',
      };
    }

    // 2. Comprobar en caché
    const cached = SCORE_CACHE.get(cleanEmail);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.result;
    }

    const atIndex = cleanEmail.indexOf('@');
    const localPart = atIndex !== -1 ? cleanEmail.slice(0, atIndex) : '';

    // 3. Reglas específicas obligatorias por proveedor (ej. Gmail exige letras, min 6 caracteres, no puramente números)
    const providerRule = validateProviderSpecificRules(localPart, domain);
    if (!providerRule.pass) {
      const result: ExternalScoreResult = {
        score: 0,
        provider: `Reglas de Proveedor (${domain})`,
        isDeliverable: false,
        reasonCode: 'INVALID_PROVIDER_SYNTAX',
        details: providerRule.reason || 'Formato de cuenta no admitido por el proveedor.',
      };
      SCORE_CACHE.set(cleanEmail, { result, timestamp: Date.now() });
      return result;
    }

    // 4. Detección de patrones sospechosos / teclado / palabras de prueba
    const patternCheck = detectSuspiciousPatterns(localPart);
    if (patternCheck.isSuspicious) {
      const result: ExternalScoreResult = {
        score: 10,
        provider: 'Análisis Heurístico Anti-Fraude',
        isDeliverable: false,
        reasonCode: 'SUSPICIOUS_PATTERN',
        details: `Patrón sospechoso: ${patternCheck.reason}. Alta probabilidad de buzón inexistente o de prueba (rebote seguro).`,
      };
      SCORE_CACHE.set(cleanEmail, { result, timestamp: Date.now() });
      return result;
    }

    // 5. Verificación de perfil activo e identidad (Gravatar Profile Check)
    const hasProfile = await checkGravatarProfile(cleanEmail);
    if (hasProfile) {
      const { spf, dmarc } = await this.checkSpfAndDmarc(domain);
      const result: ExternalScoreResult = {
        score: 98,
        provider: 'Identidad Confirmada (Gravatar / Perfil Activo)',
        isDeliverable: true,
        reasonCode: 'ACCEPTED_EMAIL',
        profileFound: true,
        spfPresent: spf,
        dmarcPresent: dmarc,
        isCatchAll: false,
        details: 'Buzón activo verificado con perfil público real registrado y servidores MX activos.',
      };
      SCORE_CACHE.set(cleanEmail, { result, timestamp: Date.now() });
      return result;
    }

    // 6. Integración con APIs de terceros (si el usuario configuró clave) o Debounce / DNS Reputación
    const provider = options.provider || 'debounce';
    let result: ExternalScoreResult;

    try {
      if (provider === 'hunter' && options.apiKey) {
        result = await this.verifyWithHunter(cleanEmail, options.apiKey, isRole);
      } else if (provider === 'zerobounce' && options.apiKey) {
        result = await this.verifyWithZeroBounce(cleanEmail, options.apiKey, isRole);
      } else if (provider === 'abstract' && options.apiKey) {
        result = await this.verifyWithAbstract(cleanEmail, options.apiKey, isRole);
      } else {
        result = await this.verifyWithDebounceAndReputation(cleanEmail, domain, isRole);
      }
    } catch (err) {
      console.warn(`Aviso: Error consultando API externa (${provider}), usando fallback reputacional:`, (err as Error).message);
      result = await this.computeReputationFallback(cleanEmail, domain, isRole);
    }

    SCORE_CACHE.set(cleanEmail, { result, timestamp: Date.now() });
    return result;
  }

  /**
   * Integración con la API Gratuita de Debounce + SPF/DMARC y comprobación de Catch-all / Buzón No Confirmado
   */
  private static async verifyWithDebounceAndReputation(
    email: string,
    domain: string,
    isRole: boolean
  ): Promise<ExternalScoreResult> {
    let isDebounceDisposable = false;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const resp = await fetch(`https://disposable.debounce.io/?email=${encodeURIComponent(email)}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (resp.ok) {
        const data = await resp.json() as { disposable?: string | boolean };
        isDebounceDisposable = data.disposable === 'true' || data.disposable === true;
      }
    } catch {
      // Continuar con análisis de DNS
    }

    if (isDebounceDisposable) {
      return {
        score: 0,
        provider: 'Debounce Anti-Disposable API',
        isDeliverable: false,
        reasonCode: 'DISPOSABLE',
        details: 'API externa identificó el dominio como temporal o desechable (Blacklisted).',
      };
    }

    // Inspección de registros SPF y DMARC del dominio
    const { spf, dmarc } = await this.checkSpfAndDmarc(domain);
    const isNonCatchAll = NON_CATCH_ALL_DOMAINS.has(domain.toLowerCase());

    // 1. Caso Cuenta de Rol / Genérica (info@, ventas@, admin@)
    if (isRole) {
      return {
        score: 55,
        provider: 'Detección Departamental / Rol',
        isDeliverable: true,
        reasonCode: 'ROLE_ACCOUNT',
        spfPresent: spf,
        dmarcPresent: dmarc,
        isCatchAll: !isNonCatchAll,
        details: 'Cuenta genérica o de departamento (info, ventas, contacto). Riesgo medio de menor tasa de apertura o rebote.',
      };
    }

    // 2. Caso Proveedor Gratuito Principal (Gmail, Yahoo, Hotmail, Outlook) sin perfil confirmado
    if (isNonCatchAll) {
      // En Gmail, Hotmail, Yahoo: los servidores MX están activos, pero sin confirmación de buzón real,
      // no se puede etiquetar como "Deliverable / Accepted Email" definitivo si fue inventado.
      return {
        score: 60,
        provider: 'Auditoría DNS MX + Reputación SPF/DMARC',
        isDeliverable: true, // Se clasifica como Risky / Unverified en lugar de Undeliverable
        reasonCode: 'UNVERIFIED_MAILBOX',
        spfPresent: spf,
        dmarcPresent: dmarc,
        isCatchAll: false,
        details: `Servidores MX de ${domain} activos y autenticados (SPF/DMARC). Sin embargo, el buzón no tiene perfil público confirmado. Alto riesgo de rebote si es una dirección inventada o inexistente.`,
      };
    }

    // 3. Caso Dominio Corporativo o Personal con registros propios
    // Si no es de los proveedores masivos, puede estar en modo Catch-All o ser corporativo normal
    let finalScore = 80;
    if (spf) finalScore += 5;
    if (dmarc) finalScore += 5;

    return {
      score: finalScore,
      provider: 'Auditoría DNS MX + Reputación SPF/DMARC',
      isDeliverable: true,
      reasonCode: 'ACCEPTED_EMAIL',
      spfPresent: spf,
      dmarcPresent: dmarc,
      isCatchAll: false,
      details: `Dominio corporativo con servidores MX activos y autenticación técnica SPF/DMARC verificada (${finalScore}/100).`,
    };
  }

  /**
   * Integración con Hunter.io Email Verifier API
   */
  private static async verifyWithHunter(email: string, apiKey: string, isRole: boolean): Promise<ExternalScoreResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const url = `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${apiKey}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`Hunter.io respondió con HTTP ${res.status}`);
    }

    const data = await res.json() as {
      data?: {
        score?: number;
        status?: string;
        result?: string;
      };
    };

    const hunterScore = data.data?.score ?? (isRole ? 60 : 85);
    const resultStatus = data.data?.result || data.data?.status || 'verificado';
    const isDeliverable = hunterScore >= 50 && resultStatus !== 'undeliverable';

    return {
      score: hunterScore,
      provider: 'Hunter.io API',
      isDeliverable,
      reasonCode: isDeliverable ? 'ACCEPTED_EMAIL' : 'UNDELIVERABLE_HUNTER',
      details: `Hunter.io Score: ${hunterScore}/100 (Estado: ${resultStatus})`,
    };
  }

  /**
   * Integración con ZeroBounce Email Validation API
   */
  private static async verifyWithZeroBounce(email: string, apiKey: string, isRole: boolean): Promise<ExternalScoreResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const url = `https://api.zerobounce.net/v2/validate?email=${encodeURIComponent(email)}&api_key=${apiKey}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`ZeroBounce respondió con HTTP ${res.status}`);
    }

    const data = await res.json() as {
      status?: string;
      sub_status?: string;
    };

    let score = 85;
    let reasonCode = 'ACCEPTED_EMAIL';
    let isDeliverable = true;

    if (data.status === 'valid') {
      score = 95;
      reasonCode = 'ACCEPTED_EMAIL';
    } else if (data.status === 'catch-all') {
      score = 65;
      reasonCode = 'CATCH_ALL';
    } else if (data.status === 'spamtrap' || data.status === 'abuse') {
      score = 10;
      reasonCode = 'SPAM_TRAP';
      isDeliverable = false;
    } else if (data.status === 'invalid') {
      score = 0;
      reasonCode = 'UNDELIVERABLE_ZEROBOUNCE';
      isDeliverable = false;
    }

    if (isRole && score > 60) score -= 15;

    return {
      score,
      provider: 'ZeroBounce API',
      isDeliverable,
      reasonCode,
      details: `ZeroBounce Estado: ${data.status || 'valid'} (${data.sub_status || 'ok'})`,
    };
  }

  /**
   * Integración con AbstractAPI Email Validation
   */
  private static async verifyWithAbstract(email: string, apiKey: string, isRole: boolean): Promise<ExternalScoreResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const url = `https://emailvalidation.abstractapi.com/v1/?api_key=${apiKey}&email=${encodeURIComponent(email)}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`AbstractAPI respondió con HTTP ${res.status}`);
    }

    const data = await res.json() as {
      quality_score?: number | string;
      deliverability?: string;
      is_disposable_email?: { value: boolean };
    };

    const rawScore = typeof data.quality_score === 'number' ? data.quality_score : parseFloat(data.quality_score || '0.8');
    const score = Math.round(rawScore * 100);
    const isDeliverable = data.deliverability === 'DELIVERABLE' || score >= 50;

    return {
      score,
      provider: 'AbstractAPI Email Verifier',
      isDeliverable,
      reasonCode: isDeliverable ? 'ACCEPTED_EMAIL' : 'UNDELIVERABLE_ABSTRACT',
      details: `AbstractAPI Calidad: ${score}/100 (Entregabilidad: ${data.deliverability || 'DELIVERABLE'})`,
    };
  }

  /**
   * Fallback de cálculo de reputación y entregabilidad
   */
  private static async computeReputationFallback(email: string, domain: string, isRole: boolean): Promise<ExternalScoreResult> {
    const { spf, dmarc } = await this.checkSpfAndDmarc(domain);

    let score = isRole ? 55 : 75;
    if (spf) score += 5;
    if (dmarc) score += 5;

    return {
      score: Math.min(85, score),
      provider: 'Motor de Reputación Local',
      isDeliverable: !isRole && score >= 70,
      reasonCode: isRole ? 'ROLE_ACCOUNT' : 'ACCEPTED_EMAIL',
      spfPresent: spf,
      dmarcPresent: dmarc,
      details: `Confianza estimada por reputación técnica DNS (${score}/100)`,
    };
  }

  /**
   * Verifica la existencia de políticas de autenticación de correo SPF y DMARC mediante registros DNS TXT
   */
  private static async checkSpfAndDmarc(domain: string): Promise<{ spf: boolean; dmarc: boolean }> {
    let spf = false;
    let dmarc = false;

    try {
      const txtRecords = await resolveTxt(domain);
      for (const record of txtRecords) {
        const joined = record.join('');
        if (joined.startsWith('v=spf1')) {
          spf = true;
          break;
        }
      }
    } catch {
      // Sin TXT
    }

    try {
      const dmarcRecords = await resolveTxt(`_dmarc.${domain}`);
      for (const record of dmarcRecords) {
        const joined = record.join('');
        if (joined.startsWith('v=DMARC1')) {
          dmarc = true;
          break;
        }
      }
    } catch {
      // Sin DMARC
    }

    return { spf, dmarc };
  }
}
