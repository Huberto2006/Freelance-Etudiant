import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EtudiantProfile } from '../etudiants/entities/etudiant-profile.entity';
import { Evaluation } from '../evaluations/entities/evaluation.entity';
import { Candidature } from '../candidatures/entities/candidature.entity';
import { StatutCandidature } from '../../common/enums/statut-candidature.enum';
import { Livraison } from '../livraisons/entities/livraison.entity';
import { StatutLivraison } from '../../common/enums/statut-livraison.enum';

/**
 * Module 5.2 du cahier des charges - Systeme de Reputation et Calcul de
 * Score. Le score global combine :
 *  - la moyenne des evaluations clients (poids 50%)
 *  - le taux de missions menees a terme (poids 30%)
 *  - le nombre total de projets livres avec succes, normalise (poids 20%)
 */
@Injectable()
export class ReputationService {
  private static readonly PALIER_PROJETS_MAX = 20;
  private static readonly POIDS_NOTE = 0.5;
  private static readonly POIDS_TAUX_COMPLETION = 0.3;
  private static readonly POIDS_VOLUME = 0.2;

  constructor(
    @InjectRepository(EtudiantProfile)
    private readonly etudiantRepo: Repository<EtudiantProfile>,
    @InjectRepository(Evaluation)
    private readonly evaluationRepo: Repository<Evaluation>,
    @InjectRepository(Candidature)
    private readonly candidatureRepo: Repository<Candidature>,
    @InjectRepository(Livraison)
    private readonly livraisonRepo: Repository<Livraison>,
  ) {}

  async recalculerScore(etudiantId: string): Promise<EtudiantProfile> {
    const profil = await this.etudiantRepo.findOneOrFail({
      where: { utilisateurId: etudiantId },
    });

    const { moyenne, nombreEvaluations } = await this.calculerNoteMoyenne(etudiantId);

    const candidaturesAcceptees = await this.candidatureRepo.count({
      where: { etudiantId, statut: StatutCandidature.ACCEPTEE },
    });

    const livraisonsValidees = await this.livraisonRepo
      .createQueryBuilder('livraison')
      .innerJoin('livraison.candidature', 'candidature')
      .where('candidature.etudiantId = :etudiantId', { etudiantId })
      .andWhere('livraison.statut = :statut', { statut: StatutLivraison.VALIDEE })
      .getCount();

    const tauxCompletion =
      candidaturesAcceptees > 0 ? livraisonsValidees / candidaturesAcceptees : 0;

    const scoreNote = (moyenne / 5) * 100;
    const scoreCompletion = tauxCompletion * 100;
    const scoreVolume =
      Math.min(livraisonsValidees / ReputationService.PALIER_PROJETS_MAX, 1) * 100;

    const scoreGlobal =
      scoreNote * ReputationService.POIDS_NOTE +
      scoreCompletion * ReputationService.POIDS_TAUX_COMPLETION +
      scoreVolume * ReputationService.POIDS_VOLUME;

    profil.noteMoyenne = Number(moyenne.toFixed(2));
    profil.nombreMissionsTerminees = livraisonsValidees;
    profil.scoreReputation = Number(scoreGlobal.toFixed(2));

    return this.etudiantRepo.save(profil);
  }

  private async calculerNoteMoyenne(
    etudiantId: string,
  ): Promise<{ moyenne: number; nombreEvaluations: number }> {
    const result = await this.evaluationRepo
      .createQueryBuilder('evaluation')
      .select('AVG(evaluation.note)', 'moyenne')
      .addSelect('COUNT(evaluation.id)', 'total')
      .where('evaluation.evalueId = :etudiantId', { etudiantId })
      .getRawOne<{ moyenne: string | null; total: string }>();

    return {
      moyenne: result?.moyenne ? parseFloat(result.moyenne) : 0,
      nombreEvaluations: result?.total ? parseInt(result.total, 10) : 0,
    };
  }
}
