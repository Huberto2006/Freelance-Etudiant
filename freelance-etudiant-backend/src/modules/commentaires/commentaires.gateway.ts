import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { TypeCibleContenu } from '../../common/enums/type-cible-contenu.enum';
import { Commentaire } from './entities/commentaire.entity';
import { getCorsOrigins } from '../../config/cors.config';

@WebSocketGateway({
  cors: {
    origin: getCorsOrigins(),
    credentials: true,
  },
})
export class CommentairesGateway {
  @WebSocketServer()
  server!: Server;

  /**
   * Permet à un client de rejoindre la room
   * correspondant à une mission ou un service.
   */
  @SubscribeMessage('commentaire:rejoindre')
  rejoindre(
    @MessageBody()
    data: {
      cibleType: TypeCibleContenu;
      cibleId: string;
    },
    @ConnectedSocket() socket: Socket,
  ) {
    const room = this.getRoomName(data.cibleType, data.cibleId);

    socket.join(room);
  }

  /**
   * Diffuse un nouveau commentaire uniquement
   * aux utilisateurs présents sur la mission/service concerné.
   */
  diffuserNouveauCommentaire(commentaire: Commentaire) {
    const room = this.getRoomName(
      commentaire.cibleType,
      commentaire.cibleId,
    );

    this.server.to(room).emit('commentaire:nouveau', commentaire);
  }

  /**
   * Diffuse la modification d'un commentaire.
   */
  diffuserCommentaireModifie(commentaire: Commentaire) {
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
    commentaire: Pick<Commentaire, 'id' | 'cibleType' | 'cibleId'>,
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
