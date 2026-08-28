"use client";

import Link from "next/link";
import { LayoutGrid } from "lucide-react";

import { SectionTitre } from "./SectionTitre";
import { iconePourCategorie } from "@/lib/categories";

export interface CategorieAccueil {
  /** Valeur brute du filtre (ex. "Developpement"). */
  valeur: string;
  /** Libelle affiche (ex. "Développement"). */
  libelle: string;
  /** Nombre de services dans la categorie, si calculable. */
  total?: number;
}

/**
 * Grille des categories de services proposees par les etudiants. Les
 * categories affichees proviennent des services reellement publies
 * (calculees dans la page d'accueil), avec un repli sur le referentiel
 * tant qu'aucun service n'existe encore.
 */
export function SectionCategories({
  categories,
}: {
  categories: CategorieAccueil[];
}) {
  return (
    <section id="categories" className="mt-16 scroll-mt-24">
      <SectionTitre
        icon={LayoutGrid}
        eyebrow="Domaines de compétences"
        titre="Explorer par catégorie"
        sousTitre="Chaque domaine regroupe les services proposés par les étudiants freelances."
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {categories.map((categorie) => {
          const Icone = iconePourCategorie(categorie.valeur);

          return (
            <Link
              key={categorie.valeur}
              href={`/services?categorie=${encodeURIComponent(categorie.valeur)}`}
              className="notice-card group flex items-center gap-3 p-4"
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rice/10 text-rice transition-colors group-hover:bg-ocre/15 group-hover:text-ocre-dark"
                aria-hidden="true"
              >
                <Icone size={18} />
              </span>

              <span className="min-w-0">
                <span className="block truncate font-display font-medium transition-colors group-hover:text-ocre-dark">
                  {categorie.libelle}
                </span>
                <span className="block text-xs text-ink-soft/70">
                  {categorie.total !== undefined
                    ? `${categorie.total} service${categorie.total > 1 ? "s" : ""}`
                    : "Découvrir"}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}