import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'socket.io';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../../auth/interfaces/authenticated-user.interface';

export interface SocketAuthentifie extends Socket {
  data: {
    userId: string;
  };
}

/**
 * Authentification de la connexion WebSocket.
 *
 * Reutilise exactement la meme logique de verification que JwtStrategy
 * (verification de signature + `estActif`/`estSuspendu`), adaptee au
 * handshake Socket.IO plutot qu'a une requete HTTP : passport-jwt ne sait
 * extraire un jeton que d'un header Authorization HTTP, ce qui n'existe
 * pas de la meme facon lors d'un handshake WebSocket. La verification
 * elle-meme (signature + etat du compte) n'est donc pas dupliquee, juste
 * son point d'entree.
 *
 * Le jeton est attendu dans `socket.handshake.auth.token` (convention
 * standard cote client socket.io-client), avec repli sur le header
 * Authorization pour flexibilite.
 */
@Injectable()
export class WsJwtGuard {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async authentifier(client: Socket): Promise<string | null> {
    const token = this.extraireToken(client);
    if (!token) {
      this.logger.debug(`Connexion WS refusee (${client.id}) : jeton absent`);
      return null;
    }

    try {
      const secret = this.configService.get<string>('jwt.secret');
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret,
      });

      const user = await this.usersService.findById(payload.sub);
      if (!user || user.estSuspendu || !user.estActif) {
        this.logger.debug(
          `Connexion WS refusee (${client.id}) : compte introuvable, suspendu ou desactive`,
        );
        return null;
      }

      return user.id;
    } catch {
      this.logger.debug(`Connexion WS refusee (${client.id}) : jeton invalide`);
      return null;
    }
  }

  private extraireToken(client: Socket): string | null {
    const depuisAuth = client.handshake.auth?.token as string | undefined;
    if (depuisAuth) return depuisAuth;

    const header = client.handshake.headers?.authorization;
    if (header?.startsWith('Bearer ')) {
      return header.slice(7);
    }

    return null;
  }
}
