import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import {
  AuthenticatedUser,
  JwtPayload,
} from '../interfaces/authenticated-user.interface';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
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
    const user = await this.usersService.findById(payload.sub);
    if (!user || user.estSuspendu || !user.estActif) {
      throw new UnauthorizedException('Compte introuvable, suspendu ou desactive');
    }
    return { id: user.id, email: user.email, role: user.role };
  }
}
