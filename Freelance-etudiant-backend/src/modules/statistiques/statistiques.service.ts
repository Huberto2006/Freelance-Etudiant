import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Utilisateur } from '../users/entities/utilisateur.entity';
import { Mission } from '../missions/entities/mission.entity';
import { Candidature } from '../candidatures/entities/candidature.entity';
import { Livraison } from '../livraisons/entities/livraison.entity';
import { Role } from '../../common/enums/role.enum';
import { StatutLivraison } from '../../common/enums/statut-livraison.enum';
import { StatutCandidature } from '../../common/enums/statut-candidature.enum';

@Injectable()
export class StatistiquesService {
  constructor(
    @InjectRepository(Utilisateur)
    private readonly utilisateurRepo: Repository<Utilisateur>,
    @InjectRepository(Mission)
    private readonly missionRepo: Repository<Mission>,
    @InjectRepository(Candidature)
    private readonly candidatureRepo: Repository<Candidature>,
    @InjectRepository(Livraison)
    private readonly livraisonRepo: Repository<Livraison>,
  ) {}

  /**
   * 5.3 Cote Admin : nombre total d'inscrits (Freelances vs Clients),
   * volume d'affaires global, repartition des missions par categorie.
   */
  async tableauDeBordAdmin() {
    const [nombreEtudiants, nombreClients] = await Promise.all([
      this.utilisateurRepo.count({ where: { role: Role.ETUDIANT } }),
      this.utilisateurRepo.count({ where: { role: Role.CLIENT } }),
    ]);

    const volumeAffaires = await this.livraisonRepo
      .createQueryBuilder('livraison')
      .innerJoin('livraison.candidature', 'candidature')
      .select('COALESCE(SUM(candidature.prixPropose), 0)', 'total')
      .where('livraison.statut = :statut', { statut: StatutLivraison.VALIDEE })
      .getRawOne<{ total: string }>();

    const repartitionParCategorie = await this.missionRepo
      .createQueryBuilder('mission')
      .select('mission.categorie', 'categorie')
      .addSelect('COUNT(mission.id)', 'total')
      .groupBy('mission.categorie')
      .getRawMany<{ categorie: string; total: string }>();

    const missionsTotal = await this.missionRepo.count();
    const missionsTerminees = await this.livraisonRepo.count({
      where: { statut: StatutLivraison.VALIDEE },
    });

    return {
      nombreInscrits: {
        etudiants: nombreEtudiants,
        clients: nombreClients,
        total: nombreEtudiants + nombreClients,
      },
      volumeAffairesGlobal: parseFloat(volumeAffaires?.total ?? '0'),
      repartitionMissionsParCategorie: repartitionParCategorie.map((r) => ({
        categorie: r.categorie,
        total: parseInt(r.total, 10),
      })),
      missions: {
        total: missionsTotal,
        terminees: missionsTerminees,
      },
    };
  }

  /**
   * 5.3 Cote Etudiant : evolution mensuelle des revenus, taux
   * d'acceptation des candidatures, suivi des missions en cours.
   */
  async tableauDeBordEtudiant(etudiantId: string) {
    const candidatures = await this.candidatureRepo.find({
      where: { etudiantId },
    });
    const totalCandidatures = candidatures.length;
    const candidaturesAcceptees = candidatures.filter(
      (c) => c.statut === StatutCandidature.ACCEPTEE,
    ).length;
    const tauxAcceptation =
      totalCandidatures > 0 ? candidaturesAcceptees / totalCandidatures : 0;

    const missionsEnCours = candidatures.filter(
      (c) => c.statut === StatutCandidature.ACCEPTEE,
    ).length;

    const revenusParMois = await this.livraisonRepo
      .createQueryBuilder('livraison')
      .innerJoin('livraison.candidature', 'candidature')
      .select("TO_CHAR(livraison.dateMaj, 'YYYY-MM')", 'mois')
      .addSelect('COALESCE(SUM(candidature.prixPropose), 0)', 'revenu')
      .where('candidature.etudiantId = :etudiantId', { etudiantId })
      .andWhere('livraison.statut = :statut', { statut: StatutLivraison.VALIDEE })
      .groupBy('mois')
      .orderBy('mois', 'ASC')
      .getRawMany<{ mois: string; revenu: string }>();

    return {
      revenusMensuels: revenusParMois.map((r) => ({
        mois: r.mois,
        revenu: parseFloat(r.revenu),
      })),
      tauxAcceptationCandidatures: Number((tauxAcceptation * 100).toFixed(1)),
      missionsEnCours,
      totalCandidatures,
    };
  }
}
