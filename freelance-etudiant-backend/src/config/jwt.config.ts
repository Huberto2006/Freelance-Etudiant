import { registerAs } from '@nestjs/config';

/**
 * Secrets JWT. Aucun repli par defaut : un secret absent, trop court (en
 * production) ou identique pour l'access et le refresh token fait echouer
 * le demarrage plutot que de laisser l'API signer avec une valeur connue.
 */
export default registerAs('jwt', () => {
  const secret = process.env.JWT_SECRET?.trim();
  const refreshSecret = process.env.JWT_REFRESH_SECRET?.trim();
  const production = process.env.NODE_ENV === 'production';

  if (!secret) {
    throw new Error('JWT_SECRET est manquant ou vide dans .env.');
  }
  if (!refreshSecret) {
    throw new Error(
      'JWT_REFRESH_SECRET est manquant ou vide dans .env (secret DEDIE, different de JWT_SECRET).',
    );
  }
  if (secret === refreshSecret) {
    throw new Error(
      'JWT_REFRESH_SECRET doit etre different de JWT_SECRET (sinon un refresh token serait accepte comme access token).',
    );
  }
  if (production && (secret.length < 32 || refreshSecret.length < 32)) {
    throw new Error(
      'JWT_SECRET et JWT_REFRESH_SECRET doivent faire au moins 32 caracteres en production (ex. openssl rand -hex 48).',
    );
  }

  return {
    secret,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  };
});
