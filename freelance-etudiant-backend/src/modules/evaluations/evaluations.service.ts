import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Evaluation } from './entities/evaluation.entity';
import { Transaction } from '../paiements/entities/transaction.entity';
import { Mission } from '../missions/entities/mission.entity';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { LivraisonsService } from '../livraisons/livraisons.service';
import { ReputationService } from '../reputation/reputation.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MissionsService } from '../missions/missions.service';
import { TypeNotification } from '../../common/enums/type-notification.enum';
import { StatutMission } from '../../common/enums/statut-mission.enum';
import { StatutTransaction } from '../../common/enums/statut-transaction.enum';

@Injectable()
export class EvaluationsService {
  constructor(
    @InjectRepository(Evaluation)
    private readonly repo: Repository<Evaluation>,
    @InjectRepository(Transaction)
    private readonly transactionsRepo: Repository<Transaction>,
    private readonly livraisonsService: LivraisonsService,
    private readonly reputationService: ReputationService,
    private readonly notificationsService: NotificationsService,
    private readonly missionsService: MissionsService,
  ) {}

  /**
   * RG5 : un projet ne peut etre evalue qu'apres validation de la livraison.
   * RG6 : note comprise entre 1 et 5 (validee dans le DTO).
   * RG12 : seul le client ayant publie la mission peut evaluer (verifie via
   * la propriete de la livraison, elle-meme deja controlee par RG12 lors de
   * la validation).
   * RG (fin de projet) : l'evaluation n'est possible qu'apres CONFIRMATION
   * du paiement (pas de la simple creation d'une demande de paiement).
   */
  async create(
    livraisonId: string,
    evaluateurId: string,
    dto: CreateEvaluationDto,
  ): Promise<Evaluation> {
    const livraison = await this.livraisonsService.findOne(livraisonId);

    // Le projet/candidature existe (via la livraison) et correspond au
    // client connecte : la livraison doit appartenir a une mission du
    // client qui evalue.
    if (livraison.candidature.mission.clientId !== evaluateurId) {
      throw new ForbiddenException(
        'Seul le client ayant publie la mission peut evaluer la livraison',
      );
    }

    // La livraison doit correspondre au projet concerne et etre validee.
    this.livraisonsService.assertLivraisonValidee(livraison);

    // ============================================================
    // RG (fin de projet) : l'evaluation n'est autorisee qu'APRES la
    // confirmation reelle du paiement (statut CONFIRMEE ou LIBEREE,
    // LIBEREE impliquant une confirmation prealable). Verifie cote
    // backend : un appel direct a l'API est bloque si le paiement
    // n'est pas confirme.
    // ============================================================
    const paiement = await this.transactionsRepo.findOne({
      where: [
        {
          candidatureId: livraison.candidatureId,
          statut: StatutTransaction.CONFIRMEE,
        },
        {
          candidatureId: livraison.candidatureId,
          statut: StatutTransaction.LIBEREE,
        },
      ],
    });
    if (!paiement) {
      throw new BadRequestException(
        "Vous devez d'abord effectuer le paiement avant d'évaluer le projet.",
      );
    }

    const existante = await this.repo.findOne({ where: { livraisonId } });
    if (existante) {
      throw new ConflictException('Cette livraison a deja ete evaluee');
    }

    const evaluation = this.repo.create({
      ...dto,
      livraisonId,
      evaluateurId,
      evalueId: livraison.candidature.etudiantId,
    });

    // ============================================================
    // ATOMICITE evaluation + cloture : l'ecriture de l'evaluation et le
    // passage de la mission a TERMINEE sont dans UNE SEULE transaction.
    // Avant ce correctif, un echec du setStatut apres le save laissait
    // la mission EN_COURS pour toujours (la contrainte unique
    // livraison_id empechant de repasser par une nouvelle evaluation).
    // La cloture est conditionnelle au statut EN_COURS ; un affected 0
    // annule tout (l'evaluation n'est pas conservee).
    // ============================================================
    const saved = await this.repo.manager.transaction(async (manager) => {
      let created: Evaluation;
      try {
        created = await manager.save(Evaluation, evaluation);
      } catch (error) {
        // Filet de securite si deux requetes simultanees passent la
        // verification `existante` ci-dessus en meme temps : la
        // contrainte UNIQUE(livraison_id) en base rejette la seconde
        // ecriture.
        if (
          error instanceof QueryFailedError &&
          (error as unknown as { code?: string }).code === '23505'
        ) {
          throw new ConflictException('Cette livraison a deja ete evaluee');
        }
        throw error;
      }

      const cloture = await manager.update(
        Mission,
        {
          id: livraison.candidature.missionId,
          statut: StatutMission.EN_COURS,
        },
        { statut: StatutMission.TERMINEE },
      );

      if (!cloture.affected || cloture.affected === 0) {
        throw new ConflictException(
          'La mission liee a cette livraison ne peut pas etre cloturee (statut inattendu).',
        );
      }

      return created;
    });

    await this.reputationService.recalculerScore(livraison.candidature.etudiantId);

    await this.notificationsService.creer({
      destinataireId: livraison.candidature.etudiantId,
      type: TypeNotification.NOUVELLE_EVALUATION,
      titre: 'Nouvelle évaluation',
      message: `Vous avez reçu une note de ${dto.note}/5 pour "${livraison.candidature.mission.titre}".`,
      lienUrl: `/etudiants/${livraison.candidature.etudiantId}`,
    });

    return saved;
  }

  async findByEtudiant(etudiantId: string): Promise<Evaluation[]> {
    return this.repo.find({
      where: { evalueId: etudiantId },
      order: { dateEvaluation: 'DESC' },
    });
  }
}
