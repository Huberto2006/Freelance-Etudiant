import { TypeMoyenPaiement } from "@/features/moyens-paiement/moyens-paiement.types";

// ============================================================
// LIBELLES
// ============================================================

export const typeLabel: Record<TypeMoyenPaiement, string> = {
  MVOLA: "MVola",
  ORANGE_MONEY: "Orange Money",
  AIRTEL_MONEY: "Airtel Money",
  BANQUE: "Compte bancaire", // remplacé par la traduction à l'affichage
};
