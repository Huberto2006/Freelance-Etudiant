// ============================================================
// TYPES MOYENS DE PAIEMENT
// ============================================================

export type TypeMoyenPaiement =
  | "MVOLA"
  | "ORANGE_MONEY"
  | "AIRTEL_MONEY"
  | "BANQUE";

export type MoyenPaiement = {
  id: string;
  type: TypeMoyenPaiement;
  operateur: string | null;
  nomBanque: string | null;
  numero: string;
  nomTitulaire: string;
  principal: boolean;
};

export type ReponseMoyensPaiementCandidature = {
  candidatureId: string;
  missionTitre: string;
  montant: number;
  moyensPaiement: MoyenPaiement[];
};

/** Moyen de paiement du CLIENT (RG-PAY-012) : numéro à débiter. */
export type MoyenPaiementClient = {
  id: string;
  type: "MVOLA" | "ORANGE_MONEY" | "AIRTEL_MONEY";
  numero: string;
  nomTitulaire: string;
  principal: boolean;
  actif: boolean;
};
