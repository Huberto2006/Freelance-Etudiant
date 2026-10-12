import type { Filtres } from "@/components/ui/PanneauFiltres";
import type {
  ModeTriCatalogue,
  OngletCatalogue,
} from "@/components/ui/SousMenuCatalogue";

/**
 * Utilitaires partagés par les pages /publications, /missions et /services.
 *
 * Catégorie et mode de tri (« recommandé », « meilleurs ») coexistent
 * désormais : la catégorie est portée par `OngletCatalogue` (variante
 * "categorie", avec un `tri` optionnel), le mode de tri par défaut est la
 * variante "mode".
 */

/** Lit l'onglet (catégorie + mode de tri) depuis l'URL courante. */
export function ongletDepuisUrl(searchParams: URLSearchParams): OngletCatalogue {
  const tri = searchParams.get("tri");
  const mode: ModeTriCatalogue =
    tri === "recommande" || tri === "meilleurs" ? tri : "tous";

  const categorie = searchParams.get("categorie");
  if (categorie) return { type: "categorie", valeur: categorie, tri: mode };

  return { type: "mode", valeur: mode };
}

/** Lit les filtres de recherche textuelle et de montants depuis l'URL. */
export function filtresDepuisUrl(searchParams: URLSearchParams): Filtres {
  return {
    motsCles: searchParams.get("q") ?? searchParams.get("motsCles") ?? undefined,
    competence: searchParams.get("competence") ?? undefined,
    budgetMin: searchParams.get("budgetMin") ?? undefined,
    budgetMax: searchParams.get("budgetMax") ?? undefined,
  };
}

/** Catégorie sélectionnée ("" si aucune). */
export function categorieDe(onglet: OngletCatalogue): string {
  return onglet.type === "categorie" ? onglet.valeur : "";
}

/** Mode de tri sélectionné ("tous" par défaut). */
export function modeDe(onglet: OngletCatalogue): ModeTriCatalogue {
  return onglet.type === "mode" ? onglet.valeur : (onglet.tri ?? "tous");
}

/** Reconstruit un onglet à partir d'une catégorie et d'un mode de tri. */
export function composerOnglet(
  categorie: string,
  mode: ModeTriCatalogue,
): OngletCatalogue {
  return categorie
    ? { type: "categorie", valeur: categorie, tri: mode }
    : { type: "mode", valeur: mode };
}

/** Nombre de critères de filtrage actifs (hors recherche textuelle). */
export function nombreFiltresActifs(
  filtres: Filtres,
  categorie: string,
  supplementaires = 0,
): number {
  return (
    (categorie ? 1 : 0) +
    (filtres.competence ? 1 : 0) +
    (filtres.budgetMin || filtres.budgetMax ? 1 : 0) +
    supplementaires
  );
}
