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
  filtresInitiaux,
}: {
  onFiltrer: (filtres: Filtres) => void;
  placeholder?: string;
  avecBudget?: boolean;
  /** Valeurs pre-remplies depuis l'URL (ex. /services?q=design). */
  filtresInitiaux?: Filtres;
}) {
  const [motsCles, setMotsCles] = useState(filtresInitiaux?.motsCles ?? "");
  const [categorie, setCategorie] = useState(filtresInitiaux?.categorie ?? "");
  const [competence, setCompetence] = useState(
    filtresInitiaux?.competence ?? "",
  );

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    onFiltrer({
      motsCles: motsCles || undefined,
      categorie: categorie || undefined,
      competence: competence || undefined,
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

      <Button
        type="submit"
        variant="secondary"
        className="inline-flex h-10 w-full items-center justify-center gap-2 sm:w-auto"
      >
        <Search size={15} />
        <span>Filtrer</span>
      </Button>
    </form>
  );
}
