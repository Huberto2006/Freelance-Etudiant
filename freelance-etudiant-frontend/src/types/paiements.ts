import type { Candidature } from "./candidatures";
import type { Utilisateur } from "./utilisateurs";

export type MethodePaiement =
  | "papi"
  | "mvola"
  | "orange_money"
  | "airtel_money"
  | "virement";

export type StatutTransaction =
  | "en_attente"
  | "confirmee"
  | "liberee"
  | "annulee";

export interface Transaction {
  id: string;

  candidatureId: string;

  candidature?: Candidature;

  clientId: string;

  client?: Utilisateur;

  etudiantId: string;

  etudiant?: Utilisateur;

  montant: number | string;

  methode: MethodePaiement;

  reference: string;

  statut: StatutTransaction;

  /**
   * 'papi' / 'mvola' = paiement en ligne verifie par le backend aupres
   * du fournisseur ; 'manuel' = declaration verifiee par un admin.
   */
  provider?: string | null;

  /** Lien de paiement Papi (reprise d'un paiement en attente). */
  lienPaiement?: string | null;

  /** Dernier statut brut renvoye par le fournisseur (ex. "Pending"). */
  providerStatut?: string | null;

  dateCreation: string;

  dateConfirmation?: string | null;

  dateLiberation?: string | null;
}

/** Facture d'un paiement confirme (donnees copiees a l'emission). */
export interface Facture {
  id: string;
  numero: string;
  transactionId: string;
  clientId: string;
  etudiantId: string;
  montant: number | string;
  devise: string;
  methode: MethodePaiement | string;
  referencePaiement: string;
  titreMission: string;
  clientNom: string;
  clientEntreprise?: string | null;
  clientEmail: string;
  etudiantNom: string;
  emetteurNom: string;
  emetteurMention?: string | null;
  datePaiement: string;
  dateEmission: string;
}
