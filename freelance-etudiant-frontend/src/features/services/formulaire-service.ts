export type FormulaireServiceData = {
  titre: string;
  description: string;
  categorie: string;
  prix: string;
  delaiJours: string;
  disponible: boolean;
  imagesUrls: string[];
  competences: string;
};

export const FORMULAIRE_INITIAL: FormulaireServiceData = {
  titre: "",
  description: "",
  categorie: "",
  prix: "",
  delaiJours: "",
  disponible: true,
  imagesUrls: [],
  competences: "",
};
