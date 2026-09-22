import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { Message } from './entities/message.entity';
import { MessageGroupeLecture } from './entities/message-groupe-lecture.entity';
import { EnvoyerMessageDto } from './dto/envoyer-message.dto';
import { EnvoyerMessageGroupeDto } from './dto/envoyer-message-groupe.dto';
import {
  CompteurNonLus,
  ConversationGroupe,
  ConversationIndividuelle,
  ConversationResume,
  TypeConversation,
} from './interfaces/conversation-resume.interface';

import { CandidaturesService } from '../candidatures/candidatures.service';
import { AmitieService } from '../amitie/amitie.service';
import { UsersService } from '../users/users.service';
import { GroupesService } from '../groupes/groupes.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

import { Role } from '../../common/enums/role.enum';
import { Utilisateur } from '../users/entities/utilisateur.entity';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly repo: Repository<Message>,

    @InjectRepository(MessageGroupeLecture)
    private readonly lectureRepo: Repository<MessageGroupeLecture>,

    private readonly candidaturesService: CandidaturesService,

    private readonly amitieService: AmitieService,

    private readonly usersService: UsersService,

    private readonly groupesService: GroupesService,

    private readonly realtimeGateway: RealtimeGateway,
  ) { }

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
     * Pour les autres utilisateurs :
     * - une candidature acceptée autorise la conversation ;
     * - ou une amitié acceptée entre deux étudiants.
     */
    const candidatureAutorisee =
      await this.candidaturesService.existeCandidatureAccepteeEntre(
        expediteurId,
        destinataireId,
      );

    const amitieAutorisee =
      !candidatureAutorisee &&
      expediteur.role === Role.ETUDIANT &&
      destinataire.role === Role.ETUDIANT &&
      await this.amitieService.sontAmis(
        expediteurId,
        destinataireId,
      );

    const autorisee =
      candidatureAutorisee || amitieAutorisee;

    if (!autorisee) {
      throw new ForbiddenException(
        "La messagerie est disponible uniquement après l'acceptation d'une candidature ou d'une amitié.",
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

    const conversation = await this.repo
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

    // Les messages supprimes logiquement voyagent avec un contenu masque.
    return conversation.map((message) => this.masquerSupprime(message));
  }

  /**
   * ========================================================
   * MES CONVERSATIONS
   * ========================================================
   *
   * Retourne :
   *
   * 1. les conversations individuelles ayant déjà des messages
   *
   * 2. les contacts issus de candidatures acceptées
   *    même s'il n'existe encore aucun message
   *
   * 3. les admins comme contacts disponibles
   *
   * 4. les conversations de groupe : UNE entrée par groupe dont
   *    l'utilisateur est membre actif (regle membres_groupes,
   *    identique a GroupesService.verifierMembreActif) ; un groupe
   *    sans message apparait avec dernierMessage = null.
   *
   * Chaque entree porte un champ `type` (INDIVIDUEL | GROUPE) ;
   * les entrees individuelles conservent integralement le format
   * Message historique pour compatibilite avec le frontend existant.
   */
  async findMesConversations(
    userId: string,
  ): Promise<ConversationResume[]> {
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

        /*
         * Les messages de groupe n'appartiennent a aucune conversation
         * individuelle : ils disposent de leur propre endpoint
         * (GET /messages/groupes/:groupeId).
         */
        .andWhere('message.groupeId IS NULL')

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
      if (!message.destinataireId) {
        // Securite de typage : les messages de groupe (destinataire NULL)
        // sont deja filtres par la requete ci-dessus.
        continue;
      }

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
     *
     * Les messages supprimés logiquement sont d'abord masqués (contenu
     * remplacé par un tombstone « Message supprimé »).
     */
    const individuellesTriees = messages
      .map((message) => this.masquerSupprime(message))
      .sort(
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

    /*
     * Enrichissement des entrees individuelles : le format historique
     * (Message) est conserve, on ajoute le discriminant de type et
     * l'interlocuteur pour la liste de conversations.
     */
    const conversationsIndividuelles: ConversationIndividuelle[] =
      individuellesTriees.map((message) => {
        const autre =
          message.expediteurId === userId
            ? message.destinataire
            : message.expediteur;

        return {
          ...message,
          type: TypeConversation.INDIVIDUEL,
          utilisateurId: autre?.id ?? message.destinataireId ?? '',
          nom: autre?.nom ?? '',
        };
      });

    /*
     * Conversations de groupe : une entree par groupe dont l'utilisateur
     * est membre actif, avec son dernier message et son nombre de non lus.
     */
    const conversationsGroupes =
      await this.conversationsGroupeResume(userId);

    /*
     * Fusion des deux types, triee par activite recente (dernier message
     * de groupe ou date d'envoi individuel). Les entrees sans activite
     * (groupe sans message, conversation individuelle virtuelle) restent
     * en fin de liste.
     */
    return [
      ...conversationsIndividuelles,
      ...conversationsGroupes,
    ].sort((a, b) => {
      const dateA = dateDerniereActivite(a);
      const dateB = dateDerniereActivite(b);

      if (dateA === null && dateB === null) {
        return 0;
      }
      if (dateA === null) {
        return 1;
      }
      if (dateB === null) {
        return -1;
      }

      return dateB - dateA;
    });
  }

  /**
   * ========================================================
   * COMPTER LES MESSAGES NON LUS
   * ========================================================
   *
   * Les messages supprimes logiquement ne comptent pas comme non lus :
   * leur contenu n'est plus visible.
   *
   * total = individuels + groupes (voir compterNonLusDetaille).
   */
  async compterNonLus(userId: string): Promise<number> {
    const detail = await this.compterNonLusDetaille(userId);
    return detail.total;
  }

  /**
   * Compteur detaille des messages non lus : individuels, groupes et
   * total. `total` reste individuels + groupes (contrat historique du
   * badge MessagesLink, qui reste retrocompatible).
   */
  async compterNonLusDetaille(userId: string): Promise<CompteurNonLus> {
    /*
     * Messages individuels (comportement existant, inchangé).
     */
    const individuels = await this.repo.count({
      where: {
        destinataireId: userId,
        estLu: false,
        estSupprime: false,
      },
    });

    /*
     * Messages de groupe : un message de groupe est non lu tant qu'il
     * n'existe pas d'enregistrement de lecture pour l'utilisateur dans
     * message_groupe_lectures. L'auteur n'est jamais destinataire non lu
     * de son propre message.
     */
    const nonLusParGroupe = await this.compterNonLusParGroupe(userId);

    const groupes = [...nonLusParGroupe.values()].reduce(
      (somme, total) => somme + total,
      0,
    );

    return {
      total: individuels + groupes,
      individuels,
      groupes,
    };
  }

  /**
   * Compteur de messages non lus GROUPES par groupeId.
   *
   * Reutilise exactement la regle existante (ancienne compterNonLusGroupes,
   * etendue par un GROUP BY) :
   * - message de groupe non supprime, ecrit par un autre membre ;
   * - l'utilisateur doit etre membre actif (ligne dans membres_groupes) ;
   * - pas de lecture enregistree dans message_groupe_lectures.
   *
   * Le champ estLu persiste n'est PAS utilise pour les groupes : il reste
   * reserve au fonctionnement individuel.
   */
  private async compterNonLusParGroupe(
    userId: string,
  ): Promise<Map<string, number>> {
    const lignes = await this.repo.query(
      `
      SELECT m.groupe_id, COUNT(*)::int AS total
      FROM messages m
      WHERE m.groupe_id IS NOT NULL
        AND m.est_supprime = false
        AND m.expediteur_id <> $1
        AND EXISTS (
          SELECT 1
          FROM membres_groupes mg
          WHERE mg.groupe_id = m.groupe_id
            AND mg.etudiant_id = $1
        )
        AND NOT EXISTS (
          SELECT 1
          FROM message_groupe_lectures l
          WHERE l.message_id = m.id
            AND l.utilisateur_id = $1
        )
      GROUP BY m.groupe_id
      `,
      [userId],
    );

    return new Map(
      lignes.map((ligne: { groupe_id: string; total: number }) => [
        ligne.groupe_id as string,
        Number(ligne.total ?? 0),
      ]),
    );
  }

  /**
   * ========================================================
   * RESUME DES CONVERSATIONS DE GROUPE
   * ========================================================
   *
   * Une entree par groupe dont l'utilisateur est membre actif.
   * La regle d'appartenance est la MEME que
   * GroupesService.verifierMembreActif : une ligne dans
   * membres_groupes. Un ancien membre (ligne supprimee au depart)
   * n'obtient donc PAS d'entree pour son ancien groupe.
   *
   * Performances : une seule requete groupee recupere groupe, nom,
   * nombre de membres et identifiant du dernier message (LEFT JOIN
   * LATERAL, evite le N+1). Les derniers messages sont ensuite charges
   * en une seule requete via In() ; les non lus par groupe proviennent
   * de compterNonLusParGroupe (une requete GROUP BY).
   *
   * Un groupe sans message apparait avec dernierMessage = null :
   * aucun message artificiel n'est cree.
   */
  private async conversationsGroupeResume(
    userId: string,
  ): Promise<ConversationGroupe[]> {
    const lignes = (await this.repo.query(
      `
      SELECT
        g.id AS groupe_id,
        g.nom AS nom,
        (
          SELECT COUNT(*)::int
          FROM membres_groupes mg2
          WHERE mg2.groupe_id = g.id
        ) AS nombre_membres,
        m.id AS dernier_message_id
      FROM groupes g
      JOIN membres_groupes mg
        ON mg.groupe_id = g.id
       AND mg.etudiant_id = $1
      LEFT JOIN LATERAL (
        SELECT id
        FROM messages m2
        WHERE m2.groupe_id = g.id
        ORDER BY m2.date_envoi DESC
        LIMIT 1
      ) m ON TRUE
      ORDER BY g.nom ASC
      `,
      [userId],
    )) as Array<{
      groupe_id: string;
      nom: string;
      nombre_membres: number;
      dernier_message_id: string | null;
    }>;

    if (lignes.length === 0) {
      return [];
    }

    /*
     * Chargement en une requete des derniers messages (avec expediteur),
     * puis masquage du contenu des messages supprimes logiquement :
     * meme convention que les conversations individuelles.
     */
    const idsDerniersMessages = lignes
      .map((ligne) => ligne.dernier_message_id)
      .filter((id): id is string => Boolean(id));

    const derniersMessages = new Map<string, Message>();

    if (idsDerniersMessages.length > 0) {
      const messages = await this.repo.find({
        where: { id: In(idsDerniersMessages) },
        relations: ['expediteur'],
      });

      for (const message of messages) {
        derniersMessages.set(message.id, this.masquerSupprime(message));
      }
    }

    const nonLusParGroupe = await this.compterNonLusParGroupe(userId);

    return lignes.map((ligne) => ({
      type: TypeConversation.GROUPE,
      groupeId: ligne.groupe_id,
      nom: ligne.nom,
      nombreMembres: Number(ligne.nombre_membres ?? 0),
      dernierMessage: ligne.dernier_message_id
        ? derniersMessages.get(ligne.dernier_message_id) ?? null
        : null,
      nonLus: nonLusParGroupe.get(ligne.groupe_id) ?? 0,
    }));
  }

  /**
   * ========================================================
   * SUPPRIMER UN MESSAGE (SUPPRESSION LOGIQUE)
   * ========================================================
   *
   * Permission : seul l'EXPEDITEUR d'un message peut le supprimer —
   * un utilisateur ne peut jamais supprimer le message d'un autre
   * utilisateur, meme en modifiant l'identifiant envoye (verifie cote
   * backend sur le message reellement stocke).
   *
   * Conservation de l'historique : le message est marque estSupprime
   * (tombstone) au lieu d'etre efface physiquement ; son contenu est
   * masque dans toutes les lectures (voir masquerSupprime) et les deux
   * participants voient « Message supprime ». L'operation est
   * idempotente.
   *
   * S'applique aussi aux messages de groupe : l'auteur d'un message de
   * groupe peut supprimer son propre message (meme regle, meme
   * tombstone), apres verification de son appartenance au groupe ; les
   * membres sont informes en temps reel (message:groupe:supprime).
   */
  async supprimer(messageId: string, userId: string): Promise<void> {
    const message = await this.repo.findOne({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message introuvable');
    }

    if (message.expediteurId !== userId) {
      throw new ForbiddenException(
        'Vous ne pouvez supprimer que vos propres messages',
      );
    }

    if (message.estSupprime) {
      // Deja supprime : rien a faire (idempotent).
      return;
    }

    /*
     * Message de GROUPE : l'auteur reste soumis a la regle d'appartenance
     * (le fait d'etre chef n'accorde aucun privilege supplementaire sur la
     * messagerie). Verification AVANT la suppression logique.
     */
    if (message.groupeId) {
      await this.groupesService.verifierMembreActif(message.groupeId, userId);
    }

    message.estSupprime = true;
    message.supprimeParId = userId;
    await this.repo.save(message);

    if (message.groupeId) {
      // Temps reel : tous les membres du groupe mettent a jour leur fil.
      await this.notifierSuppressionGroupe(message);
      return;
    }

    // Temps reel : les deux participants mettent a jour leur fil.
    this.realtimeGateway.emitToUser(
      message.expediteurId,
      'message:supprime',
      { id: message.id },
    );
    if (message.destinataireId) {
      this.realtimeGateway.emitToUser(
        message.destinataireId,
        'message:supprime',
        { id: message.id },
      );

      // Le contenu n'etant plus visible, il ne compte plus dans le compteur
      // de non lus du destinataire s'il n'avait pas encore ete lu.
      if (!message.estLu) {
        const total = await this.compterNonLus(message.destinataireId);
        this.realtimeGateway.emitToUser(
          message.destinataireId,
          'message:compteur',
          { total },
        );
      }
    }
  }

  /**
   * Masque le contenu des messages supprimes logiquement avant envoi au
   * frontend. Le tombstone est conserve (id, date, drapeau estSupprime)
   * afin que l'interface affiche « Message supprime » a la bonne place
   * dans la conversation sans reveler le contenu d'origine.
   */
  private masquerSupprime<T extends {
    contenu: string;
    pieceJointeUrl?: string | null;
    pieceJointeNom?: string | null;
    estSupprime?: boolean;
  }>(message: T): T {
    if (!message.estSupprime) {
      return message;
    }
    return {
      ...message,
      contenu: '',
      pieceJointeUrl: null,
      pieceJointeNom: null,
    };
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

  /**
   * ========================================================
   * MESSAGERIE DE GROUPE
   * ========================================================
   *
   * Un message de groupe est stocke UNE SEULE fois dans messages
   * (destinataire_id NULL, groupe_id renseigne) ; aucun enregistrement
   * par membre. Chaque membre materialise sa lecture dans
   * message_groupe_lectures.
   *
   * Le chef et les membres sont soumis aux MEMES regles de messagerie :
   * toutes les verifications d'appartenance sont deleguees a
   * GroupesService (les regles de gestion du groupe restent dans son
   * module).
   */

  /**
   * ENVOYER UN MESSAGE A UN GROUPE
   *
   * 1. le groupe doit exister ;
   * 2. l'expediteur doit etre membre du groupe ;
   * 3. son adhesion doit etre active (ligne dans membres_groupes) ;
   * 4. un seul enregistrement est cree dans messages ;
   * 5. les membres sont notifies en temps reel via leurs rooms
   *    user:<id> (evenement message:groupe:nouveau).
   */
  async envoyerAuGroupe(
    expediteurId: string,
    groupeId: string,
    dto: EnvoyerMessageGroupeDto,
  ): Promise<Message> {
    /*
     * Verification centralisee dans GroupesService :
     * groupe existant + membre actif (sinon NotFound/Forbidden).
     */
    await this.groupesService.verifierMembreActif(groupeId, expediteurId);

    const message = this.repo.create({
      contenu: dto.contenu,
      pieceJointeUrl: dto.pieceJointeUrl ?? null,
      pieceJointeNom: dto.pieceJointeNom ?? null,
      expediteurId,
      destinataireId: null,
      groupeId,
    });

    const saved = await this.repo.save(message);

    /*
     * Recharge avec l'expediteur et le groupe : le payload temps reel a la
     * meme forme que les messages renvoyes par
     * GET /messages/groupes/:groupeId, ce que le frontend attend.
     */
    const messageComplet = await this.repo.findOne({
      where: { id: saved.id },
      relations: ['expediteur', 'groupe'],
    });

    if (messageComplet) {
      await this.notifierNouveauMessageGroupe(
        groupeId,
        messageComplet,
        expediteurId,
      );
    }

    return saved;
  }

  /**
   * CONSULTER LA CONVERSATION D'UN GROUPE
   *
   * Reservee aux membres actifs du groupe (404 si le groupe n'existe pas,
   * 403 sinon). Messages dans l'ordre chronologique. Pour chaque message,
   * estLu est renseigne dynamiquement pour l'utilisateur courant (le
   * drapeau persiste n'est pas utilise pour les messages de groupe).
   */
  async findConversationGroupe(
    userId: string,
    groupeId: string,
  ): Promise<Message[]> {
    await this.groupesService.verifierMembreActif(groupeId, userId);

    const messages = await this.repo
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.expediteur', 'expediteur')
      .where('message.groupeId = :groupeId', { groupeId })
      .orderBy('message.dateEnvoi', 'ASC')
      .getMany();

    /*
     * Etat de lecture pour l'utilisateur courant.
     */
    let messagesLus = new Set<string>();

    if (messages.length > 0) {
      const lectures = await this.lectureRepo.find({
        where: {
          utilisateurId: userId,
          messageId: In(messages.map((message) => message.id)),
        },
      });

      messagesLus = new Set(lectures.map((lecture) => lecture.messageId));
    }

    for (const message of messages) {
      message.estLu =
        message.expediteurId === userId || messagesLus.has(message.id);
    }

    // Les messages supprimes logiquement voyagent avec un contenu masque.
    return messages.map((message) => this.masquerSupprime(message));
  }


  /**
   * MARQUER COMME LUS LES MESSAGES D'UN GROUPE
   *
   * Cree une entree de lecture pour chaque message du groupe non supprime
   * et non ecrit par l'utilisateur, puis met a jour son compteur temps
   * reel. Retourne le nombre de messages nouvellement marques comme lus.
   */
  async marquerMessagesGroupeCommeLus(
    userId: string,
    groupeId: string,
  ): Promise<number> {
    await this.groupesService.verifierMembreActif(groupeId, userId);

    const messagesGroupe = await this.repo.find({
      where: { groupeId, estSupprime: false },
      select: ['id', 'expediteurId'],
    });

    /*
     * L'auteur n'est pas destinataire non lu de son propre message.
     */
    const idsCandidats = messagesGroupe
      .filter((message) => message.expediteurId !== userId)
      .map((message) => message.id);

    if (idsCandidats.length === 0) {
      return 0;
    }

    const lecturesExistantes = await this.lectureRepo.find({
      where: {
        utilisateurId: userId,
        messageId: In(idsCandidats),
      },
      select: ['messageId'],
    });

    const dejaLus = new Set(
      lecturesExistantes.map((lecture) => lecture.messageId),
    );

    const aInserer = idsCandidats
      .filter((messageId) => !dejaLus.has(messageId))
      .map((messageId) =>
        this.lectureRepo.create({ messageId, utilisateurId: userId }),
      );

    if (aInserer.length > 0) {
      /*
       * orIgnore() -> ON CONFLICT DO NOTHING : la cle unique
       * (message_id, utilisateur_id) empeche tout doublon, meme en cas
       * d'appels concurrents.
       */
      await this.lectureRepo
        .createQueryBuilder()
        .insert()
        .into(MessageGroupeLecture)
        .values(aInserer)
        .orIgnore()
        .execute();
    }

    const total = await this.compterNonLus(userId);
    this.realtimeGateway.emitToUser(userId, 'message:compteur', { total });

    return aInserer.length;
  }

  /**
   * Diffuse un nouveau message de groupe aux rooms user:<id> de tous les
   * membres (expediteur inclus : synchronisation multi-onglets), puis met
   * a jour le compteur de non lus de chaque membre autre que l'auteur.
   */
  private async notifierNouveauMessageGroupe(
    groupeId: string,
    message: Message,
    expediteurId: string,
  ): Promise<void> {
    const membres = await this.groupesService.trouverMembres(groupeId);

    for (const membre of membres) {
      this.realtimeGateway.emitToUser(
        membre.etudiantId,
        'message:groupe:nouveau',
        message,
      );
    }

    for (const membre of membres) {
      if (membre.etudiantId === expediteurId) {
        continue;
      }

      const total = await this.compterNonLus(membre.etudiantId);
      this.realtimeGateway.emitToUser(membre.etudiantId, 'message:compteur', {
        total,
      });
    }
  }

  /**
   * Informe les membres de la suppression logique d'un message de groupe
   * (message:groupe:supprime) et rafraichit leurs compteurs de non lus.
   */
  private async notifierSuppressionGroupe(message: Message): Promise<void> {
    if (!message.groupeId) {
      return;
    }

    const membres = await this.groupesService.trouverMembres(message.groupeId);

    for (const membre of membres) {
      this.realtimeGateway.emitToUser(
        membre.etudiantId,
        'message:groupe:supprime',
        {
          id: message.id,
          groupeId: message.groupeId,
        },
      );
    }

    for (const membre of membres) {
      if (membre.etudiantId === message.expediteurId) {
        continue;
      }

      const total = await this.compterNonLus(membre.etudiantId);
      this.realtimeGateway.emitToUser(membre.etudiantId, 'message:compteur', {
        total,
      });
    }
  }
}

/**
 * Date de derniere activite d'une ligne de conversation, utilisee pour
 * trier la liste fusionnee (individuels + groupes) de GET /messages :
 * - conversation individuelle : dateEnvoi de son dernier message ;
 * - conversation de groupe : dateEnvoi du dernier message du groupe,
 *   ou null si le groupe n'a encore aucun message (place en fin de liste).
 */
function dateDerniereActivite(
  conversation: ConversationResume,
): number | null {
  if (conversation.type === TypeConversation.GROUPE) {
    const dernier = conversation.dernierMessage?.dateEnvoi;
    if (!dernier) {
      return null;
    }
    return dernier instanceof Date ? dernier.getTime() : new Date(dernier).getTime();
  }

  const date = conversation.dateEnvoi;
  return date instanceof Date ? date.getTime() : new Date(date).getTime();
}