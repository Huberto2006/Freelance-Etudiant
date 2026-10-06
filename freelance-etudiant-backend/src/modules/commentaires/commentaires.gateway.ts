import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

import { TypeCibleContenu } from '../../common/enums/type-cible-contenu.enum';
import { CommentairePublic } from '../../common/utils/projection-publique.util';
import { SocketAuthentifie } from '../realtime/guards/ws-jwt.guard';
import { getCorsOrigins } from '../../config/cors.config';

const REGEX_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Nombre maximal de rooms "commentaires" par socket (anti-abus memoire). */
const MAX_ROOMS_COMMENTAIRES = 20;

@WebSocketGateway({
  cors: {
    origin: getCorsOrigins(),
    credentials: true,
  },
  // Borne la taille d'un message Socket.IO (defaut : 1 Mo).
  maxHttpBufferSize: 100_000,
})
export class CommentairesGateway {
  @WebSocketServer()
  server!: Server;

  /**
   * Permet à un client de rejoindre la room correspondant à une mission
   * ou un service.
   *
   * Verification explicite de l'authentification : RealtimeGateway
   * (meme namespace Socket.IO par defaut) deconnecte deja tout socket non
   * authentifie a la connexion, mais cette verification est asynchrone —
   * un client pourrait tenter de rejoindre une room pendant la breve
   * fenetre avant sa deconnexion. Ne pas dependre implicitement du
   * comportement d'un autre gateway : verifier ici, explicitement, que
   * `client.data.userId` a bien ete pose (uniquement fait par
   * RealtimeGateway.handleConnection apres verification du JWT).
   */
  @SubscribeMessage('commentaire:rejoindre')
  rejoindre(
    @MessageBody()
    data: {
      cibleType: TypeCibleContenu;
      cibleId: string;
    },
    @ConnectedSocket() socket: SocketAuthentifie,
  ) {
    if (!socket.data?.userId) {
      socket.disconnect(true);
      return;
    }

    // Charge utile non fiable : validation stricte avant toute utilisation.
    if (
      !data ||
      typeof data.cibleId !== 'string' ||
      !REGEX_UUID.test(data.cibleId) ||
      (data.cibleType !== TypeCibleContenu.MISSION &&
        data.cibleType !== TypeCibleContenu.SERVICE)
    ) {
      return;
    }

    const room = this.getRoomName(data.cibleType, data.cibleId);

    const roomsCommentaires = [...socket.rooms].filter(
      (r) => r.startsWith('mission:') || r.startsWith('service:'),
    );
    if (
      !socket.rooms.has(room) &&
      roomsCommentaires.length >= MAX_ROOMS_COMMENTAIRES
    ) {
      return;
    }

    socket.join(room);
  }

  /**
   * Diffuse un nouveau commentaire uniquement aux utilisateurs présents
   * sur la mission/service concerné. La room est rejoignable SANS
   * authentification (voir rejoindre() ci-dessus) : seule la version
   * projetee du commentaire (CommentairePublic, sans email/googleId/etat
   * de compte de l'auteur) doit donc jamais transiter ici.
   */
  diffuserNouveauCommentaire(commentaire: CommentairePublic) {
    const room = this.getRoomName(
      commentaire.cibleType,
      commentaire.cibleId,
    );

    this.server.to(room).emit('commentaire:nouveau', commentaire);
  }

  /**
   * Diffuse la modification d'un commentaire (voir note ci-dessus : room
   * publique, seule la version projetee doit y circuler).
   */
  diffuserCommentaireModifie(commentaire: CommentairePublic) {
    const room = this.getRoomName(
      commentaire.cibleType,
      commentaire.cibleId,
    );

    this.server.to(room).emit('commentaire:modifie', commentaire);
  }

  /**
   * Diffuse la suppression d'un commentaire.
   */
  diffuserCommentaireSupprime(
    commentaire: Pick<CommentairePublic, 'id' | 'cibleType' | 'cibleId'>,
  ) {
    const room = this.getRoomName(
      commentaire.cibleType,
      commentaire.cibleId,
    );

    this.server.to(room).emit('commentaire:supprime', {
      id: commentaire.id,
    });
  }

  /**
   * Nom unique de la room.
   *
   * Exemple :
   * mission:uuid
   * service:uuid
   */
  private getRoomName(
    cibleType: TypeCibleContenu,
    cibleId: string,
  ): string {
    const prefix =
      cibleType === TypeCibleContenu.MISSION
        ? 'mission'
        : 'service';

    return `${prefix}:${cibleId}`;
  }
}
