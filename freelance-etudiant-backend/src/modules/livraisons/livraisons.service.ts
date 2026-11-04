import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";

import { InjectRepository } from "@nestjs/typeorm";
import { QueryFailedError, Repository } from "typeorm";

import { Livraison } from "./entities/livraison.entity";
import { Candidature } from "../candidatures/entities/candidature.entity";
import { Mission } from "../missions/entities/mission.entity";
import { StatutMission } from "../missions/enums/statut-mission.enum";

import {
  CreerLivraisonDto,
  DemanderCorrectionDto,
} from "./dto/livraison.dto";

import { StatutLivraison } from "./enums/statut-livraison.enum";

import { CandidaturesService } from "../candidatures/candidatures.service";
import { NotificationsService } from "../notifications/notifications.service";
import { TypeNotification } from "../notifications/enums/type-notification.enum";
import { PaiementsService } from "../paiements/paiements.service";
import { EmailsService } from "../emails/emails.service";

@Injectable()
export class LivraisonsService {
  private readonly logger = new Logger(LivraisonsService.name);

  constructor(
    @InjectRepository(Livraison)
    private readonly repo: Repository<Livraison>,

    private readonly candidaturesService: CandidaturesService,

    private readonly notificationsService: NotificationsService,

    private readonly paiementsService: PaiementsService,

    private readonly emailsService: EmailsService,
  ) {}

  // ============================================================
  // DÉPOSER OU CORRIGER UNE LIVRAISON
  // ============================================================

