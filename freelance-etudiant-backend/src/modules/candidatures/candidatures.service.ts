import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { Candidature } from './entities/candidature.entity';
import { CreateCandidatureDto } from './dto/create-candidature.dto';
import { Mission } from '../missions/entities/mission.entity';

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

    private readonly dataSource: DataSource,

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
   *
   * ATOMICITE ET CONCURRENCE :
   *  - Ecritures critiques (candidature acceptee, refus groupe des
   *    autres candidatures, passage de la mission EN_COURS) dans UNE
   *    SEULE transaction : soit tout reussit, soit rien n'est conserve.
   *  - Verrous pessimistes : la ligne MISSION est verrouillee d'abord
   *    (SELECT ... FOR UPDATE), puis la ligne CANDIDATURE — ordre
   *    constant, donc pas de deadlock entre deux acceptations
   *    concurrentes (deux candidatures differentes ou double requete).
   *  - Regles metier verifiees SOUS VERROU : candidature EN_ATTENTE
   *    (jamais acceptee deux fois), propriete du client, et mission
   *    OUVERTE (une mission EXPIREE / TERMINEE / deja EN_COURS refuse
   *    toute acceptation).
   *  - Notifications (secondaires) envoyees APRES le commit.
   */
  async accepter(
    id: string,
    clientId: string,
  ): Promise<Candidature> {
    // Lecture initiale : erreurs rapides avant d'ouvrir une transaction.
    const candidatureInitiale = await this.findOne(id);

    if (
      candidatureInitiale.mission.clientId !==
      clientId
    ) {
      throw new ForbiddenException(
        'Vous ne pouvez traiter que les candidatures de vos propres missions',
      );
    }

    if (
      candidatureInitiale.statut !==
      StatutCandidature.EN_ATTENTE
    ) {
      throw new BadRequestException(
        'Cette candidature a deja ete traitee',
      );
    }

    const missionId = candidatureInitiale.missionId;

    const resultat = await this.dataSource.transaction(
      async (manager) => {
        // 1. Verrou de la mission : serialise toute acceptation concurrente
        // de cette mission et fige son statut pendant la transaction.
        const mission = await manager.findOne(Mission, {
          where: { id: missionId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!mission) {
          throw new NotFoundException('Mission introuvable');
        }

        if (mission.clientId !== clientId) {
          throw new ForbiddenException(
            'Vous ne pouvez traiter que les candidatures de vos propres missions',
          );
        }

        if (mission.statut !== StatutMission.OUVERTE) {
          throw new ConflictException(
            "Cette mission n'accepte plus de candidature : impossible d'accepter une candidature sur une mission qui n'est plus ouverte.",
          );
        }

        // 2. Verrou de la ligne candidature : serialize les doubles
        // requetes portant sur la meme candidature.
        const candidatureVerrouillee = await manager.findOne(Candidature, {
          where: { id },
          lock: { mode: 'pessimistic_write' },
        });

        if (!candidatureVerrouillee) {
          throw new NotFoundException('Candidature introuvable');
        }

        if (
          candidatureVerrouillee.statut !==
          StatutCandidature.EN_ATTENTE
        ) {
          throw new ConflictException(
            'Cette candidature a deja ete traitee',
          );
        }

        // 3. Acceptation conditionnelle : si une requete concurrente a
        // deja modifie le statut, l'UPDATE n'affecte rien et on echoue.
        const resultatAcceptation = await manager.update(
          Candidature,
          { id, statut: StatutCandidature.EN_ATTENTE },
          { statut: StatutCandidature.ACCEPTEE },
        );

        if (
          !resultatAcceptation.affected ||
          resultatAcceptation.affected === 0
        ) {
          throw new ConflictException(
            'Cette candidature a deja ete traitee',
          );
        }

        // 4. Refus groupe des autres candidatures (dans la transaction),
        // precede de la lecture des lignes a notifier SOUS VERROU.
        const autresCandidaturesAAvertir = await manager.find(Candidature, {
          where: {
            missionId,
            statut: StatutCandidature.EN_ATTENTE,
          },
          relations: ['etudiant'],
        });

        await manager
          .createQueryBuilder()
          .update(Candidature)
          .set({ statut: StatutCandidature.REFUSEE })
          .where('missionId = :missionId AND id != :id', {
            missionId,
            id,
          })
          .andWhere('statut = :statut', {
            statut: StatutCandidature.EN_ATTENTE,
          })
          .execute();

        // 5. Passage de la mission EN_COURS, conditionne a son statut
        // courant (defense en profondeur apres le verrou). Un affected 0
        // echoue et ROLLBACK l'ensemble : aucune candidature acceptee sur
        // une mission non ouverte.
        const resultatMission = await manager.update(
          Mission,
          { id: missionId, statut: StatutMission.OUVERTE },
          { statut: StatutMission.EN_COURS },
        );

        if (!resultatMission.affected || resultatMission.affected === 0) {
          throw new ConflictException(
            "Cette mission n'accepte plus de candidature : impossible d'accepter une candidature sur une mission qui n'est plus ouverte.",
          );
        }

        candidatureVerrouillee.statut = StatutCandidature.ACCEPTEE;
        candidatureVerrouillee.mission = mission;

        return {
          candidature: candidatureVerrouillee,
          autres: autresCandidaturesAAvertir.filter((c) => c.id !== id),
        };
      },
    );

    // ============================================================
    // Effets de bord SECONDAIRES (post-commit) : les notifications ne
    // peuvent plus faire echouer l'acceptation ni laisser la base dans
    // un etat partiel.
    // ============================================================
    await Promise.all(
      resultat.autres.map((c) =>
        this.notificationsService.creer({
          destinataireId: c.etudiant.utilisateurId,
          type: TypeNotification.CANDIDATURE_REFUSEE,
          titre: 'Candidature refusée',
          message: `Votre candidature pour "${candidatureInitiale.mission.titre}" a été refusée.`,
          lienUrl: '/tableau-de-bord/candidatures',
        }),
      ),
    );

    await this.notificationsService.creer({
      destinataireId:
        resultat.candidature.etudiant.utilisateurId,

      type:
        TypeNotification.CANDIDATURE_ACCEPTEE,

      titre:
        'Candidature acceptée',

      message: `Votre candidature pour "${candidatureInitiale.mission.titre}" a été acceptée.`,

      lienUrl:
        '/tableau-de-bord/candidatures',
    });

    return resultat.candidature;
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

    // ============================================================
    // Transition ATOMIQUE EN_ATTENTE -> REFUSEE (UPDATE conditionnel
    // sur le statut courant). Garantit :
    //  - la meme candidature ne peut jamais etre refusee deux fois
    //    (double-clic, double requete) ;
    //  - pas de course avec accepter() : si l'acceptation a eu lieu
    //    entre-temps, l'UPDATE n'affecte rien -> 409, jamais un refus
    //    qui ecraserait une acceptation.
    // ============================================================
    const resultat = await this.repo.update(
      { id, statut: StatutCandidature.EN_ATTENTE },
      { statut: StatutCandidature.REFUSEE },
    );

    if (!resultat.affected || resultat.affected === 0) {
      throw new ConflictException(
        'Cette candidature a deja ete traitee',
      );
    }

    candidature.statut =
      StatutCandidature.REFUSEE;

    const saved = candidature;

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
   * CANDIDATURE ACCEPTEE ISSUE D'UNE DEMANDE DE SERVICE
   * ========================================================
   *
   * Utilisee par DemandesServiceService lors de l'acceptation d'une
   * demande de service : la mission privee vient d'etre creee, on cree
   * directement une candidature au statut "acceptee" pour reutiliser tout
   * le cycle existant (messagerie, livraison, paiement).
   */
  async creerAccepteeDirectement(
    params: {
      missionId: string;
      etudiantId: string;
      prixPropose: number;
      delaiPropose: number;
      message?: string;
    },
    manager?: EntityManager,
  ): Promise<Candidature> {
    const repo = manager?.getRepository(Candidature) ?? this.repo;
    const candidature = repo.create({
      missionId: params.missionId,
      etudiantId: params.etudiantId,
      prixPropose: params.prixPropose,
      delaiPropose: params.delaiPropose,
      message: params.message,
      statut: StatutCandidature.ACCEPTEE,
    });
    return repo.save(candidature);
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