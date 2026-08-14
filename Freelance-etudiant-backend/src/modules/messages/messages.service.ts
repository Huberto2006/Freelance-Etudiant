import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { EnvoyerMessageDto } from './dto/envoyer-message.dto';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly repo: Repository<Message>,
  ) {}

  async envoyer(expediteurId: string, dto: EnvoyerMessageDto): Promise<Message> {
    const message = this.repo.create({ ...dto, expediteurId });
    return this.repo.save(message);
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
