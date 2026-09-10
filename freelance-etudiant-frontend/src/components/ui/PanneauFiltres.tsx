"use client";

import { useState } from "react";
import { Search, Wrench, X } from "lucide-react";

import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export interface Filtres {
  motsCles?: string;
  competence?: string;
  budgetMin?: string;
  budgetMax?: string;
}

const filtresVides: Filtres = {
  motsCles: undefined,
  competence: undefined,
  budgetMin: undefined,
  budgetMax: undefined,
};

function estVide(filtres: Filtres) {
  return (
    !filtres.motsCles &&
    !filtres.competence &&
    !filtres.budgetMin &&
    !filtres.budgetMax
  );
}

/**
 * Panneau de filtres affiche en colonne de gauche des pages missions et
 * services. La categorie n'y figure plus : elle est geree par le sous-menu
 * (`SousMenuCatalogue`), pour eviter deux controles redondants qui
 * pourraient se contredire.
 */
export function PanneauFiltres({
  onFiltrer,
  filtresInitiaux,
  placeholder = "Rechercher par mots-clés…",
  labelBudget = "Budget (Ar)",
}: {
  onFiltrer: (filtres: Filtres) => void;
  filtresInitiaux?: Filtres;
  placeholder?: string;
  /** Libellé du champ prix/budget : différent pour missions et services. */
  labelBudget?: string;
}) {
  const [prevFiltres, setPrevFiltres] = useState(filtresInitiaux);
  const [motsCles, setMotsCles] = useState(filtresInitiaux?.motsCles ?? "");
  const [competence, setCompetence] = useState(
    filtresInitiaux?.competence ?? "",
  );
  const [budgetMin, setBudgetMin] = useState(
    filtresInitiaux?.budgetMin ?? "",
  );
  const [budgetMax, setBudgetMax] = useState(
    filtresInitiaux?.budgetMax ?? "",
  );

  /*
   * Si les filtres initiaux changent depuis l'URL ou un sous-menu, on
   * réajuste l'état local pendant le rendu sans effet de bord.
   */
  if (filtresInitiaux !== prevFiltres) {
    setPrevFiltres(filtresInitiaux);
    setMotsCles(filtresInitiaux?.motsCles ?? "");
    setCompetence(filtresInitiaux?.competence ?? "");
    setBudgetMin(filtresInitiaux?.budgetMin ?? "");
    setBudgetMax(filtresInitiaux?.budgetMax ?? "");
  }

  const filtresActuels: Filtres = {
    motsCles: motsCles || undefined,
    competence: competence || undefined,
    budgetMin: budgetMin || undefined,
    budgetMax: budgetMax || undefined,
  };

  const filtresActifs = !estVide(filtresActuels);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    onFiltrer(filtresActuels);
  }

  function reinitialiser() {
    setMotsCles("");
    setCompetence("");
    setBudgetMin("");
    setBudgetMax("");
    onFiltrer(filtresVides);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-5 rounded-xl border border-ink/20 bg-paper-light p-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink">
          Filtres
        </h2>

        {filtresActifs && (
          <button
            type="button"
            onClick={reinitialiser}
            className="inline-flex items-center gap-1 text-xs text-ink-soft/70 hover:text-brique transition-colors"
          >
            <X size={12} />
            Réinitialiser
          </button>
        )}
      </div>

      {/* Mots-clés */}
      <div>
        <label
          htmlFor="filtre-mots-cles"
          className="mb-1.5 block text-xs font-mono uppercase tracking-wider text-ink-soft"
        >
          Mots-clés
        </label>

        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft/60"
            aria-hidden="true"
          />
          <Input
            id="filtre-mots-cles"
            value={motsCles}
            onChange={(e) => setMotsCles(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-lg py-2 pl-9 pr-3"
          />
        </div>
      </div>

      {/* Compétence */}
      <div>
        <label
          htmlFor="filtre-competence"
          className="mb-1.5 block text-xs font-mono uppercase tracking-wider text-ink-soft"
        >
          Compétence
        </label>

        <div className="relative">
          <Wrench
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft/60"
            aria-hidden="true"
          />
          <Input
            id="filtre-competence"
            value={competence}
            onChange={(e) => setCompetence(e.target.value)}
            placeholder="Figma…"
            className="w-full rounded-lg py-2 pl-9 pr-3"
          />
        </div>
      </div>

      {/* Budget / Prix */}
      <div>
        <span className="mb-1.5 block text-xs font-mono uppercase tracking-wider text-ink-soft">
          {labelBudget}
        </span>

        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            value={budgetMin}
            onChange={(e) => setBudgetMin(e.target.value)}
            placeholder="Min"
            aria-label={`${labelBudget} minimum`}
            className="w-full rounded-lg py-2"
          />
          <span className="text-ink-soft/60" aria-hidden="true">
            —
          </span>
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            value={budgetMax}
            onChange={(e) => setBudgetMax(e.target.value)}
            placeholder="Max"
            aria-label={`${labelBudget} maximum`}
            className="w-full rounded-lg py-2"
          />
        </div>
      </div>

      <Button
        type="submit"
        variant="secondary"
        className="w-full flex items-center justify-center gap-2"
      >
        <Search size={15} />
        <span>Filtrer</span>
      </Button>
    </form>
  );
}
