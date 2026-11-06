/*
 * Logique pure du DataTable, sans React : recherche, tri, pagination.
 * Aucun alias d'import ici : ce fichier est chargé tel quel par `npm test`.
 */

export const ELLIPSE = "…";

/** Minuscules sans accents : « Éléonore » est trouvée en tapant « eleonore ». */
export function normaliserTexte(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export function filtrerLignes<T>(
  lignes: T[],
  terme: string,
  extracteurs: ((ligne: T) => string)[],
): T[] {
  const recherche = normaliserTexte(terme);
  if (!recherche || extracteurs.length === 0) return lignes;
  return lignes.filter((ligne) =>
    extracteurs.some((extraire) =>
      normaliserTexte(extraire(ligne)).includes(recherche),
    ),
  );
}

type ValeurComparable = string | number | Date | null | undefined;

function estAbsente(valeur: ValeurComparable): boolean {
  return (
    valeur === null ||
    valeur === undefined ||
    valeur === "" ||
    (typeof valeur === "number" && Number.isNaN(valeur)) ||
    (valeur instanceof Date && Number.isNaN(valeur.getTime()))
  );
}

/**
 * Tri stable sans modifier le tableau reçu. Dates et nombres sont comparés
 * par valeur, les textes selon la langue. Les valeurs absentes restent en fin
 * de liste dans les deux sens.
 */
export function trierLignes<T>(
  lignes: T[],
  valeur: (ligne: T) => ValeurComparable,
  direction: "asc" | "desc",
  locale: string,
): T[] {
  const collateur = new Intl.Collator(locale, {
    numeric: true,
    sensitivity: "base",
  });
  const signe = direction === "asc" ? 1 : -1;

  return [...lignes].sort((ligneA, ligneB) => {
    const a = valeur(ligneA);
    const b = valeur(ligneB);
    if (estAbsente(a) || estAbsente(b)) {
      return Number(estAbsente(a)) - Number(estAbsente(b));
    }
    if (a instanceof Date && b instanceof Date) {
      return signe * (a.getTime() - b.getTime());
    }
    if (typeof a === "number" && typeof b === "number") {
      return signe * (a - b);
    }
    return signe * collateur.compare(String(a), String(b));
  });
}

export interface Pagination {
  page: number;
  totalPages: number;
  /** Index du premier élément (inclus) et du dernier (exclu). */
  debut: number;
  fin: number;
  total: number;
}

/** Une page hors limites (lignes retirées par un rechargement) est ramenée à la dernière. */
export function calculerPagination(
  total: number,
  pageDemandee: number,
  taillePage: number,
): Pagination {
  const totalPages = Math.max(1, Math.ceil(total / taillePage));
  const page = Math.min(Math.max(1, pageDemandee), totalPages);
  const debut = (page - 1) * taillePage;
  return { page, totalPages, debut, fin: Math.min(debut + taillePage, total), total };
}

/** Numéros à afficher, ex. 1 … 4 5 6 … 20. Toujours au plus 7 éléments. */
export function plagePages(
  page: number,
  totalPages: number,
): (number | typeof ELLIPSE)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (page <= 4) return [1, 2, 3, 4, 5, ELLIPSE, totalPages];
  if (page >= totalPages - 3) {
    return [
      1,
      ELLIPSE,
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }
  return [1, ELLIPSE, page - 1, page, page + 1, ELLIPSE, totalPages];
}
