// ============================================================
// TYPES
// ============================================================

export type TypeMoyenPaiement =
  | "MVOLA"
  | "ORANGE_MONEY"
  | "AIRTEL_MONEY"
  | "BANQUE";

export interface MoyenPaiement {
  id: string;
  type: TypeMoyenPaiement;
  operateur: string | null;
  nomBanque: string | null;
  numero: string;
  nomTitulaire: string;
  principal: boolean;
  actif: boolean;
  dateCreation: string;
  dateMaj: string;
}

export type ActionMoyen =
  | "modifier"
  | "principal"
  | "actif"
  | "supprimer"
  | null;
