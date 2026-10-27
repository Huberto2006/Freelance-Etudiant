"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
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
 * de formation des étudiants avec les besoins des clients.
 */
export function SectionCategories({
  categories,
}: {
  categories: CategorieAccueil[];
}) {
  const t = useTranslations("home.categories");

  return (
    <section id="categories" className="mx-auto max-w-7xl px-4 pb-7 sm:px-5 sm:pb-10">
      <SectionTitre
        icon={LayoutGrid}
        eyebrow={t("eyebrow")}
        titre={t("title")}
        sousTitre={t("subtitle")}
        lienHref="/services"
        lienLabel={t("browse")}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {categories.map((categorie) => {
          const Icone = iconePourCategorie(categorie.valeur);

          return (
            <Link
              key={categorie.valeur}
              href={`/services?categorie=${encodeURIComponent(categorie.valeur)}`}
              className="notice-card card-link group flex items-center gap-3 p-4"
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-ink/[0.05] text-ink-soft transition-colors duration-150 group-hover:bg-bleu/10 group-hover:text-bleu-dark"
                aria-hidden="true"
              >
                <Icone size={17} />
              </span>

              <span className="min-w-0">
                <span className="block truncate font-display font-medium text-ink">
                  {categorie.libelle}
                </span>
                <span className="block text-xs text-ink-soft">
                  {categorie.total !== undefined
                    ? t("serviceCount", { count: categorie.total })
                    : t("discover")}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}