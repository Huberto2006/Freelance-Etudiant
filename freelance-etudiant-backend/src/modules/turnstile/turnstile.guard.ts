import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { TurnstileService } from './turnstile.service';
import { TURNSTILE_ACTIONS_KEY } from './turnstile-action.decorator';

/** En-tete portant le jeton du widget (evite de modifier chaque DTO). */
export const ENTETE_TURNSTILE = 'x-turnstile-token';

/**
 * Garde a appliquer (@UseGuards(TurnstileGuard)) sur les routes publiques
 * sensibles. S'execute APRES les gardes globaux (throttling, JWT) : le
 * rate limiting protege donc aussi les appels a Cloudflare.
 */
@Injectable()
export class TurnstileGuard implements CanActivate {
  constructor(
    private readonly turnstileService: TurnstileService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const brut = req.headers[ENTETE_TURNSTILE];
    const jeton = Array.isArray(brut) ? brut[0] : brut;
    const actions =
      this.reflector.getAllAndOverride<string[]>(TURNSTILE_ACTIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    await this.turnstileService.verifier(jeton, {
      ip: req.ip,
      actionsAttendues: actions,
    });
    return true;
  }
}
