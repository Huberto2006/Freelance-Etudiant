"use client";

import { useTranslations } from "next-intl";

import {
  libelleOption,
  type GroupeOption,
  type TraducteurEnums,
} from "./option-labels";
import {
  CATEGORIE_AUTRE,
  CATEGORIES_REPERENTIEL,
  cleCategorie,
  libelleCategorie,
} from "@/lib/categories";

/**
 * Libellés traduits des catégories, langues, spécialités et compétences
 * prédéfinies (voir option-labels.ts). Les valeurs brutes restent inchangées.
 */
export function useOptionLabels() {
  const t = useTranslations("enums") as unknown as TraducteurEnums;
  const lire = (groupe: GroupeOption) => (valeur: string, repli?: string) =>
    libelleOption(t, groupe, valeur, repli);

  const categorie = (valeur: string) =>
    libelleOption(t, "categories", valeur, libelleCategorie(valeur));

  return {
    categorie,
    categorieDescription: lire("categoriesDescriptions"),
    langue: lire("langues"),
    specialite: lire("specialites"),
    competence: lire("competences"),
    /** Référentiel de catégories avec libellés et descriptions traduits. */
    categories: CATEGORIES_REPERENTIEL.map((c) => ({
      ...c,
      libelle: categorie(c.valeur),
      description: libelleOption(t, "categoriesDescriptions", c.valeur, c.description),
    })),
    /** Options de formulaire (référentiel + « Autre » + valeur courante). */
    optionsCategories: (valeurCourante?: string) => {
      const options = [
        ...CATEGORIES_REPERENTIEL.map(({ valeur }) => ({
          valeur,
          libelle: categorie(valeur),
        })),
        { valeur: CATEGORIE_AUTRE, libelle: categorie(CATEGORIE_AUTRE) },
      ];
      const courante = valeurCourante?.trim();
      if (
        courante &&
        !options.some((o) => cleCategorie(o.valeur) === cleCategorie(courante))
      ) {
        options.push({ valeur: courante, libelle: categorie(courante) });
      }
      return options;
    },
  };
}
