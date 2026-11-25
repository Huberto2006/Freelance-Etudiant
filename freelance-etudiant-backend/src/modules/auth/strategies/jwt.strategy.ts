import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import {
  AuthenticatedUser,
  JwtPayload,
} from '../interfaces/authenticated-user.interface';
import { UsersService } from '../../users/users.service';
import { SessionsService } from '../../sessions/sessions.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
  ) {
    const secret = configService.get<string>('jwt.secret');
    // Correctif de securite : un secret vide ou absent romprait la
    // verification de signature (bypass). On refuse le demarrage plutot
    // que de laisser passport-jwt utiliser une chaine vide.
    if (!secret || secret.trim().length === 0) {
      throw new Error(
        'JWT_SECRET est manquant ou vide : impossible de demarrer le module Auth en toute securite.',
      );
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (payload.typ !== 'access') {
      throw new UnauthorizedException('Type de jeton invalide');
    }
    const user = await this.usersService.findById(payload.sub);
    if (!user || user.estSuspendu || !user.estActif) {
      throw new UnauthorizedException('Compte introuvable, suspendu ou desactive');
    }
    if (typeof payload.sid !== 'string' || payload.sid.length === 0) {
      throw new UnauthorizedException('Session invalide');
    }
    const valide = await this.sessionsService.validerEtActualiserActivite(
      payload.sid,
      payload.sub,
    );
    if (!valide) {
      throw new UnauthorizedException('Session révoquée ou expirée');
    }
    return { id: user.id, email: user.email, role: user.role, sessionId: payload.sid };
  }
}
