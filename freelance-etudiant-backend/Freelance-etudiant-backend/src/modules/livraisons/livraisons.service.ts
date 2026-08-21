import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Livraison } from './entities/livraison.entity';
import { CreerLivraisonDto, DemanderCorrectionDto } from './dto/livraison.dto';
import { StatutLivraison } from '../../common/enums/statut-livraison.enum';
import { StatutMission } from '../../common/enums/statut-mission.enum';
import { CandidaturesService } from '../candidatures/candidatures.service';
import { MissionsService } from '../missions/missions.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TypeNotification } from '../../common/enums/type-notification.enum';
import { PaiementsService } from '../paiements/paiements.service';

@Injectable()
export class LivraisonsService {
  constructor(
    @InjectRepository(Livraison)
    private readonly repo: Repository<Livraison>,
    private readonly candidaturesService: CandidaturesService,
    private readonly missionsService: MissionsService,
    private readonly notificationsService: NotificationsService,
    private readonly paiementsService: PaiementsService,
  ) {}

  /**
   * Cas d'utilisation "Livrer le projet".
   * RG8 : seule une candidature acceptee autorise la livraison.
   */
  async creer(
    candidatureId: string,
    etudiantId: string,
    dto: CreerLivraisonDto,
  ): Promise<Livraison> {
    const candidature = await this.candidaturesService.findOne(candidatureId);
    if (candidature.etudiantId !== etudiantId) {
      throw new ForbiddenException(
        'Vous ne pouvez livrer que vos propres candidatures acceptees',
      );
    }
    this.candidaturesService.assertCandidatureAcceptee(candidature);

    const existante = await this.repo.findOne({ where: { candidatureId } });
    if (existante) {
      // Redepot apres une demande de correction.
      existante.fichierUrl = dto.fichierUrl ?? existante.fichierUrl;
      existante.lienLivrable = dto.lienLivrable ?? existante.lienLivrable;
      existante.commentaireLivraison =
        dto.commentaireLivraison ?? existante.commentaireLivraison;
      existante.statut = StatutLivraison.EN_ATTENTE;
      return this.repo.save(existante);
    }

    const livraison = this.repo.create({
      ...dto,
      candidatureId,
      statut: StatutLivraison.EN_ATTENTE,
    });
    const saved = await this.repo.save(livraison);

    await this.notificationsService.creer({
      destinataireId: candidature.mission.clientId,
      type: TypeNotification.LIVRAISON_DEPOSEE,
      titre: 'Livraison déposée',
      message: `Une livraison a été déposée pour "${candidature.mission.titre}".`,
      lienUrl: '/tableau-de-bord/mes-missions',
    });

    return saved;
  }

  async findOne(id: string): Promise<Livraison> {
    const livraison = await this.repo.findOne({
      where: { id },
      relations: [
        'candidature',
        'candidature.mission',
        'candidature.etudiant',
        'candidature.etudiant.utilisateur',
      ],
    });
    if (!livraison) {
      throw new NotFoundException('Livraison introuvable');
    }
    return livraison;
  }

  async findByCandidature(candidatureId: string): Promise<Livraison | null> {
    return this.repo.findOne({ where: { candidatureId } });
  }

  /**
   * Cas d'utilisation "Valider le projet livre".
   * RG12 : seul le client ayant publie la mission peut valider la livraison.
   */
  async valider(id: string, clientId: string): Promise<Livraison> {
    const livraison = await this.findOne(id);
    if (livraison.candidature.mission.clientId !== clientId) {
      throw new ForbiddenException(
        'Vous ne pouvez valider que la livraison de vos propres missions',
      );
    }
    livraison.statut = StatutLivraison.VALIDEE;
    const saved = await this.repo.save(livraison);
    await this.missionsService.setStatut(
      livraison.candidature.missionId,
      StatutMission.TERMINEE,
    );

    await this.notificationsService.creer({
      destinataireId: livraison.candidature.etudiant.utilisateurId,
      type: TypeNotification.LIVRAISON_VALIDEE,
      titre: 'Livraison validée',
      message: `Votre livraison pour "${livraison.candidature.mission.titre}" a été validée.`,
      lienUrl: '/tableau-de-bord/mes-missions',
    });

    await this.paiementsService.libererSiConfirmee(livraison.candidatureId);

    return saved;
  }

  async demanderCorrection(
    id: string,
    clientId: string,
    dto: DemanderCorrectionDto,
  ): Promise<Livraison> {
    const livraison = await this.findOne(id);
    if (livraison.candidature.mission.clientId !== clientId) {
      throw new ForbiddenException(
        'Vous ne pouvez traiter que la livraison de vos propres missions',
      );
    }
    livraison.statut = StatutLivraison.CORRECTION_DEMANDEE;
    livraison.commentaireCorrection = dto.commentaireCorrection;
    const saved = await this.repo.save(livraison);

    await this.notificationsService.creer({
      destinataireId: livraison.candidature.etudiant.utilisateurId,
      type: TypeNotification.CORRECTION_DEMANDEE,
      titre: 'Correction demandée',
      message: `Une correction a été demandée pour "${livraison.candidature.mission.titre}".`,
      lienUrl: '/tableau-de-bord/mes-missions',
    });

    return saved;
  }

  /**
   * RG5 : un projet ne peut etre evalue qu'apres validation de la livraison
   * par le client. Utilise par EvaluationsService.
   */
  assertLivraisonValidee(livraison: Livraison): void {
    if (livraison.statut !== StatutLivraison.VALIDEE) {
      throw new BadRequestException(
        "Le projet ne peut etre evalue qu'apres validation de la livraison",
      );
    }
  }
}
