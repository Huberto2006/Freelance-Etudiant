"use client";

import { useState } from "react";
import { Search, Tag as TagIcon, Wrench } from "lucide-react";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export interface Filtres {
  motsCles?: string;
  categorie?: string;
  competence?: string;
  budgetMin?: string;
  budgetMax?: string;
}

export function BarreRecherche({
  onFiltrer,
  placeholder = "Rechercher par mots-clés…",
  avecBudget = false,
}: {
  onFiltrer: (filtres: Filtres) => void;
  placeholder?: string;
  avecBudget?: boolean;
}) {
  const [motsCles, setMotsCles] = useState("");
  const [categorie, setCategorie] = useState("");
  const [competence, setCompetence] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    onFiltrer({
      motsCles: motsCles || undefined,
      categorie: categorie || undefined,
      competence: competence || undefined,
      budgetMin: budgetMin || undefined,
      budgetMax: budgetMax || undefined,
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 sm:flex-row sm:items-end mb-8 rounded-xl border border-ink/20 bg-paper-light p-4"
    >
      {/* Mots-clés */}
      <div className="w-full sm:w-80">
        <label className="mb-1.5 block h-5 text-xs font-mono uppercase tracking-wider text-ink-soft">
          Mots-clés
        </label>

        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft/60"
            aria-hidden="true"
          />
          <Input
            value={motsCles}
            onChange={(e) => setMotsCles(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-lg py-2 pl-9 pr-3"
          />
        </div>
      </div>

      {/* Catégorie */}
      <div className="w-full sm:w-80">
        <label className="mb-1.5 block h-5 text-xs font-mono uppercase tracking-wider text-ink-soft">
          Catégorie
        </label>

        <div className="relative">
          <TagIcon
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft/60"
            aria-hidden="true"
          />
          <Input
            value={categorie}
            onChange={(e) => setCategorie(e.target.value)}
            placeholder="Design…"
            className="w-full rounded-lg py-2 pl-9 pr-3"
          />
        </div>
      </div>

      {/* Compétence */}
      <div className="w-full sm:w-80">
        <label className="mb-1.5 block h-5 text-xs font-mono uppercase tracking-wider text-ink-soft">
          Compétence
        </label>

        <div className="relative">
          <Wrench
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft/60"
            aria-hidden="true"
          />
          <Input
            value={competence}
            onChange={(e) => setCompetence(e.target.value)}
            placeholder="Figma…"
            className="w-full rounded-lg py-2 pl-9 pr-3"
          />
        </div>
      </div>

      {avecBudget && (
        <>
          <div className="w-full sm:w-32">
            <label className="mb-1.5 block h-5 text-xs font-mono uppercase tracking-wider text-ink-soft">
              Budget min
            </label>
            <Input
              type="number"
              min={0}
              value={budgetMin}
              onChange={(e) => setBudgetMin(e.target.value)}
              placeholder="0"
              className="w-full rounded-lg py-2 px-3"
            />
          </div>
          <div className="w-full sm:w-32">
            <label className="mb-1.5 block h-5 text-xs font-mono uppercase tracking-wider text-ink-soft">
              Budget max
            </label>
            <Input
              type="number"
              min={0}
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value)}
              placeholder="500000"
              className="w-full rounded-lg py-2 px-3"
            />
          </div>
        </>
      )}

      <Button type="submit" variant="secondary" className="h-10 gap-2">
        <Search size={15} />
        Filtrer
      </Button>
    </form>
  );
}
