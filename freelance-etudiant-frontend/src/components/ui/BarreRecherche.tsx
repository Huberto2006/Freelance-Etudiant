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
      <div className="flex-1">
        <label className="text-xs font-mono uppercase tracking-wider text-ink-soft block mb-1.5">
          Mots-clés
        </label>
        <Input
          value={motsCles}
          onChange={(e) => setMotsCles(e.target.value)}
          placeholder={placeholder}
        />
      </div>
      <div className="w-full sm:w-40">
        <label className="text-xs font-mono uppercase tracking-wider text-ink-soft block mb-1.5">
          Catégorie
        </label>
        <Input
          value={categorie}
          onChange={(e) => setCategorie(e.target.value)}
          placeholder="Design…"
        />
      </div>
      <div className="w-full sm:w-40">
        <label className="text-xs font-mono uppercase tracking-wider text-ink-soft block mb-1.5">
          Compétence
        </label>
        <Input
          value={competence}
          onChange={(e) => setCompetence(e.target.value)}
          placeholder="Figma…"
        />
      </div>
      <Button type="submit" variant="secondary">
        Filtrer
      </Button>
    </form>
  );
}
