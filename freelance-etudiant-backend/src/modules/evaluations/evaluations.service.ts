import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Evaluation } from './entities/evaluation.entity';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { LivraisonsService } from '../livraisons/livraisons.service';
import { ReputationService } from '../reputation/reputation.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TypeNotification } from '../../common/enums/type-notification.enum';

@Injectable()
export class EvaluationsService {
  constructor(
    @InjectRepository(Evaluation)
    private readonly repo: Repository<Evaluation>,
    private readonly livraisonsService: LivraisonsService,
    private readonly reputationService: ReputationService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * RG5 : un projet ne peut etre evalue qu'apres validation de la livraison.
   * RG6 : note comprise entre 1 et 5 (validee dans le DTO).
   * RG12 : seul le client ayant publie la mission peut evaluer (verifie via
   * la propriete de la livraison, elle-meme deja controlee par RG12 lors de
   * la validation).
   */
  async create(
    livraisonId: string,
    evaluateurId: string,
    dto: CreateEvaluationDto,
  ): Promise<Evaluation> {
    const livraison = await this.livraisonsService.findOne(livraisonId);

    if (livraison.candidature.mission.clientId !== evaluateurId) {
      throw new ForbiddenException(
        'Seul le client ayant publie la mission peut evaluer la livraison',
      );
    }

    this.livraisonsService.assertLivraisonValidee(livraison);

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

    let saved: Evaluation;
    try {
      saved = await this.repo.save(evaluation);
    } catch (error) {
      // Filet de securite si deux requetes simultanees passent la
      // verification `existante` ci-dessus en meme temps : la contrainte
      // UNIQUE(livraison_id) en base rejette la seconde ecriture.
      if (
        error instanceof QueryFailedError &&
        (error as unknown as { code?: string }).code === '23505'
      ) {
        throw new ConflictException('Cette livraison a deja ete evaluee');
      }
      throw error;
    }

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
