import { db } from '../db/database.ts';
import {
  Correo,
  EstadoEmail,
  TipoEmail,
  UploadProcessSummary,
  EmailFilterOptions,
  ExternalVerifyOptions,
} from '../db/schema.ts';
import { validateEmailSyntax } from '../utils/regexValidator.ts';
import { correctEmailTypo } from '../utils/typoCorrector.ts';
import { isDisposableDomain } from '../utils/disposableCheck.ts';
import { isRoleAccount, determineEmailType } from '../utils/roleDetector.ts';
import { verifyDomainMx } from '../utils/dnsValidator.ts';
import {
  validateProviderSpecificRules,
  detectSuspiciousPatterns,
} from '../utils/mailboxValidator.ts';
import { ExternalValidatorService } from './externalValidator.service.ts';

export class EmailService {
  /**
   * Procesa y valida un lote de correos para una categoría específica,
   * incluyendo opcionalmente la consulta a API externa de confianza.
   */
  public static async processEmailBatch(
    categoria_id: string,
    rawEmails: string[],
    options: {
      checkDns?: boolean;
      autoCorrect?: boolean;
      externalVerify?: ExternalVerifyOptions;
    } = { checkDns: true, autoCorrect: true }
  ): Promise<UploadProcessSummary> {
    const startTime = Date.now();
    const category = db.getCategoryById(categoria_id);
    if (!category) {
      throw new Error(`La categoría con ID "${categoria_id}" no existe.`);
    }

    const existingInDb = db.getExistingEmailsSet(categoria_id);
    const seenInBatch = new Set<string>();

    const toInsert: Omit<Correo, 'id' | 'fecha_creacion'>[] = [];
    let duplicadosCount = 0;

    // Procesar en chunks concurrentes
    const CHUNK_SIZE = 12;
    for (let i = 0; i < rawEmails.length; i += CHUNK_SIZE) {
      const chunk = rawEmails.slice(i, i + CHUNK_SIZE);

      await Promise.all(
        chunk.map(async (rawItem) => {
          if (!rawItem || typeof rawItem !== 'string') return;
          const trimmedRaw = rawItem.trim();
          if (!trimmedRaw) return;

          let candidateEmail = trimmedRaw;
          let wasCorrected = false;
          let typoObservation = '';

          // 1. Corrección automática de dominios con errores tipográficos comunes
          if (options.autoCorrect !== false) {
            const typoRes = correctEmailTypo(candidateEmail);
            if (typoRes.hasTypo) {
              candidateEmail = typoRes.correctedEmail;
              wasCorrected = true;
              typoObservation = typoRes.observation || '';
            }
          }

          const normalizedEmail = candidateEmail.toLowerCase().trim();

          // 2. Eliminación de duplicados por categoría
          if (existingInDb.has(normalizedEmail) || seenInBatch.has(normalizedEmail)) {
            duplicadosCount++;
            return;
          }
          seenInBatch.add(normalizedEmail);

          // 3. Validar sintaxis estricta mediante Regex
          const syntaxRes = validateEmailSyntax(normalizedEmail);
          if (!syntaxRes.isValid || !syntaxRes.domain || !syntaxRes.localPart) {
            toInsert.push({
              categoria_id,
              email: normalizedEmail,
              original_email: trimmedRaw,
              estado: 'INVALIDO',
              tipo: 'Personal',
              dominio: normalizedEmail.includes('@') ? normalizedEmail.split('@')[1] : 'desconocido',
              observacion: syntaxRes.reason || 'Sintaxis de correo inválida',
              mx_valido: false,
              corregido: wasCorrected,
              score_confianza: 0,
              verificado_externo: false,
              fuente_verificacion: 'Local (Sintaxis Fallida)',
            });
            return;
          }

          const { domain, localPart } = syntaxRes;

          // 4. Detección y filtrado de dominios de correos temporales/desechables
          const isDisposableLocal = isDisposableDomain(domain);
          if (isDisposableLocal) {
            toInsert.push({
              categoria_id,
              email: normalizedEmail,
              original_email: trimmedRaw,
              estado: 'INVALIDO',
              tipo: 'Personal',
              dominio: domain,
              observacion: 'Dominio temporal / desechable bloqueado (anti-spam)',
              mx_valido: false,
              corregido: wasCorrected,
              score_confianza: 0,
              verificado_externo: false,
              fuente_verificacion: 'Lista Negra Local',
            });
            return;
          }

          // 4.1 Validación de reglas de proveedor (ej. Gmail < 6 letras o números exclusivos)
          const providerRule = validateProviderSpecificRules(localPart, domain);
          if (!providerRule.pass) {
            toInsert.push({
              categoria_id,
              email: normalizedEmail,
              original_email: trimmedRaw,
              estado: 'INVALIDO',
              tipo: 'Personal',
              dominio: domain,
              observacion: `Rechazado por proveedor (${domain}): ${providerRule.reason}`,
              mx_valido: false,
              corregido: wasCorrected,
              score_confianza: 0,
              verificado_externo: false,
              fuente_verificacion: `Reglas Proveedor (${domain})`,
            });
            return;
          }

          // 4.2 Detección de patrones de prueba, secuencias y teclado
          const patternCheck = detectSuspiciousPatterns(localPart);
          if (patternCheck.isSuspicious) {
            toInsert.push({
              categoria_id,
              email: normalizedEmail,
              original_email: trimmedRaw,
              estado: 'INVALIDO',
              tipo: 'Personal',
              dominio: domain,
              observacion: `Patrón sospechoso o ficticio: ${patternCheck.reason}`,
              mx_valido: false,
              corregido: wasCorrected,
              score_confianza: 10,
              verificado_externo: false,
              fuente_verificacion: 'Filtro Anti-Fraude Local',
            });
            return;
          }

          // 5. Identificación de correos de rol/genéricos (info@, ventas@, contacto@, admin@, etc.)
          const isRole = isRoleAccount(localPart);
          const tipoEmail: TipoEmail = determineEmailType(domain, isRole);

          let estado: EstadoEmail = isRole ? 'GENERICO_ROL' : 'VALIDO';
          let observacion = isRole
            ? `Cuenta genérica o departamental (${localPart}@)`
            : 'Sintaxis correcta y verificado';

          if (wasCorrected) {
            observacion = `${typoObservation}. ${observacion}`;
          }

          // 6. Verificación de registros DNS MX (usando el módulo nativo 'dns' de Node.js)
          let mxValido = false;
          if (options.checkDns !== false) {
            const dnsRes = await verifyDomainMx(domain);
            mxValido = dnsRes.hasMx;

            if (!dnsRes.hasMx) {
              estado = 'INVALIDO';
              observacion = `Servidores MX inactivos: ${dnsRes.observation}`;
            } else {
              observacion += ` [MX: ${dnsRes.observation}]`;
            }
          } else {
            mxValido = true;
          }

          // 7. Puntuación de Confianza Adicional y Evaluación Reputacional
          let scoreConfianza = 80;
          let verificadoExterno = true;
          let fuenteVerificacion = 'Local + DNS MX';

          try {
            const extOptionsToUse: ExternalVerifyOptions = options.externalVerify || {
              enabled: true,
              provider: 'debounce',
            };

            const extRes = await ExternalValidatorService.evaluateConfidenceScore(
              normalizedEmail,
              domain,
              mxValido,
              isRole,
              isDisposableLocal,
              syntaxRes.isValid,
              extOptionsToUse
            );

            scoreConfianza = extRes.score;
            fuenteVerificacion = extRes.provider;

            if (extRes.details) {
              observacion += ` | ${extRes.details}`;
            }

            // Sincronizar estado real estricto según la evaluación
            if (isRole || extRes.reasonCode === 'ROLE_ACCOUNT') {
              estado = 'GENERICO_ROL';
            } else if (extRes.reasonCode === 'UNVERIFIED_MAILBOX' || extRes.isCatchAll) {
              // Buzón no confirmado en proveedor gratuito sin perfil ni nombre orgánico o servidor catch-all
              estado = 'GENERICO_ROL';
            } else if (!extRes.isDeliverable || extRes.score < 40) {
              estado = 'INVALIDO';
            } else if (extRes.isDeliverable && extRes.score >= 75) {
              estado = 'VALIDO';
            } else {
              estado = 'GENERICO_ROL';
            }
          } catch (err) {
            console.warn('Fallo en verificación reputacional para:', normalizedEmail, err);
            if (isRole) {
              estado = 'GENERICO_ROL';
              scoreConfianza = 55;
            } else if (!mxValido) {
              estado = 'INVALIDO';
              scoreConfianza = 0;
            } else {
              estado = 'VALIDO';
              scoreConfianza = 80;
            }
          }

          toInsert.push({
            categoria_id,
            email: normalizedEmail,
            original_email: trimmedRaw,
            estado,
            tipo: tipoEmail,
            dominio: domain,
            observacion,
            mx_valido: mxValido,
            corregido: wasCorrected,
            score_confianza: scoreConfianza,
            verificado_externo: verificadoExterno,
            fuente_verificacion: fuenteVerificacion,
          });
        })
      );
    }

    // Inserción en la base de datos
    const inserted = db.insertEmailsBatch(categoria_id, toInsert);

    const validos = inserted.filter((c) => c.estado === 'VALIDO').length;
    const genericos_rol = inserted.filter((c) => c.estado === 'GENERICO_ROL').length;
    const invalidos = inserted.filter((c) => c.estado === 'INVALIDO').length;
    const corregidos = inserted.filter((c) => c.corregido).length;
    const conVerifExt = inserted.filter((c) => c.verificado_externo).length;

    const totalScore = inserted.reduce((acc, c) => acc + (c.score_confianza || 0), 0);
    const promedioScore = inserted.length > 0 ? Math.round(totalScore / inserted.length) : 0;

    return {
      total_leidos: rawEmails.length,
      validos,
      genericos_rol,
      invalidos,
      corregidos,
      duplicados_omitidos: duplicadosCount,
      con_verificacion_externa: conVerifExt,
      promedio_score: promedioScore,
      tiempo_procesamiento_ms: Date.now() - startTime,
      muestra_procesada: inserted.slice(0, 20),
    };
  }

