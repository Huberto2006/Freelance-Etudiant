import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { Livraison } from "./entities/livraison.entity";

import {
  CreerLivraisonDto,
  DemanderCorrectionDto,
} from "./dto/livraison.dto";

import { StatutLivraison } from "../../common/enums/statut-livraison.enum";

import { CandidaturesService } from "../candidatures/candidatures.service";
import { NotificationsService } from "../notifications/notifications.service";
import { TypeNotification } from "../../common/enums/type-notification.enum";
import { PaiementsService } from "../paiements/paiements.service";

@Injectable()
export class LivraisonsService {
  constructor(
    @InjectRepository(Livraison)
    private readonly repo: Repository<Livraison>,

    private readonly candidaturesService: CandidaturesService,

    private readonly notificationsService: NotificationsService,

    private readonly paiementsService: PaiementsService,
  ) {}

  // ============================================================
  // CRÉER OU MODIFIER UNE LIVRAISON
  // ============================================================

  async creer(
    candidatureId: string,
    etudiantId: string,
    dto: CreerLivraisonDto,
  ): Promise<Livraison> {
    const candidature =
      await this.candidaturesService.findOne(candidatureId);

    // Vérifier que l'étudiant possède bien cette candidature
    if (candidature.etudiantId !== etudiantId) {
      throw new ForbiddenException(
        "Vous ne pouvez livrer que vos propres candidatures.",
      );
    }

    // Vérifier que la candidature est acceptée
    this.candidaturesService.assertCandidatureAcceptee(
      candidature,
    );

    // Chercher une livraison existante
    const existante = await this.repo.findOne({
      where: {
        candidatureId,
      },
    });

    // ==========================================================
    // MODIFICATION D'UNE LIVRAISON EXISTANTE
    // ==========================================================

    if (existante) {
      if (
        existante.statut ===
        StatutLivraison.VALIDEE
      ) {
        throw new BadRequestException(
          "Cette livraison a déjà été validée et ne peut plus être modifiée.",
        );
      }

      if (dto.fichierUrl !== undefined) {
        existante.fichierUrl = dto.fichierUrl;
      }

      if (dto.lienLivrable !== undefined) {
        existante.lienLivrable = dto.lienLivrable;
      }

      if (dto.commentaireLivraison !== undefined) {
        existante.commentaireLivraison =
          dto.commentaireLivraison;
      }

      existante.statut = StatutLivraison.EN_ATTENTE;

      // Réinitialiser l'ancienne demande de correction
      existante.commentaireCorrection = undefined;

      const saved = await this.repo.save(existante);

      // Notification au client
      await this.notificationsService.creer({
        destinataireId: candidature.mission.clientId,

        type: TypeNotification.LIVRAISON_DEPOSEE,

        titre: "Nouvelle livraison déposée",

        message: `Une nouvelle livraison a été déposée pour "${candidature.mission.titre}".`,

        // IMPORTANT :
        // On transmet l'identifiant de la candidature
        // afin que la notification ouvre directement
        // la livraison concernée.
        lienUrl: `/tableau-de-bord/livraisons?candidature=${encodeURIComponent(candidatureId)}`,
      });

      return saved;
    }

    // ==========================================================
    // PREMIÈRE LIVRAISON
    // ==========================================================

    const livraison = this.repo.create({
      candidatureId,
      statut: StatutLivraison.EN_ATTENTE,

      fichierUrl: dto.fichierUrl,

      lienLivrable: dto.lienLivrable,

      commentaireLivraison: dto.commentaireLivraison,
    });

    const saved = await this.repo.save(livraison);

    // Notification au client
    await this.notificationsService.creer({
      destinataireId: candidature.mission.clientId,

      type: TypeNotification.LIVRAISON_DEPOSEE,

      titre: "Livraison déposée",

      message: `Une livraison a été déposée pour "${candidature.mission.titre}".`,

      lienUrl: `/tableau-de-bord/livraisons?candidature=${encodeURIComponent(candidatureId)}`,
    });

    return saved;
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

    if (
      livraison.statut ===
      StatutLivraison.VALIDEE
    ) {
      throw new BadRequestException(
        "Cette livraison est déjà validée.",
      );
    }

    livraison.statut = StatutLivraison.VALIDEE;

    const saved = await this.repo.save(livraison);

    // ============================================================
    // RG (fin de projet) : la validation de la livraison rend le
    // PAIEMENT obligatoire, puis l'EVALUATION obligatoire. La mission
    // n'est PAS marquee TERMINEE ici : elle le sera uniquement apres
    // l'evaluation (voir EvaluationsService.create), une fois les trois
    // conditions reunies : livraison validee + paiement confirme +
    // evaluation effectuee.
    // ============================================================

    // Notification à l'étudiant
    await this.notificationsService.creer({
      destinataireId:
        livraison.candidature.etudiant
          .utilisateurId,

      type: TypeNotification.LIVRAISON_VALIDEE,

      titre: "Livraison validée",

      message: `Votre livraison pour "${livraison.candidature.mission.titre}" a été validée. Le client va procéder au paiement.`,

      lienUrl: `/tableau-de-bord/livraisons?candidature=${encodeURIComponent(livraison.candidatureId)}`,
    });

    // Paiement
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

    if (
      livraison.statut ===
      StatutLivraison.VALIDEE
    ) {
      throw new BadRequestException(
        "Une livraison déjà validée ne peut plus être envoyée en correction.",
      );
    }

    livraison.statut =
      StatutLivraison.CORRECTION_DEMANDEE;

    livraison.commentaireCorrection =
      dto.commentaireCorrection;

    const saved = await this.repo.save(livraison);

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