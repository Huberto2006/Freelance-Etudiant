import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { WsJwtGuard, SocketAuthentifie } from './guards/ws-jwt.guard';

/**
 * Gateway temps reel unique pour toute la plateforme (notifications et
 * messagerie). Une seule room par utilisateur authentifie ("user:<id>")
 * suffit pour les deux besoins : ni l'un ni l'autre ne necessite de
 * rooms par conversation ou par contenu (pas d'indicateur de frappe,
 * pas de presence en temps reel sur une page precise).
 *
 * IMPORTANT : ce gateway ne contient aucune regle metier. Il ne fait
 * que router des evenements deja valides et persistes par les services
 * (NotificationsService, MessagesService). L'envoi d'un message reste
 * exclusivement possible via POST /messages, qui applique la regle
 * "candidature acceptee" -- le WebSocket ne peut donc jamais la
 * contourner puisqu'il ne cree jamais de message lui-meme.
 */
@WebSocketGateway({
  cors: {
    origin:
      process.env.CORS_ORIGIN ||
      process.env.FRONTEND_URL ||
      'http://localhost:3001',
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(private readonly wsJwtGuard: WsJwtGuard) {}

  async handleConnection(client: SocketAuthentifie): Promise<void> {
    const userId = await this.wsJwtGuard.authentifier(client);
    if (!userId) {
      client.disconnect(true);
      return;
    }

    client.data.userId = userId;
    await client.join(`user:${userId}`);
    this.logger.debug(`Client ${client.id} connecte (utilisateur ${userId})`);
  }

  handleDisconnect(client: SocketAuthentifie): void {
    this.logger.debug(`Client ${client.id} deconnecte`);
  }

  /**
   * Emet un evenement a tous les sockets connectes d'un utilisateur donne
   * (plusieurs onglets/appareils). Appelee uniquement par des services
   * metier apres une ecriture en base reussie.
   */
  emitToUser(userId: string, event: string, payload: unknown): void {
    this.server.to(`user:${userId}`).emit(event, payload);
  }
}
