import { db } from '../db/database.ts';
import * as xlsx from 'xlsx';
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
            } else if (!mxValido || !extRes.isDeliverable || extRes.score < 40 || extRes.reasonCode === 'DISPOSABLE' || extRes.reasonCode === 'NO_MX') {
              estado = 'INVALIDO';
            } else {
              estado = 'VALIDO';
            }
          } catch (err) {
            console.warn('Fallo en verificación reputacional para:', normalizedEmail, err);
            if (isRole) {
              estado = 'GENERICO_ROL';
              scoreConfianza = 65;
            } else if (!mxValido) {
              estado = 'INVALIDO';
              scoreConfianza = 0;
            } else {
              estado = 'VALIDO';
              scoreConfianza = 90;
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
   * Genera el contenido CSV exportable para una categoría.
   * Limpia saltos de línea internos, escapa comillas correctamente e incluye sep=;
   * para que Microsoft Excel abra cada columna separada sin juntar nada.
   */
  public static generateExportCsv(
    categoria_id: string,
    scope: 'validos' | 'roles' | 'invalidos' | 'validos_y_roles' | 'all' = 'validos',
    delimiter: ';' | ',' = ';'
  ): string {
    const allEmails = db.getEmailsByCategory(categoria_id, { limit: 100000 }).correos;
    const category = db.getCategoryById(categoria_id);
    const catName = category ? category.nombre : 'Sin_Categoria';

    let filtered = allEmails;
    if (scope === 'validos') {
      filtered = allEmails.filter((e) => e.estado === 'VALIDO');
    } else if (scope === 'roles') {
      filtered = allEmails.filter((e) => e.estado === 'GENERICO_ROL');
    } else if (scope === 'invalidos') {
      filtered = allEmails.filter((e) => e.estado === 'INVALIDO');
    } else if (scope === 'validos_y_roles') {
      filtered = allEmails.filter((e) => e.estado === 'VALIDO' || e.estado === 'GENERICO_ROL');
    }

    const headers = [
      'Email',
      'Original',
      'Estado',
      'Tipo',
      'Score_Confianza',
      'Verificacion_Externa',
      'Fuente_Verificacion',
      'Dominio',
      'Servidor_MX',
      'Observacion',
      'Categoria',
      'Fecha_Registro',
    ];

    const cleanField = (val: string | number | boolean | undefined | null) => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/[\r\n]+/g, ' ').replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = filtered.map((e) => [
      cleanField(e.email),
      cleanField(e.original_email),
      cleanField(e.estado === 'VALIDO' ? 'Válido' : e.estado === 'GENERICO_ROL' ? 'De Rol' : 'Inválido'),
      cleanField(e.tipo),
      cleanField(e.score_confianza ?? 0),
      cleanField(e.verificado_externo ? 'SI' : 'NO'),
      cleanField(e.fuente_verificacion || 'Local'),
      cleanField(e.dominio),
      cleanField(e.mx_valido ? 'Activo' : 'Inactivo'),
      cleanField(e.observacion),
      cleanField(catName),
      cleanField(e.fecha_creacion),
    ]);

    // Instrucción explícita sep= para que Excel reconozca el delimitador de inmediato
    const sepHeader = `sep=${delimiter}`;
    const headerLine = headers.join(delimiter);
    const dataLines = rows.map((r) => r.join(delimiter));

    return [sepHeader, headerLine, ...dataLines].join('\r\n');
  }

  /**
   * Genera un archivo nativo de Microsoft Excel (.xlsx) estructurado en hojas independientes
   * (Pestaña 1: Válidos, Pestaña 2: Cuentas de Rol, Pestaña 3: Inválidos, Pestaña 4: Resumen)
   * garantizando que los datos NUNCA salgan hechos una mezcla.
   */
  public static generateExportXlsxBuffer(
    categoria_id: string,
    scope: 'separated' | 'validos' | 'roles' | 'invalidos' | 'all' = 'separated'
  ): Buffer {
    const allEmails = db.getEmailsByCategory(categoria_id, { limit: 100000 }).correos;
    const category = db.getCategoryById(categoria_id);
    const catName = category ? category.nombre : 'Sin_Categoria';

    const workbook = xlsx.utils.book_new();

    const columnWidths = [
      { wch: 32 }, // Correo Electrónico
      { wch: 32 }, // Correo Original
      { wch: 22 }, // Estado
      { wch: 18 }, // Tipo de Cuenta
      { wch: 18 }, // Score de Confianza
      { wch: 20 }, // Verificación Externa
      { wch: 22 }, // Fuente
      { wch: 22 }, // Dominio
      { wch: 16 }, // Servidor MX
      { wch: 60 }, // Diagnóstico / Observación
      { wch: 22 }, // Categoría
      { wch: 24 }, // Fecha
    ];

    const mapEmailRow = (e: Correo) => ({
      'Correo Electrónico': e.email,
      'Correo Original': e.original_email,
      'Estado': e.estado === 'VALIDO' ? 'Válido (Entregable)' : e.estado === 'GENERICO_ROL' ? 'Riesgoso (Rol)' : 'Inválido (Rebotado)',
      'Tipo de Cuenta': e.tipo === 'De_Rol' ? 'Cuenta de Rol' : e.tipo,
      'Score de Confianza': e.score_confianza ?? 0,
      'Verificación Externa': e.verificado_externo ? 'SÍ' : 'NO',
      'Fuente de Verificación': e.fuente_verificacion || 'Local',
      'Dominio': e.dominio,
      'Servidor MX': e.mx_valido ? 'Activo' : 'Inactivo',
      'Diagnóstico / Observación': (e.observacion || '').replace(/[\r\n]+/g, ' '),
      'Lista / Categoría': catName,
      'Fecha de Registro': e.fecha_creacion,
    });

    if (scope === 'separated') {
      const validos = allEmails.filter((e) => e.estado === 'VALIDO');
      const roles = allEmails.filter((e) => e.estado === 'GENERICO_ROL');
      const invalidos = allEmails.filter((e) => e.estado === 'INVALIDO');

      // 1. Hoja de Válidos (100% Limpios y Entregables)
      const validSheet = xlsx.utils.json_to_sheet(validos.map(mapEmailRow));
      validSheet['!cols'] = columnWidths;
      xlsx.utils.book_append_sheet(workbook, validSheet, `Válidos (${validos.length})`);

      // 2. Hoja de Cuentas de Rol / Riesgosas
      const roleSheet = xlsx.utils.json_to_sheet(roles.map(mapEmailRow));
      roleSheet['!cols'] = columnWidths;
      xlsx.utils.book_append_sheet(workbook, roleSheet, `De Rol (${roles.length})`);

      // 3. Hoja de Inválidos / Rebotados
      const invalidSheet = xlsx.utils.json_to_sheet(invalidos.map(mapEmailRow));
      invalidSheet['!cols'] = columnWidths;
      xlsx.utils.book_append_sheet(workbook, invalidSheet, `Inválidos (${invalidos.length})`);

      // 4. Hoja de Resumen de Auditoría
      const summaryRows = [
        { 'Métrica de Depuración': 'Nombre de la Lista / Categoría', 'Valor': catName },
        { 'Métrica de Depuración': 'Total de Correos Procesados', 'Valor': allEmails.length },
        { 'Métrica de Depuración': 'Correos Válidos (Deliverable)', 'Valor': validos.length },
        { 'Métrica de Depuración': 'Cuentas de Rol / Riesgosas', 'Valor': roles.length },
        { 'Métrica de Depuración': 'Correos Inválidos (Undeliverable)', 'Valor': invalidos.length },
        {
          'Métrica de Depuración': 'Tasa de Entregabilidad Estimada',
          'Valor': allEmails.length > 0 ? `${Math.round((validos.length / allEmails.length) * 100)}%` : '0%',
        },
        { 'Métrica de Depuración': 'Fecha de Exportación', 'Valor': new Date().toLocaleString() },
      ];
      const summarySheet = xlsx.utils.json_to_sheet(summaryRows);
      summarySheet['!cols'] = [{ wch: 35 }, { wch: 35 }];
      xlsx.utils.book_append_sheet(workbook, summarySheet, 'Resumen de Auditoría');
    } else {
      let filtered = allEmails;
      let sheetName = 'Correos Depurados';
      if (scope === 'validos') {
        filtered = allEmails.filter((e) => e.estado === 'VALIDO');
        sheetName = `Solo Válidos (${filtered.length})`;
      } else if (scope === 'roles') {
        filtered = allEmails.filter((e) => e.estado === 'GENERICO_ROL');
        sheetName = `Solo Rol (${filtered.length})`;
      } else if (scope === 'invalidos') {
        filtered = allEmails.filter((e) => e.estado === 'INVALIDO');
        sheetName = `Solo Inválidos (${filtered.length})`;
      }

      const worksheet = xlsx.utils.json_to_sheet(filtered.map(mapEmailRow));
      worksheet['!cols'] = columnWidths;
      xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);
    }

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return buffer as Buffer;
  }

  /**
   * Genera un archivo TXT simple con un correo por línea para herramientas de envío
   */
  public static generateExportTxt(categoria_id: string, scope: 'validos' | 'roles' | 'all' = 'validos'): string {
    const allEmails = db.getEmailsByCategory(categoria_id, { limit: 100000 }).correos;
    let filtered = allEmails;
    if (scope === 'validos') {
      filtered = allEmails.filter((e) => e.estado === 'VALIDO');
    } else if (scope === 'roles') {
      filtered = allEmails.filter((e) => e.estado === 'GENERICO_ROL');
    }
    return filtered.map((e) => e.email.trim()).join('\r\n');
  }

  /**
   * Re-evalúa y limpia una lista completa con las reglas estrictas de proveedores y anti-fraude
   */
  public static async reauditCategory(categoria_id: string): Promise<{
    updatedCount: number;
    validos: number;
    roles: number;
    invalidos: number;
  }> {
    const emails = db.getEmailsByCategory(categoria_id, { limit: 10000 }).correos;
    let validos = 0;
    let roles = 0;
    let invalidos = 0;

    for (const item of emails) {
      const singleRes = await this.validateSingleEmail(item.email);
      db.updateEmail(item.id, {
        email: singleRes.email,
        dominio: singleRes.dominio,
        estado: singleRes.estado as EstadoEmail,
        tipo: singleRes.tipo as TipoEmail,
        mx_valido: singleRes.mx_valido,
        score_confianza: singleRes.score_confianza,
        observacion: singleRes.observacion,
        corregido: singleRes.corregido,
      });

      if (singleRes.estado === 'VALIDO') validos++;
      else if (singleRes.estado === 'GENERICO_ROL') roles++;
      else invalidos++;
    }

    return { updatedCount: emails.length, validos, roles, invalidos };
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
    } else if (!extEval.isDeliverable || extEval.score < 40 || extEval.reasonCode.startsWith('UNDELIVERABLE')) {
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

  public static deleteEmailsByFilter(
    categoria_id: string,
    filter: 'INVALIDOS' | 'GENERICOS_ROL' | 'VALIDOS' | 'ALL' | 'FILTERED',
    options?: {
      search?: string;
      estado?: string;
      tipo?: string;
      min_score?: number;
      max_score?: number;
    }
  ): number {
    return db.deleteEmailsByFilter(categoria_id, filter, options);
  }

  public static moveEmailsBulk(ids: string[], target_categoria_id: string): number {
    return db.moveEmailsBulk(ids, target_categoria_id);
  }

  public static getGlobalStats() {
    return db.getGlobalStats();
  }
}
