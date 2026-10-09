import { registerAs } from '@nestjs/config';

/**
 * Google Sign-In (Google Identity Services). Seul le Client ID est utilise :
 * la validation du jeton d'identite est cryptographique (cles publiques de
 * Google), aucun secret client n'est necessaire cote backend.
 *
 * - Production : GOOGLE_CLIENT_ID est obligatoire (demarrage refuse sinon).
 * - Hors production : s'il est absent, l'endpoint Google repond 503 avec un
 *   message explicite ; le reste de l'API (email + mot de passe) fonctionne.
 */
export default registerAs('google', () => {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() || null;

  if (!clientId && process.env.NODE_ENV === 'production') {
    throw new Error(
      'GOOGLE_CLIENT_ID est manquant en production (meme valeur que NEXT_PUBLIC_GOOGLE_CLIENT_ID cote frontend).',
    );
  }
  if (clientId && !clientId.endsWith('.apps.googleusercontent.com')) {
    throw new Error(
      "GOOGLE_CLIENT_ID semble invalide : il doit se terminer par '.apps.googleusercontent.com'.",
    );
  }

  return { clientId };
});
