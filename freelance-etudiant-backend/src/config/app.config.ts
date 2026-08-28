import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  // CORS : '*' est incompatible avec credentials: true (les navigateurs
  // rejettent la reponse). On retombe sur l'URL du frontend plutot que
  // sur le joker, beaucoup trop permissif pour des requetes credentiales.
  corsOrigin:
    process.env.CORS_ORIGIN ||
    process.env.FRONTEND_URL ||
    'http://localhost:3001',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
}));
