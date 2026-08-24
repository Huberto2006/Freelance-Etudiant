import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { TypeNotification } from '../../common/enums/type-notification.enum';

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
  ) {}

  /**
   * Cree une notification in-app. Appelee par les autres modules
   * (candidatures, messages, livraisons, paiements, reactions) suite a un
   * evenement metier. Ne leve jamais d'exception cote appelant : une
   * notification manquee ne doit jamais faire echouer l'action principale.
   */
  async creer(params: CreerNotificationParams): Promise<void> {
    try {
      const notification = this.repo.create(params);
      await this.repo.save(notification);
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
  }

  async marquerToutesLues(userId: string): Promise<void> {
    await this.repo.update({ destinataireId: userId, estLue: false }, { estLue: true });
  }
}
