import type { Request, Response } from 'express';
import type { ConfigService } from '@nestjs/config';

export const NOM_COOKIE_REFRESH = 'kianja_refresh';

/** Lit un cookie dans l'en-tete Cookie (sans dependance cookie-parser). */
export function lireCookie(req: Request, nom: string): string | null {
  const brut = req.headers.cookie;
  if (!brut) return null;
  for (const morceau of brut.split(';')) {
    const index = morceau.indexOf('=');
    if (index === -1) continue;
    if (morceau.slice(0, index).trim() === nom) {
      try {
        return decodeURIComponent(morceau.slice(index + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
}

function optionsBase(config: ConfigService) {
  const production = config.get<string>('app.nodeEnv') === 'production';
  const sameSiteBrut = (config.get<string>('COOKIE_SAMESITE') ?? 'lax').toLowerCase();
  const sameSite: 'lax' | 'strict' | 'none' =
    sameSiteBrut === 'strict' || sameSiteBrut === 'none' ? sameSiteBrut : 'lax';
  // SameSite=None exige Secure ; en production Secure est toujours actif.
  const secure =
    production ||
    sameSite === 'none' ||
    config.get<string>('COOKIE_SECURE') === 'true';
  const prefix = (config.get<string>('app.apiPrefix') || 'api/v1').replace(/^\/+|\/+$/g, '');
  const path = config.get<string>('COOKIE_PATH') || `/${prefix}/auth`;
  return { httpOnly: true as const, secure, sameSite, path };
}

/** Depose le refresh token dans un cookie httpOnly limite aux routes /auth. */
export function poserCookieRefresh(
  res: Response,
  config: ConfigService,
  refreshToken: string,
  expirationEpochSec?: number,
): void {
  const maxAge = expirationEpochSec
    ? Math.max(0, expirationEpochSec * 1000 - Date.now())
    : 7 * 24 * 60 * 60 * 1000;
  res.cookie(NOM_COOKIE_REFRESH, refreshToken, { ...optionsBase(config), maxAge });
}

export function effacerCookieRefresh(res: Response, config: ConfigService): void {
  res.clearCookie(NOM_COOKIE_REFRESH, optionsBase(config));
}
