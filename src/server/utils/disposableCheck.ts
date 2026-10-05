/**
 * Detección y filtrado de dominios de correos temporales / desechables
 */

const DISPOSABLE_DOMAINS = new Set<string>([
  'mailinator.com',
  'guerrillamail.com',
  'guerrillamailblock.com',
  'sharklasers.com',
  'grr.la',
  'guerrillamail.biz',
  'guerrillamail.de',
  'guerrillamail.net',
  'guerrillamail.org',
  'tempmail.com',
  'temp-mail.org',
  '10minutemail.com',
  '10minutemail.net',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
  'trashmail.com',
  'trashmail.net',
  'trashmail.org',
  'dispostable.com',
  'throwawaymail.com',
  'getnada.com',
  'inboxkitten.com',
  'burnermail.io',
  'maildrop.cc',
  'fakeinbox.com',
  'mytemp.email',
  'crazymailing.com',
  'nada.ltd',
  'mohmal.com',
  'emailondeck.com',
  'tempr.email',
  'discard.email',
  'spambog.com',
  'generator.email',
  'minuteinbox.com',
  'luxusmail.org',
  'dropmail.me',
  'harakirimail.com',
]);

export function isDisposableDomain(domain: string): boolean {
  if (!domain) return false;
  const clean = domain.toLowerCase().trim();

  // Coincidencia exacta
  if (DISPOSABLE_DOMAINS.has(clean)) {
    return true;
  }

  // Comprobar si termina en alguno de los dominios desechables conocidos (subdominios)
  for (const disp of DISPOSABLE_DOMAINS) {
    if (clean.endsWith(`.${disp}`)) {
      return true;
    }
  }

  return false;
}
