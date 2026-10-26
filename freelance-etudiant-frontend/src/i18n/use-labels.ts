"use client";

import { useTranslations } from "next-intl";

/**
 * Libellés traduits des valeurs d'énumération renvoyées par l'API
 * (statuts, rôles, méthodes de paiement…). Les textes sont dans
 * messages/<langue>/enums.json. Une valeur inconnue est affichée telle quelle
 * (jamais de clé brute ni d'erreur).
 */
export function useLabels() {
  const t = useTranslations("enums");
  const lire = (groupe: string) => (valeur: string | null | undefined) => {
    if (!valeur) return "";
    const cle = `${groupe}.${valeur}`;
    // `t.has` accepte une clé dynamique ; le cast évite le typage strict.
    return t.has(cle as never) ? t(cle as never) : valeur;
  };
  return {
    statutMission: lire("statutMission"),
    statutCandidature: lire("statutCandidature"),
    statutLivraison: lire("statutLivraison"),
    statutTransaction: lire("statutTransaction"),
    methodePaiement: lire("methodePaiement"),
    statutSignalement: lire("statutSignalement"),
    statutDemandeService: lire("statutDemandeService"),
    statutInvitationGroupe: lire("statutInvitationGroupe"),
    roleMembreGroupe: lire("roleMembreGroupe"),
    role: lire("role"),
  };
}
