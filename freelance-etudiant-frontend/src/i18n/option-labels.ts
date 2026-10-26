import { cleCategorie } from "@/lib/categories";

/**
 * Libellés traduits des valeurs prédéfinies (catégories, langues parlées,
 * spécialités, compétences). La VALEUR stockée / envoyée à l'API ne change
 * jamais : seul le libellé affiché est traduit.
 *
 * Les textes sont dans messages/<langue>/enums.json (groupes `categories`,
 * `categoriesDescriptions`, `langues`, `specialites`, `competences`), indexés
 * par un « slug » : valeur sans accents, minuscules, sans ponctuation
 * ("Développement web" -> "developpementweb"). Une valeur inconnue (saisie
 * libre) est affichée telle quelle.
 */
export function slugOption(valeur: string): string {
  return cleCategorie(valeur).replace(/[^a-z0-9]+/g, "");
}

/** Sous-ensemble de l'API de `useTranslations` / `getTranslations` utilisé ici. */
export interface TraducteurEnums {
  (cle: never): string;
  has: (cle: never) => boolean;
}

export type GroupeOption =
  | "categories"
  | "categoriesDescriptions"
  | "langues"
  | "specialites"
  | "competences";

export function libelleOption(
  t: TraducteurEnums,
  groupe: GroupeOption,
  valeur: string,
  repli?: string,
): string {
  const cle = `${groupe}.${slugOption(valeur)}` as never;
  return t.has(cle) ? t(cle) : (repli ?? valeur);
}
