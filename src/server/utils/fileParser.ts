/**
 * Parser universal de archivos CSV, XLSX, XLS y TXT
 * Extrae todas las direcciones de correo electrónico sin importar el delimitador,
 * cabecera, comillas o codificación del archivo.
 */
import * as xlsx from 'xlsx';

export interface ParsedEmailEntry {
  rawEmail: string;
  sourceRow?: number;
}

export function parseFileContent(buffer: Buffer, filename: string): ParsedEmailEntry[] {
  const ext = (filename.toLowerCase().substring(filename.lastIndexOf('.')) || '').trim();
  const results: ParsedEmailEntry[] = [];
  const seenRaw = new Set<string>();

  const addCandidate = (val: string, rowIdx?: number) => {
    if (!val || typeof val !== 'string') return;
    const trimmed = val.replace(/^[<"'(]+|[>"')]+$/g, '').trim();
    if (!trimmed.includes('@')) return;

    // Normalizar si viene con prefijo mailto:
    const clean = trimmed.replace(/^mailto:/i, '').trim();
    if (clean.length >= 5 && clean.includes('@') && !seenRaw.has(clean.toLowerCase())) {
      seenRaw.add(clean.toLowerCase());
      results.push({ rawEmail: clean, sourceRow: rowIdx });
    }
  };

  // Estrategia 1: Si es archivo Excel binario (.xlsx, .xls)
  if (ext === '.xlsx' || ext === '.xls') {
    try {
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      let rowCounter = 1;

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) continue;

        const rows = xlsx.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });

        for (const row of rows) {
          if (Array.isArray(row)) {
            for (const cell of row) {
              if (cell !== undefined && cell !== null) {
                const strCell = String(cell).trim();
                if (strCell.includes('@')) {
                  // Si la celda contiene más de un correo o texto envolvente
                  const extracted = extractEmailsFromString(strCell);
                  if (extracted.length > 0) {
                    for (const em of extracted) addCandidate(em, rowCounter);
                  } else {
                    addCandidate(strCell, rowCounter);
                  }
                }
              }
            }
          }
          rowCounter++;
        }
      }
    } catch (err) {
      console.warn('Aviso procesando Excel con xlsx, intentando fallback de texto:', (err as Error).message);
    }
  }

  // Estrategia 2: Archivos de texto (CSV, TXT, TSV) o Fallback
  if (results.length === 0) {
    // Decodificar el buffer limpiando posible BOM UTF-8 (\uFEFF)
    let text = buffer.toString('utf-8');
    if (text.charCodeAt(0) === 0xfeff) {
      text = text.substring(1);
    }

    // Dividir en líneas
    const lines = text.split(/\r?\n/);
    let rowNum = 1;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        rowNum++;
        continue;
      }

      if (line.includes('@')) {
        // 1. Extraer con expresiones regulares de correo
        const extracted = extractEmailsFromString(line);
        if (extracted.length > 0) {
          for (const em of extracted) {
            addCandidate(em, rowNum);
          }
        } else {
          // 2. Fallback de división por delimitadores comunes (, ; \t |)
          const tokens = line.split(/[;,|\t\s]+/);
          for (const token of tokens) {
            const cleanToken = token.replace(/^[<"'(]+|[>"')]+$/g, '').trim();
            if (cleanToken.includes('@') && cleanToken.length >= 5) {
              addCandidate(cleanToken, rowNum);
            }
          }
        }
      }
      rowNum++;
    }
  }

  return results;
}

/**
 * Extrae cualquier patrón que asemeje un correo electrónico de un texto
 */
function extractEmailsFromString(text: string): string[] {
  if (!text || !text.includes('@')) return [];

  // Regex flexible que captura correos estándar y con typos de dominio comunes (ej. .com, .es, .net, etc.)
  const emailRegex = /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*/g;
  const matches = text.match(emailRegex);
  if (!matches) return [];

  return matches
    .map((m) => m.replace(/^[<"'(]+|[>"')]+$/g, '').trim())
    .filter((m) => m.includes('@') && m.length >= 5);
}
