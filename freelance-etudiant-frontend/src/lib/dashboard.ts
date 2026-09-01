import type { LucideIcon } from "lucide-react";

import { formatDateCourte } from "./format";
import type { Utilisateur } from "./types";

// ============================================================
// TYPES DE VUE PARTAGÉS PAR LE TABLEAU DE BORD
// ============================================================

export type Ton = "ocre" | "rice" | "brique" | "ink";

/**
 * Résultat tolérant aux pannes du chargement d'une section du tableau
 * de bord : une erreur sur un endpoint n'empêche pas d'afficher les
 * autres sections.
 */
export interface EtatSection<T> {
  statut: "succes" | "erreur";
  donnees?: T;
}

/**
 * Une action mise en avant dans « À faire maintenant » ou dans
 * les « Actions rapides ». Toujours construite à partir de données
 * réelles (candidatures, livraisons, paiements, notifications).
 */
export interface ActionUrgente {
  id: string;
  /** Plus la priorité est basse, plus l'action remonte dans la liste. */
  priorite: number;
  icone: LucideIcon;
  ton: Ton;
  titre: string;
  description: string;
  libelleAction: string;
  href: string;
}

/** Un événement de la timeline « Activité récente ». */
export interface EvenementActivite {
  id: string;
  ton: Ton;
  titre: string;
  detail?: string;
  date: string;
  href?: string;
}

/** Un projet actif affiché dans « Projets en cours ». */
export interface ProjetActif {
  id: string;
  titre: string;
  /** Client (côté étudiant) ou prestataire (côté client). */
  interlocuteur?: string;
  statutLabel: string;
  statutTon: Ton;
  detail?: string;
  href: string;
}

export interface CompletionProfil {
  pourcentage: number;
  champsManquants: string[];
}

// ============================================================
// UTILITAIRES
// ============================================================

/** Convertit une valeur numérique renvoyée par l'API (number | string). */
export function versNombre(valeur: number | string | null | undefined): number {
  const nombre =
    typeof valeur === "string" ? parseFloat(valeur) : (valeur ?? 0);
  return Number.isFinite(nombre) ? nombre : 0;
}

const JOUR_EN_MS = 24 * 60 * 60 * 1000;

/** Date relative lisible (« il y a 3 h »), calculée uniquement côté client. */
export function formatDateRelative(date: string): string {
  const temps = new Date(date).getTime();
  if (!Number.isFinite(temps)) return "";

  const difference = Date.now() - temps;

  if (difference < 60 * 60 * 1000) {
    const minutes = Math.max(1, Math.floor(difference / (60 * 1000)));
    return `il y a ${minutes} min`;
  }
  if (difference < JOUR_EN_MS) {
    return `il y a ${Math.floor(difference / (60 * 60 * 1000))} h`;
  }
  if (difference < 7 * JOUR_EN_MS) {
    return `il y a ${Math.floor(difference / JOUR_EN_MS)} j`;
  }
  return formatDateCourte(date);
}

/**
 * Calcule réellement le pourcentage de complétion du profil étudiant
 * à partir des champs disponibles (aucune valeur arbitraire).
 */
export function calculerCompletionProfil(
  utilisateur: Utilisateur,
): CompletionProfil {
  const profil = utilisateur.profilEtudiant;

  const criteres: Array<{ rempli: boolean; label: string }> = [
    { rempli: Boolean(utilisateur.photoUrl), label: "photo de profil" },
    { rempli: Boolean(profil?.description?.trim()), label: "description" },
    {
      rempli: (profil?.competences?.length ?? 0) > 0,
      label: "compétences",
    },
    { rempli: (profil?.langues?.length ?? 0) > 0, label: "langues" },
    { rempli: Boolean(profil?.universite?.trim()), label: "université" },
    {
      rempli: Boolean(profil?.niveauEtude?.trim()),
      label: "niveau d'étude",
    },
    {
      rempli: profil?.tarifHoraire != null && versNombre(profil.tarifHoraire) > 0,
      label: "tarif horaire",
    },
    {
      rempli: (profil?.portfolioUrls?.length ?? 0) > 0,
      label: "portfolio",
    },
    { rempli: profil?.disponibilite === true, label: "disponibilité" },
  ];

  const champsManquants = criteres
    .filter((critere) => !critere.rempli)
    .map((critere) => critere.label);

  const remplis = criteres.length - champsManquants.length;
  const pourcentage = Math.round((remplis / criteres.length) * 100);

  return { pourcentage, champsManquants };
}
