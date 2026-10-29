import { TypeMoyenPaiement } from "@/features/paiements/paiements.types";

// ============================================================
// CONFIGURATION DES COULEURS DES STATUTS
// ============================================================

export const toneParStatut: Record<
  string,
  "ocre" | "rice" | "brique" | "ink"
> = {
  en_attente: "ocre",
  confirmee: "rice",
  liberee: "rice",
  annulee: "brique",
};

// ============================================================
// LIBELLES DES MOYENS DE PAIEMENT
// ============================================================

export const typeMoyenPaiementLabel: Record<
  TypeMoyenPaiement,
  string
> = {
  MVOLA: "MVola",
  ORANGE_MONEY: "Orange Money",
  AIRTEL_MONEY: "Airtel Money",
  BANQUE: "Compte bancaire",
};

// ============================================================
// CARTE D'UNE TRANSACTION
// ============================================================

/**
 * Lien de paiement fourni par le backend : n'est utilisé que s'il s'agit
 * d'un URL https valide (ou http vers localhost en développement).
 */
export function lienPaiementSur(lien?: string | null): string | null {
  if (!lien) return null;
  try {
    const url = new URL(lien);
    const local =
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1");
    return url.protocol === "https:" || local ? url.toString() : null;
  } catch {
    return null;
  }
}
