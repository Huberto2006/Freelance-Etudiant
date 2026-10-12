"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

import type { Filtres } from "@/components/ui/PanneauFiltres";
import { CATEGORIES_REPERENTIEL } from "@/lib/categories";

import { useSaisieDifferee } from "./useSaisieDifferee";

const classeChamp =
  "h-11 w-full rounded-[10px] border border-ink/20 bg-paper-light px-3 text-base text-ink outline-none transition placeholder:text-ink-soft/60 focus:border-bleu focus:ring-2 focus:ring-bleu/20";

const classeTitre =
  "mb-3 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-ink-soft";

export interface OptionType<T extends string> {
  valeur: T;
  libelle: string;
  compte?: number;
}

export interface FiltresCatalogueProps<T extends string = string> {
  filtres: Filtres;
  onFiltres: (filtres: Filtres) => void;
  categorie: string;
  onCategorie: (categorie: string) => void;
  /** Nombre d'annonces par catégorie (optionnel, affiché dans la liste). */
  comptesCategories?: Record<string, number>;
  /** Sélecteur de type (page Publications uniquement). */
  type?: {
    valeur: T;
    onChange: (valeur: T) => void;
    options: OptionType<T>[];
  };
  labelBudget: string;
  nbFiltresActifs: number;
  onReinitialiser: () => void;
}

/** Champ numérique : ne conserve que les chiffres. */
function chiffres(valeur: string) {
  return valeur.replace(/\D/g, "");
}

/**
 * Contenu des filtres (type, catégorie, budget, compétence). Partagé entre
 * la colonne latérale (desktop) et la feuille du bas (mobile). Tous les
 * contrôles s'appliquent en direct, sans bouton « Filtrer ».
 */