  /**
   * Consulta correos con filtros y paginación
   */
  public static getEmailsByCategory(categoria_id: string, filters: EmailFilterOptions) {
    return db.getEmailsByCategory(categoria_id, filters);
  }

  /**
   * Genera el contenido CSV exportable para una categoría incluyendo Score de Confianza
   */
  public static generateExportCsv(categoria_id: string, includeRoles = true): string {
    const emails = db.getCleanEmailsForExport(categoria_id, includeRoles);
    const category = db.getCategoryById(categoria_id);
    const catName = category ? category.nombre : 'Sin_Categoria';

    const headers = [
      'Email',
      'Original',
      'Estado',
      'Tipo',
      'Score_Confianza',
      'Verificacion_Externa',
      'Fuente_Verificacion',
      'Dominio',
      'Observacion',
      'Categoria',
      'Fecha_Registro',
    ];

    const rows = emails.map((e) => [
      `"${e.email}"`,
      `"${e.original_email}"`,
      `"${e.estado}"`,
      `"${e.tipo}"`,
      `"${e.score_confianza ?? 0}"`,
      `"${e.verificado_externo ? 'SI' : 'NO'}"`,
      `"${e.fuente_verificacion || 'Local'}"`,
      `"${e.dominio}"`,
      `"${e.observacion.replace(/"/g, '""')}"`,
      `"${catName}"`,
      `"${e.fecha_creacion}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  }

  /**
   * Valida un correo individual en tiempo real incluyendo análisis de API externa
   */
  public static async validateSingleEmail(rawEmail: string, externalOptions?: ExternalVerifyOptions) {
    const trimmed = (rawEmail || '').trim();
    if (!trimmed) {
      throw new Error('El correo no puede estar vacío.');
    }

    const typoRes = correctEmailTypo(trimmed);
    const targetEmail = typoRes.hasTypo ? typoRes.correctedEmail : trimmed;
    const syntaxRes = validateEmailSyntax(targetEmail);

    if (!syntaxRes.isValid || !syntaxRes.domain || !syntaxRes.localPart) {
      return {
        email: targetEmail,
        original_email: trimmed,
        estado: 'INVALIDO',
        tipo: 'Personal',
        dominio: targetEmail.includes('@') ? targetEmail.split('@')[1] : '',
        corregido: typoRes.hasTypo,
        mx_valido: false,
        score_confianza: 0,
        verificado_externo: false,
        fuente_verificacion: 'Local',
        observacion: syntaxRes.reason || 'Sintaxis inválida',
        detalles: {
          sintaxis: false,
          error_sintaxis: syntaxRes.reason,
          desechable: false,
          es_rol: false,
          mx: false,
        },
      };
    }

    const { domain, localPart } = syntaxRes;
    const isDisposable = isDisposableDomain(domain);
    const isRole = isRoleAccount(localPart);
    const tipo = determineEmailType(domain, isRole);

    let mxResult = { hasMx: false, observation: '' };
    if (!isDisposable) {
      mxResult = await verifyDomainMx(domain);
    }

    // Reglas de sintaxis específicas del proveedor y análisis anti-fraude
    const providerRule = validateProviderSpecificRules(localPart, domain);
    const patternCheck = detectSuspiciousPatterns(localPart);

    // Evaluación Externa y reputacional
    const extOptionsToUse: ExternalVerifyOptions = externalOptions || { enabled: true, provider: 'debounce' };
    const extEval = await ExternalValidatorService.evaluateConfidenceScore(
      targetEmail,
      domain,
      mxResult.hasMx,
      isRole,
      isDisposable,
      syntaxRes.isValid,
      extOptionsToUse
    );

    let estado: EstadoEmail = 'VALIDO';
    let observacion = '';

    if (isDisposable) {
      estado = 'INVALIDO';
      observacion = 'Dominio de correo temporal o desechable bloqueado.';
    } else if (!mxResult.hasMx) {
      estado = 'INVALIDO';
      observacion = `Servidores MX inactivos: ${mxResult.observation}`;
    } else if (!providerRule.pass) {
      estado = 'INVALIDO';
      observacion = `Rechazado por regla del proveedor (${domain}): ${providerRule.reason}`;
    } else if (patternCheck.isSuspicious) {
      estado = 'INVALIDO';
      observacion = `Patrón sospechoso o de prueba: ${patternCheck.reason}`;
    } else if (isRole || extEval.reasonCode === 'ROLE_ACCOUNT') {
      estado = 'GENERICO_ROL';
      observacion = `Cuenta de rol o departamental (${localPart}@). ${extEval.details}`;
    } else if (extEval.reasonCode === 'UNVERIFIED_MAILBOX' || extEval.isCatchAll) {
      // Estado de riesgo (Buzón no confirmado en proveedor sin perfil o servidor Catch-All)
      estado = 'GENERICO_ROL';
      observacion = extEval.details;
    } else if (!extEval.isDeliverable || extEval.score < 35 || extEval.reasonCode.startsWith('UNDELIVERABLE')) {
      estado = 'INVALIDO';
      observacion = `No entregable: ${extEval.details}`;
    } else {
      estado = 'VALIDO';
      observacion = extEval.details || 'Buzón activo verificado y servidores de correo operativos.';
    }

    if (typoRes.hasTypo) {
      observacion = `${typoRes.observation}. ${observacion}`;
    }

    return {
      email: targetEmail,
      original_email: trimmed,
      estado,
      tipo,
      dominio: domain,
      corregido: typoRes.hasTypo,
      mx_valido: mxResult.hasMx,
      score_confianza: extEval.score,
      verificado_externo: true,
      fuente_verificacion: extEval.provider,
      observacion: `${observacion} [Score: ${extEval.score}/100]`,
      detalles: {
        sintaxis: true,
        desechable: isDisposable,
        es_rol: isRole,
        mx: mxResult.hasMx,
        mx_detalle: mxResult.observation,
        score: extEval.score,
        provider: extEval.provider,
        spf: extEval.spfPresent,
        dmarc: extEval.dmarcPresent,
        reasonCode: extEval.reasonCode,
        isCatchAll: Boolean(extEval.isCatchAll),
        mailboxConfirmed: Boolean(extEval.profileFound),
        providerRulesPass: providerRule.pass,
        providerReason: providerRule.reason,
        suspiciousPattern: patternCheck.isSuspicious,
        patternReason: patternCheck.reason,
      },
    };
  }

  public static async updateEmail(
    id: string,
    updates: { email?: string; estado?: EstadoEmail; observacion?: string; reVerify?: boolean }
  ): Promise<Correo | null> {
    const existing = db.getEmailById(id);
    if (!existing) return null;

    if (updates.email && updates.email.trim() !== existing.email && updates.reVerify) {
      const singleRes = await this.validateSingleEmail(updates.email.trim());
      return db.updateEmail(id, {
        email: singleRes.email,
        dominio: singleRes.dominio,
        estado: singleRes.estado as EstadoEmail,
        tipo: singleRes.tipo as TipoEmail,
        mx_valido: singleRes.mx_valido,
        score_confianza: singleRes.score_confianza,
        observacion: updates.observacion || singleRes.observacion,
        corregido: singleRes.corregido,
      });
    }

    return db.updateEmail(id, {
      email: updates.email ? updates.email.trim() : undefined,
      estado: updates.estado,
      observacion: updates.observacion,
    });
  }

  public static deleteEmail(id: string): boolean {
    return db.deleteEmail(id);
  }

  public static deleteEmailsBulk(ids: string[]): number {
    return db.deleteEmailsBulk(ids);
  }

  public static deleteEmailsByFilter(categoria_id: string, filter: 'INVALIDOS' | 'GENERICOS_ROL' | 'ALL'): number {
    return db.deleteEmailsByFilter(categoria_id, filter);
  }

  public static moveEmailsBulk(ids: string[], target_categoria_id: string): number {
    return db.moveEmailsBulk(ids, target_categoria_id);
  }

  public static getGlobalStats() {
    return db.getGlobalStats();
  }
}
