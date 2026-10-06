/** Origines explicites communes a l'API HTTP et aux deux gateways Socket.IO. */
export function getCorsOrigins(): string[] {
  const configure = process.env.CORS_ORIGIN || process.env.FRONTEND_URL;

  // En production, aucune origine par defaut : un oubli de configuration
  // doit faire echouer le demarrage, pas ouvrir/fermer silencieusement CORS.
  if (!configure && process.env.NODE_ENV === 'production') {
    throw new Error(
      'CORS_ORIGIN (ou FRONTEND_URL) est obligatoire en production.',
    );
  }

  const origines = (configure || 'http://localhost:3001')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  // Le joker est incompatible avec credentials: true et trop permissif.
  if (origines.includes('*')) {
    throw new Error("CORS_ORIGIN ne doit pas contenir '*' (cookies/credentials actifs).");
  }
  return origines;
}
