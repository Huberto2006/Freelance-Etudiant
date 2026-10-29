export type TypeCibleFavori =
  | "mission"
  | "service"
  | "etudiant";

export interface Favori {
  id: string;

  utilisateurId: string;

  cibleType: TypeCibleFavori;

  cibleId: string;

  dateAjout: string;
}
