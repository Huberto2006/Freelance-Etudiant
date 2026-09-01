import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { TypeNotification } from '../../common/enums/type-notification.enum';
import { RealtimeGateway } from '../realtime/realtime.gateway';

interface CreerNotificationParams {
  destinataireId: string;
  type: TypeNotification;
  titre: string;
  message: string;
  lienUrl?: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  /**
   * Cree une notification in-app. Appelee par les autres modules
   * (candidatures, messages, livraisons, paiements, reactions,
   * commentaires) suite a un evenement metier. Ne leve jamais
   * d'exception cote appelant : une notification manquee ne doit jamais
   * faire echouer l'action principale.
   *
   * Point d'integration unique du temps reel pour les notifications :
   * comme tous les modules metier passent deja par cette methode, brancher
   * l'emission WebSocket ici suffit a couvrir toutes les fonctionnalites
   * sans dupliquer de code dans chaque service appelant.
   */
  async creer(params: CreerNotificationParams): Promise<void> {
    try {
      const notification = this.repo.create(params);
      const saved = await this.repo.save(notification);

      this.realtimeGateway.emitToUser(
        params.destinataireId,
        'notification:nouvelle',
        saved,
      );

      const total = await this.compterNonLues(params.destinataireId);
      this.realtimeGateway.emitToUser(
        params.destinataireId,
        'notification:compteur',
        { total },
      );
    } catch {
      // volontairement silencieux : la notification est secondaire
    }
  }

  async findByUser(userId: string): Promise<Notification[]> {
    return this.repo.find({
      where: { destinataireId: userId },
      order: { dateCreation: 'DESC' },
      take: 100,
    });
  }

  async compterNonLues(userId: string): Promise<number> {
    return this.repo.count({ where: { destinataireId: userId, estLue: false } });
  }

  async marquerLue(id: string, userId: string): Promise<void> {
    await this.repo.update({ id, destinataireId: userId }, { estLue: true });
    const total = await this.compterNonLues(userId);
    this.realtimeGateway.emitToUser(userId, 'notification:compteur', { total });
  }

  async marquerToutesLues(userId: string): Promise<void> {
    await this.repo.update({ destinataireId: userId, estLue: false }, { estLue: true });
    this.realtimeGateway.emitToUser(userId, 'notification:compteur', { total: 0 });
  }
}
