import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Candidature } from './entities/candidature.entity';
import { CreateCandidatureDto } from './dto/create-candidature.dto';

import { StatutCandidature } from '../../common/enums/statut-candidature.enum';
import { StatutMission } from '../../common/enums/statut-mission.enum';

import { MissionsService } from '../missions/missions.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TypeNotification } from '../../common/enums/type-notification.enum';

import { Utilisateur } from '../users/entities/utilisateur.entity';

@Injectable()
export class CandidaturesService {
  constructor(
    @InjectRepository(Candidature)
    private readonly repo: Repository<Candidature>,

    private readonly missionsService: MissionsService,

    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * ========================================================
   * CREER UNE CANDIDATURE
   * ========================================================
   *
   * RG2 :
   * Un étudiant ne peut envoyer qu'une seule candidature
   * par mission.
   *
   * RG3 :
   * Une mission fermée ou dont la date limite est dépassée
   * refuse toute nouvelle candidature.
   */
  async create(
    missionId: string,
    etudiantId: string,
    dto: CreateCandidatureDto,
  ): Promise<Candidature> {
    const mission =
      await this.missionsService.findOne(missionId);

    this.missionsService.assertMissionOuverteAuxCandidatures(
      mission,
    );

    const dejaCandidat =
      await this.repo.findOne({
        where: {
          missionId,
          etudiantId,
        },
      });

    if (dejaCandidat) {
      throw new ConflictException(
        'Vous avez deja postule a cette mission',
      );
    }

    const candidature =
      this.repo.create({
        ...dto,
        missionId,
        etudiantId,
        statut:
          StatutCandidature.EN_ATTENTE,
      });

    const saved =
      await this.repo.save(candidature);

    await this.notificationsService.creer({
      destinataireId:
        mission.clientId,

      type:
        TypeNotification.NOUVELLE_CANDIDATURE,

      titre:
        'Nouvelle candidature reçue',

      message: `Une nouvelle candidature a été déposée pour "${mission.titre}".`,

      lienUrl:
        '/tableau-de-bord/mes-missions',
    });

    return saved;
  }

  /**
   * ========================================================
   * CANDIDATURES D'UNE MISSION
   * ========================================================
   *
   * Utilisé côté client.
   */
  async findByMission(
    missionId: string,
    clientId: string,
  ): Promise<Candidature[]> {
    const mission =
      await this.missionsService.findOne(
        missionId,
      );

    if (
      mission.clientId !== clientId
    ) {
      throw new ForbiddenException(
        'Vous ne pouvez consulter que les candidatures de vos propres missions',
      );
    }

    return this.repo.find({
      where: {
        missionId,
      },

      relations: [
        'etudiant',
        'etudiant.utilisateur',
        'livraison',
      ],

      order: {
        dateCandidature: 'DESC',
      },
    });
  }

  /**
   * ========================================================
   * CANDIDATURES D'UN ETUDIANT
   * ========================================================
   *
   * On charge :
   *
   * - la mission
   * - le client
   * - l'utilisateur du client
   * - la livraison
   *
   * La relation livraison permet au frontend de savoir
   * si l'étudiant a déjà déposé une livraison.
   */
  async findByEtudiant(
    etudiantId: string,
  ): Promise<Candidature[]> {
    return this.repo.find({
      where: {
        etudiantId,
      },

      relations: [
        'mission',
        'mission.client',
        'mission.client.utilisateur',
        'livraison',
      ],

      order: {
        dateCandidature: 'DESC',
      },
    });
  }

  /**
   * ========================================================
   * CANDIDATURES D'UN CLIENT
   * ========================================================
   *
   * Toutes les candidatures reçues sur les missions
   * du client connecté.
   */
  async findByClient(
    clientId: string,
  ): Promise<Candidature[]> {
    return this.repo
      .createQueryBuilder(
        'candidature',
      )

      .innerJoinAndSelect(
        'candidature.mission',
        'mission',
      )

      .leftJoinAndSelect(
        'candidature.etudiant',
        'etudiant',
      )

      .leftJoinAndSelect(
        'etudiant.utilisateur',
        'utilisateur',
      )

      .leftJoinAndSelect(
        'candidature.livraison',
        'livraison',
      )

      .where(
        'mission.clientId = :clientId',
        {
          clientId,
        },
      )

      .orderBy(
        'candidature.dateCandidature',
        'DESC',
      )

      .getMany();
  }

  /**
   * ========================================================
   * UNE CANDIDATURE
   * ========================================================
   */
  async findOne(
    id: string,
  ): Promise<Candidature> {
    const candidature =
      await this.repo.findOne({
        where: {
          id,
        },

        relations: [
          'mission',
          'mission.client',
          'mission.client.utilisateur',
          'etudiant',
          'etudiant.utilisateur',
          'livraison',
        ],
      });

    if (!candidature) {
      throw new NotFoundException(
        'Candidature introuvable',
      );
    }

    return candidature;
  }

  /**
   * ========================================================
   * ACCEPTER UNE CANDIDATURE
   * ========================================================
   */
  async accepter(
    id: string,
    clientId: string,
  ): Promise<Candidature> {
    const candidature =
      await this.findOne(id);

    if (
      candidature.mission.clientId !==
      clientId
    ) {
      throw new ForbiddenException(
        'Vous ne pouvez traiter que les candidatures de vos propres missions',
      );
    }

    if (
      candidature.statut !==
      StatutCandidature.EN_ATTENTE
    ) {
      throw new BadRequestException(
        'Cette candidature a deja ete traitee',
      );
    }

    candidature.statut =
      StatutCandidature.ACCEPTEE;

    await this.repo.save(
      candidature,
    );

    /**
     * Les autres candidatures de la même mission
     * sont automatiquement refusées.
     */
    await this.repo
      .createQueryBuilder()
      .update(Candidature)
      .set({
        statut:
          StatutCandidature.REFUSEE,
      })
      .where(
        'missionId = :missionId AND id != :id',
        {
          missionId:
            candidature.missionId,
          id:
            candidature.id,
        },
      )
      .andWhere(
        'statut = :statut',
        {
          statut:
            StatutCandidature.EN_ATTENTE,
        },
      )
      .execute();

    /**
     * La mission passe en cours.
     */
    await this.missionsService.setStatut(
      candidature.missionId,
      StatutMission.EN_COURS,
    );

    /**
     * Notification de l'étudiant.
     */
    await this.notificationsService.creer({
      destinataireId:
        candidature.etudiant
          .utilisateurId,

      type:
        TypeNotification.CANDIDATURE_ACCEPTEE,

      titre:
        'Candidature acceptée',

      message: `Votre candidature pour "${candidature.mission.titre}" a été acceptée.`,

      lienUrl:
        '/tableau-de-bord/candidatures',
    });

    return candidature;
  }

  /**
   * ========================================================
   * REFUSER UNE CANDIDATURE
   * ========================================================
   */
  async refuser(
    id: string,
    clientId: string,
  ): Promise<Candidature> {
    const candidature =
      await this.findOne(id);

    if (
      candidature.mission.clientId !==
      clientId
    ) {
      throw new ForbiddenException(
        'Vous ne pouvez traiter que les candidatures de vos propres missions',
      );
    }

    if (
      candidature.statut !==
      StatutCandidature.EN_ATTENTE
    ) {
      throw new BadRequestException(
        'Cette candidature a deja ete traitee',
      );
    }

    candidature.statut =
      StatutCandidature.REFUSEE;

    const saved =
      await this.repo.save(
        candidature,
      );

    await this.notificationsService.creer({
      destinataireId:
        candidature.etudiant
          .utilisateurId,

      type:
        TypeNotification.CANDIDATURE_REFUSEE,

      titre:
        'Candidature refusée',

      message: `Votre candidature pour "${candidature.mission.titre}" a été refusée.`,

      lienUrl:
        '/tableau-de-bord/candidatures',
    });

    return saved;
  }

  /**
   * ========================================================
   * MESSAGERIE
   * ========================================================
   *
   * Vérifie qu'une candidature acceptée existe entre
   * deux utilisateurs.
   *
   * Le sens n'a pas d'importance.
   */
  async existeCandidatureAccepteeEntre(
    utilisateurAId: string,
    utilisateurBId: string,
  ): Promise<boolean> {
    if (
      !utilisateurAId ||
      !utilisateurBId ||
      utilisateurAId ===
        utilisateurBId
    ) {
      return false;
    }

    const count =
      await this.repo
        .createQueryBuilder(
          'candidature',
        )

        .innerJoin(
          'candidature.mission',
          'mission',
        )

        .innerJoin(
          'candidature.etudiant',
          'etudiant',
        )

        .innerJoin(
          'mission.client',
          'client',
        )

        .where(
          'candidature.statut = :statut',
          {
            statut:
              StatutCandidature.ACCEPTEE,
          },
        )

        .andWhere(
          `
          (
            (
              etudiant.utilisateurId = :a
              AND client.utilisateurId = :b
            )
            OR
            (
              etudiant.utilisateurId = :b
              AND client.utilisateurId = :a
            )
          )
          `,
          {
            a:
              utilisateurAId,
            b:
              utilisateurBId,
          },
        )

        .getCount();

    return count > 0;
  }

  /**
   * ========================================================
   * CONTACTS AUTORISES A DISCUTER
   * ========================================================
   *
   * Retourne les utilisateurs avec lesquels
   * l'utilisateur courant peut discuter.
   *
   * Cela permet notamment d'afficher un contact
   * dans /messages même lorsqu'aucun message n'a
   * encore été envoyé.
   */
  async findContactsAvecCandidatureAcceptee(
    utilisateurId: string,
  ): Promise<Utilisateur[]> {
    const candidatures =
      await this.repo
        .createQueryBuilder(
          'candidature',
        )

        .innerJoinAndSelect(
          'candidature.mission',
          'mission',
        )

        .leftJoinAndSelect(
          'mission.client',
          'client',
        )

        .leftJoinAndSelect(
          'client.utilisateur',
          'clientUtilisateur',
        )

        .leftJoinAndSelect(
          'candidature.etudiant',
          'etudiant',
        )

        .leftJoinAndSelect(
          'etudiant.utilisateur',
          'etudiantUtilisateur',
        )

        .where(
          'candidature.statut = :statut',
          {
            statut:
              StatutCandidature.ACCEPTEE,
          },
        )

        .andWhere(
          `
          (
            etudiant.utilisateurId = :utilisateurId
            OR
            client.utilisateurId = :utilisateurId
          )
          `,
          {
            utilisateurId,
          },
        )

        .getMany();

    const contacts =
      new Map<
        string,
        Utilisateur
      >();

    for (
      const candidature of candidatures
    ) {
      const etudiant =
        candidature.etudiant
          ?.utilisateur;

      const client =
        candidature.mission
          ?.client
          ?.utilisateur;

      if (
        etudiant &&
        etudiant.id !==
          utilisateurId
      ) {
        contacts.set(
          etudiant.id,
          etudiant,
        );
      }

      if (
        client &&
        client.id !==
          utilisateurId
      ) {
        contacts.set(
          client.id,
          client,
        );
      }
    }

    return Array.from(
      contacts.values(),
    );
  }

  /**
   * ========================================================
   * VERIFICATION CANDIDATURE ACCEPTEE
   * ========================================================
   *
   * RG8 :
   * Un étudiant ne peut livrer un projet que pour
   * une mission dont sa candidature a été acceptée.
   */
  assertCandidatureAcceptee(
    candidature: Candidature,
  ): void {
    if (
      candidature.statut !==
      StatutCandidature.ACCEPTEE
    ) {
      throw new BadRequestException(
        "Seule une candidature acceptee autorise le depot d'une livraison",
      );
    }
  }
}