import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { EnvoyerMessageDto } from './dto/envoyer-message.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { TypeNotification } from '../../common/enums/type-notification.enum';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly repo: Repository<Message>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async envoyer(expediteurId: string, dto: EnvoyerMessageDto): Promise<Message> {
    const message = this.repo.create({ ...dto, expediteurId });
    const saved = await this.repo.save(message);

    await this.notificationsService.creer({
      destinataireId: dto.destinataireId,
      type: TypeNotification.NOUVEAU_MESSAGE,
      titre: 'Nouveau message',
      message:
        dto.contenu.length > 80 ? `${dto.contenu.slice(0, 80)}…` : dto.contenu,
      lienUrl: `/tableau-de-bord/messages`,
    });

    return saved;
  }

  /**
   * Recupere la conversation entre l'utilisateur courant et un autre
   * utilisateur, triee chronologiquement.
   */
  async findConversation(userId: string, autreUtilisateurId: string): Promise<Message[]> {
    return this.repo
      .createQueryBuilder('message')
      .where(
        '(message.expediteurId = :userId AND message.destinataireId = :autre) OR (message.expediteurId = :autre AND message.destinataireId = :userId)',
        { userId, autre: autreUtilisateurId },
      )
      .orderBy('message.dateEnvoi', 'ASC')
      .getMany();
  }

  /**
   * Liste les conversations distinctes de l'utilisateur (derniers messages).
   */
  async findMesConversations(userId: string): Promise<Message[]> {
    return this.repo
      .createQueryBuilder('message')
      .where('message.expediteurId = :userId OR message.destinataireId = :userId', {
        userId,
      })
      .orderBy('message.dateEnvoi', 'DESC')
      .getMany();
  }

  async marquerCommeLu(messageId: string, userId: string): Promise<void> {
    await this.repo.update(
      { id: messageId, destinataireId: userId },
      { estLu: true },
    );
  }
}
