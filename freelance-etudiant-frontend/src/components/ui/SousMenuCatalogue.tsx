"use client";

import { Sparkles, Trophy, LayoutGrid } from "lucide-react";
import { clsx } from "clsx";

import { CATEGORIES_REPERENTIEL } from "@/lib/categories";

/**
 * Mode de tri spécial, mutuellement exclusif avec une catégorie précise :
 * - "tous"       -> aucun filtre spécial (comportement par défaut du backend).
 * - "recommande" -> mis en avant pour l'utilisateur (matching pour un
 *                    étudiant connecté ; à défaut, les plus récents).
 * - "meilleurs"  -> triés côté client par la meilleure "qualité" disponible
 *                    (note du prestataire pour les services, budget pour
 *                    les missions).
 */
export type ModeTriCatalogue = "tous" | "recommande" | "meilleurs";

export type OngletCatalogue =
  | { type: "mode"; valeur: ModeTriCatalogue }
  | { type: "categorie"; valeur: string };

interface OngletBoutonProps {
  onglet: OngletCatalogue;
  selectionne: boolean;
  onSelect: (onglet: OngletCatalogue) => void;
  icon?: React.ComponentType<{
    size?: number;
    className?: string;
  }>;
  children: React.ReactNode;
}

function OngletBouton({
  onglet,
  selectionne,
  onSelect,
  icon: Icon,
  children,
}: OngletBoutonProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(onglet)}
      aria-pressed={selectionne}
      className={clsx(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
        selectionne
          ? "border-ink bg-ink text-paper-light"
          : "border-ink/20 bg-paper-light text-ink-soft hover:border-ink/40 hover:text-ink",
      )}
    >
      {Icon && (
        <Icon
          size={14}
          className="shrink-0"
          aria-hidden="true"
        />
      )}

      <span>{children}</span>
    </button>
  );
}

/**
 * Sous-menu de la page missions/services :
 * permet de distinguer en un clic les annonces recommandées,
 * les mieux notées/payées, puis chacune des catégories existantes
 * de la plateforme.
 *
 * Les catégories proviennent du référentiel `categories.ts`.
 *
 * Placée juste sous la navbar (sticky), au-dessus de la mise en page
 * à deux colonnes filtres/résultats.
 */
export function SousMenuCatalogue({
  actif,
  onChange,
}: {
  /** Onglet actuellement sélectionné. */
  actif: OngletCatalogue;

  /** Callback appelé lorsqu'un onglet est sélectionné. */
  onChange: (onglet: OngletCatalogue) => void;
}) {
  function estActif(onglet: OngletCatalogue) {
    if (onglet.type !== actif.type) return false;

    return onglet.valeur === actif.valeur;
  }

  return (
    <nav
      aria-label="Filtrer par mise en avant ou par catégorie"
      className="sticky top-16 z-20 -mx-4 border-b border-ink/10 bg-paper/95 px-4 py-3 backdrop-blur-sm sm:mx-0 sm:rounded-xl sm:border sm:bg-paper-light/95"
    >
      <div className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {/* Tous */}
        <OngletBouton
          onglet={{
            type: "mode",
            valeur: "tous",
          }}
          selectionne={estActif({ type: "mode", valeur: "tous" })}
          onSelect={onChange}
          icon={LayoutGrid}
        >
          Tous
        </OngletBouton>

        {/* Recommandé */}
        <OngletBouton
          onglet={{
            type: "mode",
            valeur: "recommande",
          }}
          selectionne={estActif({ type: "mode", valeur: "recommande" })}
          onSelect={onChange}
          icon={Sparkles}
        >
          Recommandé
        </OngletBouton>

        {/* Meilleurs */}
        <OngletBouton
          onglet={{
            type: "mode",
            valeur: "meilleurs",
          }}
          selectionne={estActif({ type: "mode", valeur: "meilleurs" })}
          onSelect={onChange}
          icon={Trophy}
        >
          Meilleurs
        </OngletBouton>

        {/* Séparateur */}
        <span
          aria-hidden="true"
          className="mx-1 w-px shrink-0 self-stretch bg-ink/10"
        />

        {/* Catégories */}
        {CATEGORIES_REPERENTIEL.map((categorie) => {
          const onglet: OngletCatalogue = {
            type: "categorie",
            valeur: categorie.valeur,
          };
          return (
            <OngletBouton
              key={categorie.valeur}
              onglet={onglet}
              selectionne={estActif(onglet)}
              onSelect={onChange}
              icon={categorie.icon}
            >
              {categorie.libelle}
            </OngletBouton>
          );
        })}
      </div>
    </nav>
  );
}