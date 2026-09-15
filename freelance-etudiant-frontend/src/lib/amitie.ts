import { api } from "./api";
import type {
  DemandeAmitie,
  ProfilAmitie,
  RelationAmitie,
  StatutAmitie,
} from "./types";

/**
 * Client API du module Amitie.
 *
 * Les routes correspondent au backend NestJS (src/modules/amitie) :
 * POST   /amities/demandes            { etudiantId }
 * GET    /amities/demandes/recues
 * GET    /amities/demandes/envoyees
 * POST   /amities/demandes/:id/accepter
 * POST   /amities/demandes/:id/refuser
 * GET    /amities
 * DELETE /amities/:etudiantId
 *
 * L'authentification (Bearer) est geree par le client api existant :
 * aucune logique de jeton n'est dupliquee ici.
 */

/** Liste des amis (relations acceptees, deux directions confondues). */
export function listerAmis(): Promise<RelationAmitie[]> {
  return api.get<RelationAmitie[]>("/amities");
}

/** Demandes d'amitie recues, en attente de reponse. */
export function listerDemandesRecues(): Promise<DemandeAmitie[]> {
  return api.get<DemandeAmitie[]>("/amities/demandes/recues");
}

/** Demandes d'amitie envoyees, en attente de reponse. */
export function listerDemandesEnvoyees(): Promise<DemandeAmitie[]> {
  return api.get<DemandeAmitie[]>("/amities/demandes/envoyees");
}

/**
 * Envoie une demande d'amitie a l'etudiant identifie par `etudiantId`
 * (identifiant UTILISATEUR du destinataire). Le demandeur est toujours
 * l'utilisateur connecte (jamais transmis dans le payload).
 */
export function envoyerDemandeAmitie(etudiantId: string): Promise<unknown> {
  return api.post("/amities/demandes", { etudiantId });
}

export function accepterDemandeAmitie(demandeId: string): Promise<unknown> {
  return api.post(`/amities/demandes/${demandeId}/accepter`);
}

export function refuserDemandeAmitie(demandeId: string): Promise<unknown> {
  return api.post(`/amities/demandes/${demandeId}/refuser`);
}

/**
 * Retire un ami. Seule la relation d'amitie est supprimee cote backend :
 * messages, groupes, candidatures et missions ne sont pas touches.
 */
export function retirerAmitie(etudiantId: string): Promise<unknown> {
  return api.delete(`/amities/${etudiantId}`);
}

// ==========================================================
// STATUT RELATIONNEL UNIFIE
// ==========================================================

export type RelationAvec = "aucun" | "amis" | "demande_envoyee" | "demande_recue";

/**
 * Vue consolidee des relations de l'utilisateur connecte, chargee en
 * une seule fois par les ecrans qui en ont besoin (page Amis, profil
 * public d'un etudiant). Permet de determiner le statut entre deux
 * etudiants sans multiplier les appels.
 */
export interface RelationsAmitie {
  /** Identifiants utilisateurs des amis (statut acceptee). */
  amisIds: Set<string>;

  /** Demandes recues en attente, indexees par l'identifiant du demandeur. */
  recuesParEtudiant: Map<string, DemandeAmitie>;

  /** Demandes envoyees en attente, indexees par l'identifiant du receveur. */
  envoyeesParEtudiant: Map<string, DemandeAmitie>;
}

export async function chargerRelationsAmitie(): Promise<RelationsAmitie> {
  const [amis, recues, envoyees] = await Promise.all([
    listerAmis(),
    listerDemandesRecues(),
    listerDemandesEnvoyees(),
  ]);

  const amisIds = new Set<string>();
  for (const relation of amis) {
    if (relation.ami?.id) {
      amisIds.add(relation.ami.id);
    }
  }

  const recuesParEtudiant = new Map<string, DemandeAmitie>();
  for (const demande of recues) {
    if (demande.demandeur?.id) {
      recuesParEtudiant.set(demande.demandeur.id, demande);
    }
  }

  const envoyeesParEtudiant = new Map<string, DemandeAmitie>();
  for (const demande of envoyees) {
    if (demande.receveur?.id) {
      envoyeesParEtudiant.set(demande.receveur.id, demande);
    }
  }

  return { amisIds, recuesParEtudiant, envoyeesParEtudiant };
}

/** Statut relationnel avec un etudiant donne, d'apres la vue consolidee. */
export function relationAvec(
  relations: RelationsAmitie,
  etudiantId: string,
): RelationAvec {
  if (relations.amisIds.has(etudiantId)) return "amis";
  if (relations.recuesParEtudiant.has(etudiantId)) return "demande_recue";
  if (relations.envoyeesParEtudiant.has(etudiantId)) return "demande_envoyee";
  return "aucun";
}

/**
 * Libelle francais d'un statut d'amitie (badges, listes).
 */
export function libelleStatutAmitie(statut: StatutAmitie): string {
  switch (statut) {
    case "en_attente":
      return "En attente";
    case "acceptee":
      return "Acceptée";
    case "refusee":
      return "Refusée";
  }
}

/** Sous-titre synthetique d'un profil amitie (universite · niveau). */
export function sousTitreProfilAmitie(profil: ProfilAmitie): string {
  const parties: string[] = [];
  if (profil.universite) parties.push(profil.universite);
  if (profil.niveauEtude) parties.push(profil.niveauEtude);
  return parties.join(" · ");
}

/** Recupere le nom affichable d'un profil amitie. */
export function nomProfilAmitie(profil: ProfilAmitie | null | undefined): string {
  return profil?.nom ?? "Étudiant";
}

/** Lien vers la messagerie existante, conversation ouverte sur l'ami. */
export function lienConversation(etudiantId: string, nom: string): string {
  return `/tableau-de-bord/messages?contact=${etudiantId}&nom=${encodeURIComponent(nom)}`;
}

export type { ProfilAmitie, RelationAmitie, DemandeAmitie };