export function ChampsFiltres<T extends string = string>({
  filtres,
  onFiltres,
  categorie,
  onCategorie,
  comptesCategories,
  type,
  labelBudget,
}: FiltresCatalogueProps<T>) {
  const id = useId();

  const validerMin = useCallback(
    (v: string) => onFiltres({ ...filtres, budgetMin: v || undefined }),
    [filtres, onFiltres],
  );
  const validerMax = useCallback(
    (v: string) => onFiltres({ ...filtres, budgetMax: v || undefined }),
    [filtres, onFiltres],
  );
  const validerCompetence = useCallback(
    (v: string) => onFiltres({ ...filtres, competence: v.trim() || undefined }),
    [filtres, onFiltres],
  );

  const [min, setMin] = useSaisieDifferee(filtres.budgetMin ?? "", validerMin);
  const [max, setMax] = useSaisieDifferee(filtres.budgetMax ?? "", validerMax);
  const [competence, setCompetence] = useSaisieDifferee(
    filtres.competence ?? "",
    validerCompetence,
  );

  return (
    <div className="divide-y divide-ink/10">
      {type && (
        <fieldset className="pb-5">
          <legend className={classeTitre}>Type</legend>
          <div className="flex flex-col">
            {type.options.map((option) => (
              <label
                key={option.valeur}
                className="flex min-h-10 cursor-pointer items-center gap-3 text-sm text-ink"
              >
                <input
                  type="radio"
                  name={`${id}-type`}
                  checked={type.valeur === option.valeur}
                  onChange={() => type.onChange(option.valeur)}
                  className="h-4 w-4 shrink-0 accent-ink"
                />
                <span className="flex-1">{option.libelle}</span>
                {option.compte !== undefined && (
                  <span className="font-mono text-xs text-ink-soft">
                    {option.compte}
                  </span>
                )}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className={type ? "py-5" : "pb-5"}>
        <h3 className={classeTitre}>
          <label htmlFor={`${id}-cat`}>Catégorie</label>
        </h3>
        <select
          id={`${id}-cat`}
          value={categorie}
          onChange={(e) => onCategorie(e.target.value)}
          className={classeChamp}
        >
          <option value="">Toutes les catégories</option>
          {CATEGORIES_REPERENTIEL.map((c) => {
            const compte = comptesCategories?.[c.valeur];
            return (
              <option key={c.valeur} value={c.valeur}>
                {c.libelle}
                {compte !== undefined ? ` (${compte})` : ""}
              </option>
            );
          })}
        </select>
      </div>

      <div role="group" aria-labelledby={`${id}-budget`} className="py-5">
        <h3 id={`${id}-budget`} className={classeTitre}>
          {labelBudget}
        </h3>
        <div className="flex gap-3">
          <div className="min-w-0 flex-1">
            <label htmlFor={`${id}-min`} className="sr-only">
              Montant minimum
            </label>
            <input
              id={`${id}-min`}
              type="text"
              inputMode="numeric"
              placeholder="Min"
              value={min}
              onChange={(e) => setMin(chiffres(e.target.value))}
              className={classeChamp}
            />
          </div>
          <div className="min-w-0 flex-1">
            <label htmlFor={`${id}-max`} className="sr-only">
              Montant maximum
            </label>
            <input
              id={`${id}-max`}
              type="text"
              inputMode="numeric"
              placeholder="Max"
              value={max}
              onChange={(e) => setMax(chiffres(e.target.value))}
              className={classeChamp}
            />
          </div>
        </div>
      </div>

      <div className="pt-5">
        <h3 className={classeTitre}>
          <label htmlFor={`${id}-comp`}>Compétence</label>
        </h3>
        <input
          id={`${id}-comp`}
          type="text"
          placeholder="Ex. Figma, WordPress…"
          value={competence}
          onChange={(e) => setCompetence(e.target.value)}
          className={classeChamp}
        />
      </div>
    </div>
  );
}

/** Colonne latérale de filtres (desktop, ≥ lg). */
export function ColonneFiltres<T extends string = string>(
  props: FiltresCatalogueProps<T>,
) {
  return (
    <aside
      aria-label="Filtres"
      className="hidden w-64 shrink-0 lg:sticky lg:top-24 lg:block"
    >
      <div className="rounded-xl border border-ink/10 bg-paper-light p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">
            Filtres
          </h2>
          {props.nbFiltresActifs > 0 && (
            <button
              type="button"
              onClick={props.onReinitialiser}
              className="text-sm text-ink-soft underline underline-offset-4 hover:text-ink"
            >
              Réinitialiser
            </button>
          )}
        </div>
        <ChampsFiltres {...props} />
      </div>
    </aside>
  );
}

/** Feuille du bas (mobile, < lg) : mêmes filtres, plein écran partiel. */
export function FeuilleFiltres<T extends string = string>({
  ouverte,
  onFermer,
  nbResultats,
  libelleResultats,
  ...props
}: FiltresCatalogueProps<T> & {
  ouverte: boolean;
  onFermer: () => void;
  nbResultats: number;
  /** Ex. « publications », « missions », « services ». */
  libelleResultats: string;
}) {
  const boutonFermer = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!ouverte) return;

    const overflowPrecedent = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    boutonFermer.current?.focus();

    function surTouche(e: KeyboardEvent) {
      if (e.key === "Escape") onFermer();
    }
    document.addEventListener("keydown", surTouche);

    return () => {
      document.body.style.overflow = overflowPrecedent;
      document.removeEventListener("keydown", surTouche);
    };
  }, [ouverte, onFermer]);

  if (!ouverte) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className="absolute inset-0 bg-ink/50"
        onClick={onFermer}
        aria-hidden="true"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label="Filtres"
        className="absolute inset-x-0 bottom-0 top-16 flex flex-col rounded-t-[20px] bg-paper-light"
      >
        <div className="flex justify-center pt-2.5" aria-hidden="true">
          <span className="h-1 w-10 rounded bg-ink/20" />
        </div>

        <div className="flex items-center justify-between border-b border-ink/10 py-2 pl-5 pr-2">
          <h2 className="font-display text-xl font-semibold text-ink">
            Filtres
          </h2>
          <button
            ref={boutonFermer}
            type="button"
            onClick={onFermer}
            aria-label="Fermer les filtres"
            className="flex h-11 w-11 items-center justify-center text-ink"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <ChampsFiltres {...(props as FiltresCatalogueProps<T>)} />
        </div>

        <div className="flex items-center gap-4 border-t border-ink/10 px-5 pb-5 pt-3">
          <button
            type="button"
            onClick={props.onReinitialiser}
            className="min-h-11 text-sm text-ink-soft underline underline-offset-4"
          >
            Réinitialiser
          </button>
          <button
            type="button"
            onClick={onFermer}
            className="min-h-12 flex-1 rounded-[10px] bg-ink px-4 text-[0.9375rem] font-medium text-paper-light"
          >
            Voir {nbResultats} {libelleResultats}
          </button>
        </div>
      </section>
    </div>
  );
}
