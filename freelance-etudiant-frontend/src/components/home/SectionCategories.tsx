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
 * Grille des catégories d'expertise : met en relation les domaines
 * de formation de l'EMIT avec les besoins des clients.
 */
export function SectionCategories({
  categories,
}: {
  categories: CategorieAccueil[];
}) {
  return (
    <section id="categories" className="mt-16 scroll-mt-24 sm:mt-20">
      <SectionTitre
        icon={LayoutGrid}
        eyebrow="Domaines de compétences · Filières"
        titre="Explorer par catégorie"
        sousTitre="Chaque domaine regroupe les compétences des étudiants freelances et les besoins confiés par les clients."
        lienHref="/services"
        lienLabel="Parcourir le catalogue"
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {categories.map((categorie) => {
          const Icone = iconePourCategorie(categorie.valeur);

          return (
            <Link
              key={categorie.valeur}
              href={`/services?categorie=${encodeURIComponent(categorie.valeur)}`}
              className="notice-card group flex items-center gap-3 p-4 transition-all hover:border-bleu/30"
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink/[0.06] text-ink-soft transition-colors group-hover:bg-bleu/15 group-hover:text-bleu-dark"
                aria-hidden="true"
              >
                <Icone size={18} />
              </span>

              <span className="min-w-0">
                <span className="block truncate font-display font-medium text-ink transition-colors group-hover:text-bleu-dark">
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