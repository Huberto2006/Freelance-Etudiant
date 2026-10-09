import { registerAs } from '@nestjs/config';
import { getCorsOrigins } from './cors.config';

export const TURNSTILE_VERIFY_URL_DEFAUT =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Cloudflare Turnstile. Politique fail-closed : la cle secrete est
 * OBLIGATOIRE dans tous les environnements (aucun contournement de
 * verification pour faciliter le developpement). En developpement, utiliser
 * les cles de TEST officielles de Cloudflare (voir .env.example).
 *
 * Controle de contexte (hostname + action renvoyes par Cloudflare) :
 * actif par defaut en production uniquement, car les cles de test
 * renvoient un hostname et une action factices.
 */
export default registerAs('turnstile', () => {
  const production = process.env.NODE_ENV === 'production';
  const secretKey = process.env.TURNSTILE_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new Error(
      'TURNSTILE_SECRET_KEY est manquant ou vide dans .env. En developpement, utilisez la cle secrete de test Cloudflare (voir .env.example) ; en production, la cle du widget Turnstile.',
    );
  }

  const verifyUrl =
    process.env.TURNSTILE_VERIFY_URL?.trim() || TURNSTILE_VERIFY_URL_DEFAUT;
  if (production && verifyUrl !== TURNSTILE_VERIFY_URL_DEFAUT) {
    throw new Error(
      'TURNSTILE_VERIFY_URL ne doit pas etre modifie en production (endpoint officiel Siteverify uniquement).',
    );
  }

  const timeoutMs = Number(process.env.TURNSTILE_TIMEOUT_MS ?? 5000);
  if (!Number.isFinite(timeoutMs) || timeoutMs < 500 || timeoutMs > 15000) {
    throw new Error('TURNSTILE_TIMEOUT_MS doit etre compris entre 500 et 15000.');
  }

  const enforceContext =
    process.env.TURNSTILE_ENFORCE_CONTEXT !== undefined
      ? process.env.TURNSTILE_ENFORCE_CONTEXT === 'true'
      : production;

  // Hostnames acceptes : liste explicite, sinon derives des origines CORS.
  let hostnames = (process.env.TURNSTILE_ALLOWED_HOSTNAMES ?? '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  if (enforceContext && hostnames.length === 0) {
    hostnames = getCorsOrigins().map((origine) =>
      new URL(origine).hostname.toLowerCase(),
    );
  }

  return { secretKey, verifyUrl, timeoutMs, enforceContext, hostnames };
});
