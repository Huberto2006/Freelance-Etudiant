import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Mission } from '../missions/entities/mission.entity';
import { EtudiantProfile } from '../etudiants/entities/etudiant-profile.entity';

export interface ResultatMatching {
  etudiantId: string;
  nom: string;
  scoreCompatibilite: number;
  competencesCorrespondantes: string[];
  disponible: boolean;
  tarifHoraire?: number;
}

/**
 * Module 5.1 du cahier des charges - Algorithme de Matching Automatique
 * (Etudiant <-> Mission).
 *
 * Le score de compatibilite (%) combine :
 *  - la correspondance des competences (Skills Matching), poids dominant
 *  - la disponibilite de l'etudiant
 *  - un bonus de proximite tarifaire par rapport au budget de la mission
 *
 * Exemple du cahier des charges : Mission requerant
 * [Next.js, NestJS, PostgreSQL] vs Etudiant maitrisant
 * [Next.js, NestJS, PostgreSQL] = Compatibilite 100%.
 */
@Injectable()
export class MatchingService {
  private static readonly POIDS_COMPETENCES = 0.7;
  private static readonly POIDS_DISPONIBILITE = 0.15;
  private static readonly POIDS_TARIF = 0.15;

  constructor(
    @InjectRepository(Mission)
    private readonly missionRepo: Repository<Mission>,
    @InjectRepository(EtudiantProfile)
    private readonly etudiantRepo: Repository<EtudiantProfile>,
  ) {}

  /**
   * Calcule, pour une mission donnee, le score de compatibilite de chaque
   * etudiant actif et retourne la liste triee par score decroissant.
   */
  async trouverEtudiantsCompatibles(missionId: string): Promise<ResultatMatching[]> {
    const mission = await this.missionRepo.findOne({ where: { id: missionId } });
    if (!mission) {
      throw new NotFoundException('Mission introuvable');
    }

    const etudiants = await this.etudiantRepo
      .createQueryBuilder('etudiant')
      .leftJoinAndSelect('etudiant.utilisateur', 'utilisateur')
      .where('utilisateur.estActif = true')
      .andWhere('utilisateur.estSuspendu = false')
      .getMany();

    const resultats = etudiants.map((etudiant) =>
      this.calculerCompatibilite(mission, etudiant),
    );

    return resultats
      .filter((r) => r.scoreCompatibilite > 0)
      .sort((a, b) => b.scoreCompatibilite - a.scoreCompatibilite);
  }

  /**
   * Calcule, pour un etudiant donne, les missions ouvertes les plus
   * compatibles avec son profil (recommandation cote etudiant).
   */
  async trouverMissionsCompatibles(
    etudiantId: string,
  ): Promise<Array<{ mission: Mission; scoreCompatibilite: number }>> {
    const etudiant = await this.etudiantRepo.findOne({
      where: { utilisateurId: etudiantId },
    });
    if (!etudiant) {
      throw new NotFoundException('Profil etudiant introuvable');
    }

    const missions = await this.missionRepo.find({
      where: { estModere: true },
    });

    return missions
      .map((mission) => ({
        mission,
        scoreCompatibilite: this.calculerCompatibilite(mission, etudiant).scoreCompatibilite,
      }))
      .filter((r) => r.scoreCompatibilite > 0)
      .sort((a, b) => b.scoreCompatibilite - a.scoreCompatibilite);
  }

  private calculerCompatibilite(
    mission: Mission,
    etudiant: EtudiantProfile,
  ): ResultatMatching {
    const competencesRequises = (mission.competencesRequises ?? []).map((c) =>
      c.toLowerCase().trim(),
    );
    const competencesEtudiant = new Set(
      (etudiant.competences ?? []).map((c) => c.toLowerCase().trim()),
    );

    const correspondances = competencesRequises.filter((c) =>
      competencesEtudiant.has(c),
    );

    const scoreCompetences =
      competencesRequises.length > 0
        ? correspondances.length / competencesRequises.length
        : 0;

    const scoreDisponibilite = etudiant.disponibilite ? 1 : 0;

    // Bonus tarifaire : plus le tarif horaire de l'etudiant est proche ou
    // inferieur au budget/jour implicite de la mission, meilleur le score.
    let scoreTarif = 1;
    if (etudiant.tarifHoraire && mission.budget) {
      const ratio = Number(etudiant.tarifHoraire) / Number(mission.budget);
      scoreTarif = ratio <= 1 ? 1 : Math.max(0, 1 - (ratio - 1));
    }

    const scoreGlobal =
      scoreCompetences * MatchingService.POIDS_COMPETENCES +
      scoreDisponibilite * MatchingService.POIDS_DISPONIBILITE +
      scoreTarif * MatchingService.POIDS_TARIF;

    return {
      etudiantId: etudiant.utilisateurId,
      nom: etudiant.utilisateur?.nom ?? '',
      scoreCompatibilite: Math.round(scoreGlobal * 100),
      competencesCorrespondantes: correspondances,
      disponible: etudiant.disponibilite,
      tarifHoraire: etudiant.tarifHoraire,
    };
  }
}
