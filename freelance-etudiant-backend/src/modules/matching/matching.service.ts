import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Mission } from '../missions/entities/mission.entity';
import { EtudiantProfile } from '../etudiants/entities/etudiant-profile.entity';
import { StatutMission } from '../../common/enums/statut-mission.enum';
import { dateLimiteDepassee } from '../../common/utils/date-limite.util';
import { Role } from '../../common/enums/role.enum';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

/** Borne la charge memoire/CPU d'un calcul de matching. */
const LIMITE_ETUDIANTS_MATCHING = 500;

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
  async trouverEtudiantsCompatibles(
    missionId: string,
    user: AuthenticatedUser,
  ): Promise<ResultatMatching[]> {
    const mission = await this.missionRepo.findOne({ where: { id: missionId } });
    if (!mission) {
      throw new NotFoundException('Mission introuvable');
    }
    // Un client ne peut analyser que SES missions (pas d'IDOR).
    if (user.role !== Role.ADMIN && mission.clientId !== user.id) {
      throw new ForbiddenException("Cette mission ne vous appartient pas");
    }

    const etudiants = await this.etudiantRepo
      .createQueryBuilder('etudiant')
      .leftJoinAndSelect('etudiant.utilisateur', 'utilisateur')
      .where('utilisateur.estActif = true')
      .andWhere('utilisateur.estSuspendu = false')
      .take(LIMITE_ETUDIANTS_MATCHING)
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
   *
   * Exclusion des missions expirees (RG3) : seules les missions
   * moderees, encore OUVERTES et dont la date limite n'est pas passee
   * participent a la recommandation. Une mission arrivee a echeance ne
   * doit plus etre proposee aux etudiants.
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
      where: { estModere: true, statut: StatutMission.OUVERTE },
    });

    return missions
      // Semantique RG3 : jour limite strictement passe = expiree (le jour
      // limite lui-meme reste valable).
      .filter((mission) => !dateLimiteDepassee(mission.dateLimite))
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
