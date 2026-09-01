import {
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Message } from './entities/message.entity';
import { EnvoyerMessageDto } from './dto/envoyer-message.dto';

import { CandidaturesService } from '../candidatures/candidatures.service';
import { UsersService } from '../users/users.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

import { Role } from '../../common/enums/role.enum';
import { Utilisateur } from '../users/entities/utilisateur.entity';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly repo: Repository<Message>,

    private readonly candidaturesService: CandidaturesService,

    private readonly usersService: UsersService,

    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  /**
   * ========================================================
   * VÉRIFICATION DE L'AUTORISATION
   * ========================================================
   *
   * Un client et un étudiant peuvent communiquer uniquement
   * après acceptation d'une candidature.
   *
   * Exception :
   * si l'un des deux utilisateurs est admin,
   * la conversation est toujours autorisée.
   */
  private async verifierConversationAutorisee(
    expediteurId: string,
    destinataireId: string,
  ): Promise<void> {
    if (
      !expediteurId ||
      !destinataireId
    ) {
      throw new ForbiddenException(
        'Conversation non autorisée',
      );
    }

    if (
      expediteurId === destinataireId
    ) {
      throw new ForbiddenException(
        'Vous ne pouvez pas vous envoyer un message à vous-même',
      );
    }

    /*
     * Vérification des deux utilisateurs.
     */
    const expediteur =
      await this.usersService.findById(
        expediteurId,
      );

    const destinataire =
      await this.usersService.findById(
        destinataireId,
      );

    if (
      !expediteur ||
      !destinataire
    ) {
      throw new ForbiddenException(
        'Utilisateur introuvable',
      );
    }

    /*
     * Admin = support/modération toujours joignable.
     */
    if (
      expediteur.role === Role.ADMIN ||
      destinataire.role === Role.ADMIN
    ) {
      return;
    }

    /*
     * Pour les autres utilisateurs,
     * il faut une candidature acceptée.
     */
    const autorisee =
      await this.candidaturesService.existeCandidatureAccepteeEntre(
        expediteurId,
        destinataireId,
      );

    if (!autorisee) {
      throw new ForbiddenException(
        "La messagerie est disponible uniquement après l'acceptation d'une candidature.",
      );
    }
  }

  /**
   * ========================================================
   * ENVOYER UN MESSAGE
   * ========================================================
   */
  async envoyer(
    expediteurId: string,
    dto: EnvoyerMessageDto,
  ): Promise<Message> {
    /*
     * IMPORTANT :
     * l'autorisation est vérifiée AVANT la création
     * du message.
     */
    await this.verifierConversationAutorisee(
      expediteurId,
      dto.destinataireId,
    );

    const message =
      this.repo.create({
        ...dto,
        expediteurId,
      });

    const saved =
      await this.repo.save(message);

    // Recharge avec les relations (expediteur/destinataire) pour que le
    // payload temps reel ait exactement la meme forme que les messages
    // deja renvoyes par GET /messages/conversation/:id (type
    // MessageAvecUtilisateurs cote frontend).
    const messageComplet =
      await this.repo.findOne({
        where: { id: saved.id },
        relations: ['expediteur', 'destinataire'],
      });

    if (messageComplet) {
      // Diffuse au destinataire (nouveau message a afficher) et a
      // l'expediteur lui-meme (synchronisation multi-onglets/appareils).
      this.realtimeGateway.emitToUser(
        dto.destinataireId,
        'message:nouveau',
        messageComplet,
      );
      this.realtimeGateway.emitToUser(
        expediteurId,
        'message:nouveau',
        messageComplet,
      );
    }

    // Mise a jour en temps reel du compteur de messages non lus pour le destinataire
    const totalNonLus = await this.compterNonLus(dto.destinataireId);
    this.realtimeGateway.emitToUser(
      dto.destinataireId,
      'message:compteur',
      { total: totalNonLus },
    );

    return saved;
  }

  /**
   * ========================================================
   * CONVERSATION
   * ========================================================
   */
  async findConversation(
    userId: string,
    autreUtilisateurId: string,
  ): Promise<Message[]> {
    /*
     * On vérifie également l'accès à la conversation.
     *
     * Cela évite qu'un utilisateur connaissant simplement
     * l'ID d'un autre utilisateur puisse consulter ses messages.
     */
    await this.verifierConversationAutorisee(
      userId,
      autreUtilisateurId,
    );

    return this.repo
      .createQueryBuilder('message')

      .leftJoinAndSelect(
        'message.expediteur',
        'expediteur',
      )

      .leftJoinAndSelect(
        'message.destinataire',
        'destinataire',
      )

      .where(
        `
        (
          message.expediteurId = :userId
          AND
          message.destinataireId = :autre
        )
        OR
        (
          message.expediteurId = :autre
          AND
          message.destinataireId = :userId
        )
        `,
        {
          userId,
          autre: autreUtilisateurId,
        },
      )

      .orderBy(
        'message.dateEnvoi',
        'ASC',
      )

      .getMany();
  }

  /**
   * ========================================================
   * MES CONVERSATIONS
   * ========================================================
   *
   * Retourne :
   *
   * 1. les conversations ayant déjà des messages
   *
   * 2. les contacts issus de candidatures acceptées
   *    même s'il n'existe encore aucun message
   *
   * 3. les admins comme contacts disponibles
   */
  async findMesConversations(
    userId: string,
  ): Promise<Message[]> {
    /*
     * Messages existants.
     */
    const messages =
      await this.repo
        .createQueryBuilder('message')

        .leftJoinAndSelect(
          'message.expediteur',
          'expediteur',
        )

        .leftJoinAndSelect(
          'message.destinataire',
          'destinataire',
        )

        .where(
          `
          message.expediteurId = :userId
          OR
          message.destinataireId = :userId
          `,
          {
            userId,
          },
        )

        .orderBy(
          'message.dateEnvoi',
          'DESC',
        )

        .getMany();

    /*
     * Contacts autorisés grâce à une candidature acceptée.
     */
    const contactsCandidatures =
      await this.candidaturesService.findContactsAvecCandidatureAcceptee(
        userId,
      );

    /*
     * Les admins sont toujours joignables.
     */
    const admins =
      await this.usersService.findAll(
        Role.ADMIN,
      );

    /*
     * Map de tous les contacts autorisés.
     */
    const contacts =
      new Map<string, Utilisateur>();

    for (const contact of contactsCandidatures) {
      if (
        contact.id !== userId
      ) {
        contacts.set(
          contact.id,
          contact,
        );
      }
    }

    for (const admin of admins) {
      if (
        admin.id !== userId
      ) {
        contacts.set(
          admin.id,
          admin,
        );
      }
    }

    /*
     * Contacts qui ont déjà un historique.
     */
    const contactsAvecHistorique =
      new Set<string>();

    for (const message of messages) {
      if (
        message.expediteurId === userId
      ) {
        contactsAvecHistorique.add(
          message.destinataireId,
        );
      } else {
        contactsAvecHistorique.add(
          message.expediteurId,
        );
      }
    }

    /*
     * Pour les contacts autorisés sans historique,
     * on crée un objet de présentation temporaire.
     *
     * Il n'est PAS enregistré en base.
     *
     * Le frontend peut donc afficher :
     *
     * "Nouvelle conversation"
     */
    for (const contact of contacts.values()) {
      if (
        contactsAvecHistorique.has(
          contact.id,
        )
      ) {
        continue;
      }

      const conversationVirtuelle =
        {
          id: `conversation-${contact.id}`,

          expediteurId: userId,

          destinataireId: contact.id,

          contenu: '',

          estLu: true,

          dateEnvoi: new Date(0),

          expediteur:
            undefined,

          destinataire:
            contact,
        } as unknown as Message;

      messages.push(
        conversationVirtuelle,
      );
    }

    /*
     * On trie les messages.
     *
     * Les conversations sans historique sont
     * placées après les conversations existantes.
     */
    return messages.sort(
      (a, b) => {
        const dateA =
          a.dateEnvoi instanceof Date
            ? a.dateEnvoi.getTime()
            : new Date(
                a.dateEnvoi,
              ).getTime();

        const dateB =
          b.dateEnvoi instanceof Date
            ? b.dateEnvoi.getTime()
            : new Date(
                b.dateEnvoi,
              ).getTime();

        return dateB - dateA;
      },
    );
  }

  /**
   * ========================================================
   * COMPTER LES MESSAGES NON LUS
   * ========================================================
   */
  async compterNonLus(userId: string): Promise<number> {
    return this.repo.count({
      where: {
        destinataireId: userId,
        estLu: false,
      },
    });
  }

  /**
   * ========================================================
   * MARQUER COMME LU
   * ========================================================
   */
  async marquerCommeLu(
    messageId: string,
    userId: string,
  ): Promise<void> {
    await this.repo.update(
      {
        id: messageId,
        destinataireId: userId,
      },
      {
        estLu: true,
      },
    );

    const total = await this.compterNonLus(userId);
    this.realtimeGateway.emitToUser(userId, 'message:compteur', { total });
  }
}