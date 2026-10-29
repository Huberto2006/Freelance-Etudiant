export interface Evaluation {
  id: string;

  note: number;

  commentaire?: string | null;

  livraisonId: string;

  evaluateurId: string;

  evalueId: string;

  dateEvaluation: string;
}
