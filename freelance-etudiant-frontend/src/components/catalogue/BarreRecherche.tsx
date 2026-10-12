"use client";

import { Search, SlidersHorizontal } from "lucide-react";

import { useSaisieDifferee } from "./useSaisieDifferee";

/**
 * Barre de recherche du catalogue (filtrage en direct) + accès aux filtres
 * sur mobile (feuille du bas). Sur desktop, les filtres sont dans la
 * colonne latérale : le bouton « Filtres » n'apparaît pas.
 */
export function BarreRecherche({
  motsCles,
  onMotsCles,
  placeholder,
  nbFiltresActifs,
  onOuvrirFiltres,
}: {
  motsCles: string;
  onMotsCles: (valeur: string) => void;
  placeholder: string;
  nbFiltresActifs: number;
  onOuvrirFiltres: () => void;
}) {
  const [saisie, setSaisie] = useSaisieDifferee(motsCles, onMotsCles);

  return (
    <div className="mb-5 flex items-center gap-2">
      <div className="relative min-w-0 flex-1">
        <Search
          size={18}
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft"
        />
        <label htmlFor="recherche-catalogue" className="sr-only">
          Rechercher dans le catalogue
        </label>
        <input
          id="recherche-catalogue"
          type="search"
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="h-12 w-full rounded-[10px] border border-ink/20 bg-paper-light pl-11 pr-3 text-base text-ink outline-none transition placeholder:text-ink-soft/60 focus:border-bleu focus:ring-2 focus:ring-bleu/20"
        />
      </div>

      <button
        type="button"
        onClick={onOuvrirFiltres}
        className="inline-flex h-12 shrink-0 items-center gap-2 rounded-[10px] border border-ink/20 bg-paper-light px-4 text-sm font-medium text-ink transition-colors hover:border-ink/40 lg:hidden"
      >
        <SlidersHorizontal size={16} aria-hidden="true" />
        Filtres
        {nbFiltresActifs > 0 && (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1.5 font-mono text-[0.6875rem] text-paper-light">
            {nbFiltresActifs}
          </span>
        )}
      </button>
    </div>
  );
}
