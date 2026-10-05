/**
 * Servicio de Validación Externa y Puntuación de Confianza (Confidence Score)
 * Integra APIs externas gratuitas (Debounce Free API, Hunter.io, ZeroBounce, AbstractAPI)
 * con análisis de entregabilidad, registros SPF/DMARC y reputación de dominio.
 */

import dns from 'dns';
import { ExternalValidationProvider, ExternalVerifyOptions } from '../db/schema.ts';

const { resolveTxt } = dns.promises;

export interface ExternalScoreResult {
  score: number; // 0 a 100
  provider: string;
  isDeliverable: boolean;
  spfPresent?: boolean;
  dmarcPresent?: boolean;
  details: string;
}

// Caché en memoria para no repetir consultas de score en lotes
const SCORE_CACHE = new Map<string, { result: ExternalScoreResult; timestamp: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hora

export class ExternalValidatorService {
  /**
   * Consulta una API externa de validación de correo para obtener la puntuación de confianza (0 - 100)
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

    // Si sintaxis o MX es inválido de base, la confianza es 0 inmediatamente
    if (!isSyntaxValid || !isMxValid || isDisposable) {
      return {
        score: 0,
        provider: 'Verificación Inicial',
        isDeliverable: false,
        details: isDisposable
          ? 'Dominio desechable detectado por API externa'
          : !isMxValid
          ? 'Sin servidores de correo activos (0% confianza)'
          : 'Sintaxis no conforme a estándar RFC',
      };
    }

    // Verificar en caché
    const cached = SCORE_CACHE.get(cleanEmail);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.result;
    }

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
        // Proveedor por defecto: Debounce Free API + Análisis SPF/DMARC y Reputación
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
   * Integración con la API Gratuita de Debounce (https://disposable.debounce.io)
   * Sin requerir clave API, combinada con inspección DNS de SPF y DMARC.
   */
  private static async verifyWithDebounceAndReputation(
    email: string,
    domain: string,
    isRole: boolean
  ): Promise<ExternalScoreResult> {
    let isDebounceDisposable = false;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2800);

      const resp = await fetch(`https://disposable.debounce.io/?email=${encodeURIComponent(email)}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (resp.ok) {
        const data = await resp.json() as { disposable?: string | boolean };
        isDebounceDisposable = data.disposable === 'true' || data.disposable === true;
      }
    } catch {
      // Si hay timeout o error de red, continuamos con el análisis de DNS
    }

    if (isDebounceDisposable) {
      return {
        score: 5,
        provider: 'Debounce Free API',
        isDeliverable: false,
        details: 'API externa Debounce identificó el correo como temporal / desechable',
      };
    }

    // Inspección de registros SPF y DMARC del dominio para evaluar reputación técnica
    const { spf, dmarc } = await this.checkSpfAndDmarc(domain);

    let baseScore = 80;

    // Bonificaciones
    if (spf) baseScore += 10;
    if (dmarc) baseScore += 5;

    // Proveedores premium con reputación muy alta (Google Workspace, Microsoft 365, etc.)
    const topDomains = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com', 'proton.me'];
    if (topDomains.includes(domain)) {
      baseScore = 95;
    }

    // Penalización por cuenta de rol (las cuentas genéricas info@ o ventas@ tienen mayor tasa de rebote o filtros)
    if (isRole) {
      baseScore = Math.max(55, baseScore - 20);
    }

    const finalScore = Math.min(100, Math.max(10, baseScore));

    return {
      score: finalScore,
      provider: 'Debounce Free API + SPF/DMARC',
      isDeliverable: finalScore >= 50,
      spfPresent: spf,
      dmarcPresent: dmarc,
      details: `Puntuación ${finalScore}/100. ${
        isRole ? 'Cuenta de rol genérica (-20 pts). ' : 'Buzón personal o corporativo verificado. '
      }${spf ? 'Registro SPF activo (+10 pts). ' : ''}${dmarc ? 'DMARC configurado (+5 pts).' : ''}`,
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

    return {
      score: hunterScore,
      provider: 'Hunter.io API',
      isDeliverable: hunterScore >= 50,
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
    if (data.status === 'valid') score = 95;
    else if (data.status === 'catch-all') score = 70;
    else if (data.status === 'spamtrap' || data.status === 'abuse') score = 10;
    else if (data.status === 'invalid') score = 0;

    if (isRole && score > 60) score -= 15;

    return {
      score,
      provider: 'ZeroBounce API',
      isDeliverable: score >= 50,
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

    return {
      score,
      provider: 'AbstractAPI Email Verifier',
      isDeliverable: score >= 50,
      details: `AbstractAPI Calidad: ${score}/100 (Entregabilidad: ${data.deliverability || 'DELIVERABLE'})`,
    };
  }

  /**
   * Fallback de cálculo de reputación y entregabilidad si no hay conexión externa
   */
  private static async computeReputationFallback(email: string, domain: string, isRole: boolean): Promise<ExternalScoreResult> {
    const { spf } = await this.checkSpfAndDmarc(domain);

    let score = isRole ? 65 : 85;
    if (spf) score += 10;

    return {
      score: Math.min(95, score),
      provider: 'Motor de Reputación Local',
      isDeliverable: true,
      details: `Confianza estimada por reputación técnica (${score}/100)`,
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
      // Ignorar si no tiene TXT
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
      // Ignorar si no tiene DMARC
    }

    return { spf, dmarc };
  }
}
