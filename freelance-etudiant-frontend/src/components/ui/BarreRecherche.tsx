"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export interface Filtres {
  motsCles?: string;
  categorie?: string;
  competence?: string;
}

export function BarreRecherche({
  onFiltrer,
  placeholder = "Rechercher par mots-clés…",
}: {
  onFiltrer: (filtres: Filtres) => void;
  placeholder?: string;
}) {
  const [motsCles, setMotsCles] = useState("");
  const [categorie, setCategorie] = useState("");
  const [competence, setCompetence] = useState("");

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
      className="flex flex-col gap-3 sm:flex-row sm:items-end mb-8 border border-ink/20 bg-paper-light p-4"
    >
      {/* Mots-clés */}
      <div className="w-full sm:w-80">
        <label className="mb-1.5 block h-5 text-xs font-mono uppercase tracking-wider text-ink-soft">
          Mots-clés
        </label>

        <Input
          value={motsCles}
          onChange={(e) => setMotsCles(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg px-3 py-2"
        />
      </div>

      {/* Catégorie */}
      <div className="w-full sm:w-80">
        <label className="mb-1.5 block h-5 text-xs font-mono uppercase tracking-wider text-ink-soft">
          Catégorie
        </label>

        <Input
          value={categorie}
          onChange={(e) => setCategorie(e.target.value)}
          placeholder="Design…"
          className="w-full rounded-lg px-3 py-2"
        />
      </div>

      {/* Compétence */}
      <div className="w-full sm:w-80">
        <label className="mb-1.5 block h-5 text-xs font-mono uppercase tracking-wider text-ink-soft">
          Compétence
        </label>

        <Input
          value={competence}
          onChange={(e) => setCompetence(e.target.value)}
          placeholder="Figma…"
          className="w-full rounded-lg px-3 py-2"
        />
      </div>

      <Button type="submit" variant="secondary" className="h-10">
        Filtrer
      </Button>
    </form>
  );
}
