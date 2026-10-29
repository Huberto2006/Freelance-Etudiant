import type { EtudiantProfile } from './entities/etudiant-profile.entity';
import { projeterUtilisateur } from '../users/utilisateur.projection';

/** Projection PUBLIQUE d'un profil etudiant (sans telephone ni email). */
export function projeterEtudiant(etudiant?: EtudiantProfile | null) {
  if (!etudiant) return undefined;
  return {
    utilisateurId: etudiant.utilisateurId,
    universite: etudiant.universite ?? null,
    niveauEtude: etudiant.niveauEtude ?? null,
    filiere: etudiant.filiere ?? null,
    ville: etudiant.ville ?? null,
    specialites: etudiant.specialites ?? [],
    competences: etudiant.competences ?? [],
    statutDisponibilite: etudiant.statutDisponibilite ?? null,
    scoreReputation: etudiant.scoreReputation,
    noteMoyenne: etudiant.noteMoyenne,
    nombreMissionsTerminees: etudiant.nombreMissionsTerminees,
    utilisateur: projeterUtilisateur(etudiant.utilisateur),
  };
}