  async creer(
    candidatureId: string,
    etudiantId: string,
    dto: CreerLivraisonDto,
  ): Promise<Livraison> {
    const candidature = await this.candidaturesService.findOne(candidatureId);
    if (candidature.etudiantId !== etudiantId) {
      throw new ForbiddenException(
        "Vous ne pouvez livrer que vos propres candidatures.",
      );
    }

    if (dto.lienLivrable) {
      const plateforme = dto.plateforme?.toLowerCase();
      const url = dto.lienLivrable.trim();
      const estGitHub = /^https?:\/\/(www\.)?github\.com\//i.test(url);
      const estGitLab = /^https?:\/\/(www\.)?gitlab\.com\//i.test(url);

      if (
        (plateforme === 'github' && !estGitHub) ||
        (plateforme === 'gitlab' && !estGitLab) ||
        (!plateforme && !estGitHub && !estGitLab)
      ) {
        throw new BadRequestException(
          'Le lien ne correspond pas à la plateforme sélectionnée.',
        );
      }
    }

    let saved: Livraison;
    try {
      saved = await this.repo.manager.transaction(async (manager) => {
        // Même ordre de verrouillage que l'acceptation d'une candidature :
        // mission, candidature, puis livraison.
        const mission = await manager.findOne(Mission, {
          where: { id: candidature.missionId },
          lock: { mode: "pessimistic_write" },
        });
        if (!mission) {
          throw new NotFoundException("Mission introuvable.");
        }

        const candidatureVerrouillee = await manager.findOne(Candidature, {
          where: { id: candidatureId },
          lock: { mode: "pessimistic_write" },
        });
        if (!candidatureVerrouillee) {
          throw new NotFoundException("Candidature introuvable.");
        }
        if (candidatureVerrouillee.etudiantId !== etudiantId) {
          throw new ForbiddenException(
            "Vous ne pouvez livrer que vos propres candidatures.",
          );
        }
        this.candidaturesService.assertCandidatureAcceptee(
          candidatureVerrouillee,
        );
        if (mission.statut !== StatutMission.EN_COURS) {
          throw new ConflictException(
            "La mission n'est plus en cours : aucune livraison ne peut être déposée.",
          );
        }

        const existante = await manager.findOne(Livraison, {
          where: { candidatureId },
          lock: { mode: "pessimistic_write" },
        });

        if (existante) {
          if (existante.statut === StatutLivraison.EN_ATTENTE) {
            throw new ConflictException(
              "Une livraison est déjà en attente de validation pour cette mission.",
            );
          }
          if (existante.statut === StatutLivraison.VALIDEE) {
            throw new ConflictException(
              "Cette livraison a déjà été validée et ne peut plus être modifiée.",
            );
          }
          if (
            existante.statut !== StatutLivraison.CORRECTION_DEMANDEE ||
            existante.correctionUtilisee
          ) {
            throw new ConflictException(
              "La correction unique de cette livraison a déjà été utilisée.",
            );
          }

          existante.historique = [
            ...(existante.historique ?? []),
            {
              fichierUrl: existante.fichierUrl ?? null,
              piecesJointes: existante.piecesJointes ?? null,
              lienLivrable: existante.lienLivrable ?? null,
              branche: existante.branche ?? null,
              commentaireLivraison: existante.commentaireLivraison ?? null,
              statut: existante.statut,
              commentaireCorrection: existante.commentaireCorrection ?? null,
              dateLivraison: existante.dateLivraison,
              dateDerniereSoumission: existante.dateDerniereSoumission,
              dateValidation: existante.dateValidation ?? null,
              dateArchive: new Date(),
            },
          ];
          this.appliquerNouvelleVersion(existante, dto);
          existante.statut = StatutLivraison.EN_ATTENTE;
          existante.correctionUtilisee = true;
          existante.commentaireCorrection = undefined;
          existante.dateDerniereSoumission = new Date();
          return manager.save(Livraison, existante);
        }

        return manager.save(
          Livraison,
          manager.create(Livraison, {
            candidatureId,
            statut: StatutLivraison.EN_ATTENTE,
            correctionUtilisee: false,
            historique: [],
            dateDerniereSoumission: new Date(),
            fichierUrl: dto.fichierUrl,
            lienLivrable: dto.lienLivrable?.trim(),
            branche: dto.branche?.trim() || undefined,
            piecesJointes: dto.piecesJointes,
            commentaireLivraison: dto.commentaireLivraison?.trim() || undefined,
          }),
        );
      });
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as QueryFailedError & { driverError?: { code?: string } })
          .driverError?.code === "23505"
      ) {
        throw new ConflictException(
          "Une livraison existe déjà pour cette candidature.",
        );
      }
      throw error;
    }

    // Les effets secondaires partent après le commit : une seule requête
    // gagnante peut notifier le client, y compris pour la correction.
    await this.notificationsService.creer({
      destinataireId: candidature.mission.clientId,
      type: TypeNotification.LIVRAISON_DEPOSEE,
      titre: "Livraison déposée",
      message: `Une livraison a été déposée pour "${candidature.mission.titre}".`,
      lienUrl: `/tableau-de-bord/livraisons?candidature=${encodeURIComponent(candidatureId)}`,
    });

    void this.emailsService
      .sendNouvelleLivraisonClient({
        email: candidature.mission.client?.utilisateur?.email,
        nomClient: candidature.mission.client?.utilisateur?.nom,
        titre: candidature.mission.titre,
        nomEtudiant: candidature.etudiant?.utilisateur?.nom ?? 'Étudiant',
        date: saved.dateDerniereSoumission,
        routeKianja: `/tableau-de-bord/livraisons?candidature=${encodeURIComponent(candidatureId)}`,
      })
      .catch((error) => {
        this.logger.error(
          `Échec d'envoi de l'email de nouvelle livraison ${saved.id} : ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });

    return saved;
  }

  private appliquerNouvelleVersion(
    livraison: Livraison,
    dto: CreerLivraisonDto,
  ): void {
    livraison.fichierUrl = dto.fichierUrl;
    livraison.lienLivrable = dto.lienLivrable?.trim() || undefined;
    livraison.branche = dto.branche?.trim() || undefined;
    livraison.piecesJointes = dto.piecesJointes ?? null;
    livraison.commentaireLivraison =
      dto.commentaireLivraison?.trim() || undefined;
  }

  // ============================================================
  // TROUVER UNE LIVRAISON
  // ============================================================

  async findOne(id: string): Promise<Livraison> {
    const livraison = await this.repo.findOne({
      where: {
        id,
      },

      relations: [
        "candidature",
        "candidature.mission",
        "candidature.mission.client",
        "candidature.mission.client.utilisateur",
        "candidature.etudiant",
        "candidature.etudiant.utilisateur",
        // Evaluations liees a cette livraison : permet au frontend de
        // savoir si l'evaluation obligatoire a deja ete effectuee.
        "evaluations",
      ],
    });

    if (!livraison) {
      throw new NotFoundException(
        "Livraison introuvable.",
      );
    }

    return livraison;
  }

  // ============================================================
  // TROUVER POUR UTILISATEUR
  // ============================================================

  async findOneForUser(
    id: string,
    userId: string,
  ): Promise<Livraison> {
    const livraison = await this.findOne(id);

    const etudiantUtilisateurId =
      livraison.candidature.etudiant.utilisateurId;

    const clientUtilisateurId =
      livraison.candidature.mission.clientId;

    const estEtudiantProprietaire =
      etudiantUtilisateurId === userId;

    const estClientProprietaire =
      clientUtilisateurId === userId;

    if (
      !estEtudiantProprietaire &&
      !estClientProprietaire
    ) {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à consulter cette livraison.",
      );
    }

    return livraison;
  }

  // ============================================================
  // LIVRAISON D'UNE CANDIDATURE
  // ============================================================

  async findByCandidature(
    candidatureId: string,
  ): Promise<Livraison | null> {
    return this.repo.findOne({
      where: {
        candidatureId,
      },

      relations: [
        "candidature",
        "candidature.mission",
        "candidature.mission.client",
        "candidature.mission.client.utilisateur",
        "candidature.etudiant",
        "candidature.etudiant.utilisateur",
        "evaluations",
      ],
    });
  }

  // ============================================================
  // LIVRAISONS ÉTUDIANT
  // ============================================================

  async findByEtudiant(
    etudiantId: string,
  ): Promise<Livraison[]> {
    return this.repo
      .createQueryBuilder("livraison")

      .innerJoinAndSelect(
        "livraison.candidature",
        "candidature",
      )

      .innerJoinAndSelect(
        "candidature.mission",
        "mission",
      )

      .leftJoinAndSelect(
        "mission.client",
        "client",
      )

      .leftJoinAndSelect(
        "client.utilisateur",
        "clientUtilisateur",
      )

      .leftJoinAndSelect(
        "candidature.etudiant",
        "etudiant",
      )

      .leftJoinAndSelect(
        "etudiant.utilisateur",
        "etudiantUtilisateur",
      )

      // Evaluations : permet au frontend d'afficher l'etat
      // "evaluation effectuee" du workflow de fin de projet.
      .leftJoinAndSelect(
        "livraison.evaluations",
        "evaluation",
      )

      .where(
        "candidature.etudiantId = :etudiantId",
        {
          etudiantId,
        },
      )

      .orderBy(
        "livraison.dateLivraison",
        "DESC",
      )

      .getMany();
  }

  // ============================================================
  // LIVRAISONS CLIENT
  // ============================================================

  async findByClient(
    clientId: string,
  ): Promise<Livraison[]> {
    return this.repo
      .createQueryBuilder("livraison")

      .innerJoinAndSelect(
        "livraison.candidature",
        "candidature",
      )

      .innerJoinAndSelect(
        "candidature.mission",
        "mission",
      )

      .leftJoinAndSelect(
        "mission.client",
        "client",
      )

      .leftJoinAndSelect(
        "client.utilisateur",
        "clientUtilisateur",
      )

      .leftJoinAndSelect(
        "candidature.etudiant",
        "etudiant",
      )

      .leftJoinAndSelect(
        "etudiant.utilisateur",
        "etudiantUtilisateur",
      )

      // Evaluations : permet au frontend d'afficher l'etat
      // "evaluation effectuee" du workflow de fin de projet.
      .leftJoinAndSelect(
        "livraison.evaluations",
        "evaluationClient",
      )

      .where(
        "mission.clientId = :clientId",
        {
          clientId,
        },
      )

      .orderBy(
        "livraison.dateLivraison",
        "DESC",
      )

      .getMany();
  }

  // ============================================================
  // VALIDER UNE LIVRAISON
  // ============================================================

  async valider(
    id: string,
    clientId: string,
  ): Promise<Livraison> {
    const livraison = await this.findOne(id);

    // Vérifier que la livraison appartient bien
    // à une mission du client connecté.
    if (
      livraison.candidature.mission.clientId !==
      clientId
    ) {
      throw new ForbiddenException(
        "Vous ne pouvez valider que les livraisons de vos propres missions.",
      );
    }

    const dateValidation = new Date();
    const resultat = await this.repo.update(
      {
        id,
        statut: StatutLivraison.EN_ATTENTE,
      },
      {
        statut: StatutLivraison.VALIDEE,
        dateValidation,
      },
    );

    if (!resultat.affected || resultat.affected === 0) {
      throw new ConflictException(
        "Cette livraison n'est plus en attente de validation.",
      );
    }

    livraison.statut = StatutLivraison.VALIDEE;
    livraison.dateValidation = dateValidation;

    const saved = livraison;

    // ============================================================
    // RG (fin de projet, modele sequestre) : le paiement a pu etre
    // effectue et confirme AVANT cette validation (des l'acceptation de
    // la candidature, voir PaiementsService.creer). La validation de la
    // livraison est donc desormais l'evenement qui LIBERE les fonds
    // deja confirmes, le cas echeant (libererSiConfirmee ne fait rien
    // si aucun paiement CONFIRMEE n'existe encore pour cette
    // candidature — le client pourra alors payer apres coup, et
    // PaiementsService.marquerConfirmee liberera immediatement puisque
    // la livraison est deja validee a ce moment-la).
    // La mission n'est PAS marquee TERMINEE ici : elle le sera
    // uniquement apres l'evaluation (voir EvaluationsService.create),
    // une fois les trois conditions reunies : livraison validee +
    // paiement confirme + evaluation effectuee.
    // ============================================================

    // Notification à l'étudiant
    await this.notificationsService.creer({
      destinataireId:
        livraison.candidature.etudiant
          .utilisateurId,

      type: TypeNotification.LIVRAISON_VALIDEE,

      titre: "Livraison validée",

      message: `Votre livraison pour "${livraison.candidature.mission.titre}" a été validée.`,

      lienUrl: `/tableau-de-bord/livraisons?candidature=${encodeURIComponent(livraison.candidatureId)}`,
    });

    // Libere les fonds si un paiement a deja ete confirme avant cette
    // validation (ordre A du modele sequestre). Si aucun paiement
    // confirme n'existe encore, cette fonction ne fait rien : la
    // liberation se fera depuis PaiementsService.marquerConfirmee au
    // moment ou le client paiera (ordre B).
    await this.paiementsService.libererSiConfirmee(
      livraison.candidatureId,
    );

    return saved;
  }

  // ============================================================
  // DEMANDER UNE CORRECTION
  // ============================================================

  async demanderCorrection(
    id: string,
    clientId: string,
    dto: DemanderCorrectionDto,
  ): Promise<Livraison> {
    const livraison = await this.findOne(id);

    // Vérifier que la livraison appartient bien
    // à une mission du client connecté.
    if (
      livraison.candidature.mission.clientId !==
      clientId
    ) {
      throw new ForbiddenException(
        "Vous ne pouvez traiter que les livraisons de vos propres missions.",
      );
    }

    const resultat = await this.repo.update(
      {
        id,
        statut: StatutLivraison.EN_ATTENTE,
        correctionUtilisee: false,
      },
      {
        statut: StatutLivraison.CORRECTION_DEMANDEE,
        commentaireCorrection: dto.commentaireCorrection,
      },
    );
    if (!resultat.affected || resultat.affected === 0) {
      throw new ConflictException(
        "Cette livraison ne peut plus faire l'objet d'une demande de correction.",
      );
    }

    livraison.statut = StatutLivraison.CORRECTION_DEMANDEE;
    livraison.commentaireCorrection = dto.commentaireCorrection;
    const saved = livraison;

    // Notification à l'étudiant
    await this.notificationsService.creer({
      destinataireId:
        livraison.candidature.etudiant
          .utilisateurId,

      type: TypeNotification.CORRECTION_DEMANDEE,

      titre: "Correction demandée",

      message: `Une correction a été demandée pour "${livraison.candidature.mission.titre}".`,

      lienUrl: `/tableau-de-bord/livraisons?candidature=${encodeURIComponent(livraison.candidatureId)}`,
    });

    return saved;
  }

  // ============================================================
  // VÉRIFIER SI LA LIVRAISON EST VALIDÉE
  // ============================================================

  assertLivraisonValidee(
    livraison: Livraison,
  ): void {
    if (
      livraison.statut !==
      StatutLivraison.VALIDEE
    ) {
      throw new BadRequestException(
        "Le projet ne peut être évalué qu'après validation de la livraison.",
      );
    }
  }
}