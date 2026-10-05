/**
 * Validador estricto de sintaxis de correo electrónico (RFC 5322 & estándares web)
 */

export interface RegexValidationResult {
  isValid: boolean;
  reason?: string;
  localPart?: string;
  domain?: string;
}

// Expresión regular robusta y estricta para sintaxis estándar
const STRICT_EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function validateEmailSyntax(email: string): RegexValidationResult {
  if (!email || typeof email !== 'string') {
    return { isValid: false, reason: 'El correo está vacío o no es una cadena válida' };
  }

  const trimmed = email.trim();

  // Longitud total máxima según RFC 5321: 254 caracteres
  if (trimmed.length > 254) {
    return { isValid: false, reason: 'Longitud de correo excede el límite máximo (254 caracteres)' };
  }

  if (trimmed.length < 5) {
    return { isValid: false, reason: 'Longitud de correo demasiado corta' };
  }

  // Comprobar presencia de exactamente un '@'
  const atParts = trimmed.split('@');
  if (atParts.length !== 2) {
    return { isValid: false, reason: 'Debe contener exactamente un símbolo "@"' };
  }

  const [localPart, domain] = atParts;

  // Longitud de la parte local máxima 64 caracteres
  if (localPart.length === 0 || localPart.length > 64) {
    return { isValid: false, reason: 'La parte de usuario (antes de @) debe tener entre 1 y 64 caracteres' };
  }

  // Longitud del dominio máxima 253 caracteres
  if (domain.length === 0 || domain.length > 253) {
    return { isValid: false, reason: 'El dominio (después de @) es inválido o excede 253 caracteres' };
  }

  // Puntos consecutivos no permitidos
  if (trimmed.includes('..')) {
    return { isValid: false, reason: 'No se permiten puntos consecutivos ("..")' };
  }

  // Puntos al inicio o final de la parte local
  if (localPart.startsWith('.') || localPart.endsWith('.')) {
    return { isValid: false, reason: 'El usuario no puede empezar ni terminar con un punto' };
  }

  // Puntos al inicio o final del dominio
  if (domain.startsWith('.') || domain.endsWith('.')) {
    return { isValid: false, reason: 'El dominio no puede empezar ni terminar con un punto' };
  }

  // Validar formato estricto con regex
  if (!STRICT_EMAIL_REGEX.test(trimmed)) {
    return { isValid: false, reason: 'Estructura o caracteres no válidos para correo estándar' };
  }

  // Validar TLD (extensión final .com, .org, .es, etc.)
  const domainParts = domain.split('.');
  const tld = domainParts[domainParts.length - 1];

  if (tld.length < 2) {
    return { isValid: false, reason: 'El TLD (extensión de dominio) debe tener al menos 2 caracteres' };
  }

  // TLD no puede contener números
  if (/\d/.test(tld)) {
    return { isValid: false, reason: 'El TLD del dominio no puede contener números' };
  }

  return {
    isValid: true,
    localPart,
    domain: domain.toLowerCase(),
  };
}
