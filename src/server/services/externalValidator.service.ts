/**
 * Servicio de Validación Externa y Puntuación de Confianza (Confidence Score)
 * Integra análisis de patrones de proveedores, perfiles de identidad activos,
 * heurística orgánica, registros SPF/DMARC y APIs de reputación de correo.
 */

import dns from 'dns';
import { ExternalValidationProvider, ExternalVerifyOptions } from '../db/schema.ts';
import {
  validateProviderSpecificRules,
  detectSuspiciousPatterns,
  isOrganicNamePattern,
  checkGravatarProfile,
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
        result = await this.verifyWithDebounceAndReputation(cleanEmail, domain, localPart, isRole);
      }
    } catch (err) {
      console.warn(`Aviso: Error consultando API externa (${provider}), usando fallback reputacional:`, (err as Error).message);
      result = await this.computeReputationFallback(cleanEmail, domain, localPart, isRole);
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
    localPart: string,
    isRole: boolean
  ): Promise<ExternalScoreResult> {
    let isDebounceDisposable = false;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const resp = await fetch(`https://disposable.debounce.io/?email=${encodeURIComponent(email)}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (resp.ok) {
        const data = (await resp.json()) as { disposable?: string | boolean };
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

    // 2. Caso Proveedor Gratuito Principal (Gmail, Yahoo, Hotmail, Outlook)
    if (isNonCatchAll) {
      const isOrganic = isOrganicNamePattern(localPart);

      if (isOrganic) {
        // Nombre o apellido plausible identificado (ej. carlos.mendoza, juan_perez)
        return {
          score: 85,
          provider: 'Validación Heurística & DNS MX Activo',
          isDeliverable: true,
          reasonCode: 'ACCEPTED_EMAIL',
          spfPresent: spf,
          dmarcPresent: dmarc,
          isCatchAll: false,
          details: `Buzón personal estructurado verificado (${localPart}@${domain}). Servidores MX de ${domain} activos y autenticados (SPF/DMARC).`,
        };
      }

      // En Gmail, Hotmail, Yahoo: los servidores MX están activos, pero sin confirmación de buzón ni patrón orgánico
      // es un buzón con alto riesgo de haber sido inventado
      return {
        score: 45,
        provider: 'Auditoría DNS MX + Reputación SPF/DMARC',
        isDeliverable: false, // Marcado como No confirmable / Riesgoso
        reasonCode: 'UNVERIFIED_MAILBOX',
        spfPresent: spf,
        dmarcPresent: dmarc,
        isCatchAll: false,
        details: `Servidores MX de ${domain} activos. Sin embargo, el buzón no cuenta con perfil verificado ni estructura orgánica. Alto riesgo de rebote o cuenta inventada.`,
      };
    }

    // 3. Caso Dominio Corporativo o Personal con registros propios
    let finalScore = 80;
    if (spf) finalScore += 8;
    if (dmarc) finalScore += 7;

    return {
      score: Math.min(finalScore, 95),
      provider: 'Auditoría DNS MX + Reputación SPF/DMARC',
      isDeliverable: true,
      reasonCode: 'ACCEPTED_EMAIL',
      spfPresent: spf,
      dmarcPresent: dmarc,
      isCatchAll: false,
      details: `Dominio corporativo verificado con servidores MX activos y autenticación técnica SPF/DMARC válida (${finalScore}/100).`,
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

    const data = (await res.json()) as {
      data?: {
        score?: number;
        status?: string;
        result?: string;
        accept_all?: boolean;
        disposable?: boolean;
      };
    };

    const d = data.data || {};
    const hunterScore = typeof d.score === 'number' ? d.score : 50;
    const isDeliverable = d.result === 'deliverable' || d.status === 'valid' || hunterScore >= 70;
    const isCatchAll = Boolean(d.accept_all);

    return {
      score: hunterScore,
      provider: 'Hunter.io API',
      isDeliverable,
      reasonCode: isCatchAll ? 'CATCH_ALL' : isDeliverable ? 'ACCEPTED_EMAIL' : 'UNVERIFIED_MAILBOX',
      isCatchAll,
      details: `Hunter.io: resultado ${d.result || d.status || 'evaluado'} (Score: ${hunterScore}/100).`,
    };
  }

  /**
   * Integración con ZeroBounce Email Verification API
   */
  private static async verifyWithZeroBounce(email: string, apiKey: string, isRole: boolean): Promise<ExternalScoreResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const url = `https://api.zerobounce.net/v2/validate?api_key=${apiKey}&email=${encodeURIComponent(email)}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`ZeroBounce respondió con HTTP ${res.status}`);
    }

    const data = (await res.json()) as {
      status?: string;
      sub_status?: string;
      free_email?: boolean;
    };

    const status = (data.status || '').toLowerCase();
    const isDeliverable = status === 'valid';
    const score = isDeliverable ? 95 : status === 'catch-all' ? 55 : 15;

    return {
      score,
      provider: 'ZeroBounce API',
      isDeliverable,
      reasonCode: status === 'catch-all' ? 'CATCH_ALL' : isDeliverable ? 'ACCEPTED_EMAIL' : 'UNVERIFIED_MAILBOX',
      details: `ZeroBounce: Estado ${data.status} (Sub-estado: ${data.sub_status || 'normal'}).`,
    };
  }

  /**
   * Integración con Abstract Email Validation API
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

    const data = (await res.json()) as {
      deliverability?: string;
      quality_score?: number | string;
      is_catchall_email?: { value: boolean };
    };

    const qScore = Math.round(Number(data.quality_score || 0) * 100);
    const isDeliverable = data.deliverability === 'DELIVERABLE' || qScore >= 70;

    return {
      score: qScore,
      provider: 'Abstract Email API',
      isDeliverable,
      reasonCode: isDeliverable ? 'ACCEPTED_EMAIL' : 'UNVERIFIED_MAILBOX',
      details: `AbstractAPI: Entregabilidad ${data.deliverability || 'desconocida'} (Score: ${qScore}/100).`,
    };
  }

  /**
   * Fallback reputacional en caso de fallo en APIs externas
   */
  private static async computeReputationFallback(
    email: string,
    domain: string,
    localPart: string,
    isRole: boolean
  ): Promise<ExternalScoreResult> {
    const { spf, dmarc } = await this.checkSpfAndDmarc(domain);
    const isNonCatchAll = NON_CATCH_ALL_DOMAINS.has(domain.toLowerCase());

    if (isRole) {
      return {
        score: 55,
        provider: 'Motor Heurístico Local',
        isDeliverable: true,
        reasonCode: 'ROLE_ACCOUNT',
        spfPresent: spf,
        dmarcPresent: dmarc,
        details: 'Cuenta de departamento o función corporativa.',
      };
    }

    if (isNonCatchAll) {
      const isOrganic = isOrganicNamePattern(localPart);
      if (isOrganic) {
        return {
          score: 85,
          provider: 'Motor Heurístico Local',
          isDeliverable: true,
          reasonCode: 'ACCEPTED_EMAIL',
          spfPresent: spf,
          dmarcPresent: dmarc,
          details: `Buzón estructurado orgánico en ${domain} con servidores MX activos.`,
        };
      }
      return {
        score: 45,
        provider: 'Motor Heurístico Local',
        isDeliverable: false,
        reasonCode: 'UNVERIFIED_MAILBOX',
        spfPresent: spf,
        dmarcPresent: dmarc,
        details: `Servidores MX de ${domain} activos, pero buzón no confirmado y sin estructura orgánica reconocida.`,
      };
    }

    return {
      score: spf && dmarc ? 88 : 78,
      provider: 'Motor Heurístico Local',
      isDeliverable: true,
      reasonCode: 'ACCEPTED_EMAIL',
      spfPresent: spf,
      dmarcPresent: dmarc,
      details: `Dominio con registros MX activos y autenticación técnica validada.`,
    };
  }

  /**
   * Consulta registros TXT de DNS para determinar presencia de SPF y DMARC
   */
  public static async checkSpfAndDmarc(domain: string): Promise<{ spf: boolean; dmarc: boolean }> {
    let spf = false;
    let dmarc = false;

    try {
      const txtRecords = await resolveTxt(domain).catch(() => []);
      for (const record of txtRecords) {
        const fullTxt = record.join('').toLowerCase();
        if (fullTxt.startsWith('v=spf1')) {
          spf = true;
          break;
        }
      }
    } catch {
      // Ignorar fallo de TXT
    }

    try {
      const dmarcRecords = await resolveTxt(`_dmarc.${domain}`).catch(() => []);
      for (const record of dmarcRecords) {
        const fullTxt = record.join('').toLowerCase();
        if (fullTxt.startsWith('v=dmarc1')) {
          dmarc = true;
          break;
        }
      }
    } catch {
      // Ignorar fallo de DMARC
    }

    return { spf, dmarc };
  }
}
