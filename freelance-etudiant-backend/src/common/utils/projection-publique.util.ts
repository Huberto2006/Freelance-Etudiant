import type { Mission } from '../../modules/missions/entities/mission.entity';
import type { ServiceOffert } from '../../modules/services/entities/service.entity';
import type { ClientProfile } from '../../modules/clients/entities/client-profile.entity';
import type { EtudiantProfile } from '../../modules/etudiants/entities/etudiant-profile.entity';
import type { Utilisateur } from '../../modules/users/entities/utilisateur.entity';
import type { Commentaire } from '../../modules/commentaires/entities/commentaire.entity';

/**
 * Projections PUBLIQUES des missions et services.
 *
 * Les endpoints publics (annuaire, detail) ne doivent jamais serialiser les
 * entites completes : `Utilisateur` expose email, googleId, etat du compte,
 * et les profils exposent le telephone. Ces fonctions construisent une
 * liste blanche explicite des seuls champs utiles a l'affichage.
 */
export function projeterUtilisateur(utilisateur?: Utilisateur | null) {
  if (!utilisateur) return undefined;
  return {
    id: utilisateur.id,
    nom: utilisateur.nom,
    photoUrl: utilisateur.photoUrl ?? null,
  };
}

export function projeterClient(client?: ClientProfile | null) {
  if (!client) return undefined;
  return {
    utilisateurId: client.utilisateurId,
    typeClient: client.typeClient,
    nomEntreprise: client.nomEntreprise ?? null,
    secteurActivite: client.secteurActivite ?? null,
    ville: client.ville ?? null,
    utilisateur: projeterUtilisateur(client.utilisateur),
  };
}

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

export function projeterMission(mission: Mission) {
  return {
    id: mission.id,
    titre: mission.titre,
    description: mission.description,
    budget: mission.budget,
    dateLimite: mission.dateLimite,
    categorie: mission.categorie,
    competencesRequises: mission.competencesRequises,
    statut: mission.statut,
    imageUrl: mission.imageUrl ?? null,
    clientId: mission.clientId,
    dateCreation: mission.dateCreation,
    client: projeterClient(mission.client),
  };
}

export function projeterService(service: ServiceOffert) {
  return {
    id: service.id,
    titre: service.titre,
    description: service.description,
    categorie: service.categorie,
    prix: service.prix,
    delai: service.delai,
    competences: service.competences,
    imagesUrls: service.imagesUrls,
    disponible: service.disponible,
    etudiantId: service.etudiantId,
    dateCreation: service.dateCreation,
    etudiant: projeterEtudiant(service.etudiant),
  };
}

export type CommentairePublic = ReturnType<typeof projeterCommentaire>;

export function projeterCommentaire(commentaire: Commentaire) {
  return {
    id: commentaire.id,
    contenu: commentaire.contenu,
    auteurId: commentaire.auteurId,
    cibleType: commentaire.cibleType,
    cibleId: commentaire.cibleId,
    dateCreation: commentaire.dateCreation,
    dateModification: commentaire.dateModification,
    auteur: projeterUtilisateur(commentaire.auteur),
  };
}
