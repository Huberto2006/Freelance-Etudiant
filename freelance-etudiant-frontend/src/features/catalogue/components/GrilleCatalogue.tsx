"use client";

import { useState, type ReactNode } from "react";

const PAS = 12;

/**
 * Grille responsive de cartes avec affichage progressif : 12 annonces,
 * puis « Afficher plus ». Le compteur se réinitialise quand la liste change.
 */
export function GrilleCatalogue({
  elements,
}: {
  /** Cartes déjà construites (chacune avec sa `key`). */
  elements: ReactNode[];
}) {
  const [visibles, setVisibles] = useState(PAS);
  const [precedent, setPrecedent] = useState(elements.length);

  if (elements.length !== precedent) {
    setPrecedent(elements.length);
    setVisibles(PAS);
  }

  const restants = elements.length - visibles;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {elements.slice(0, visibles)}
      </div>

      {restants > 0 && (
        <div className="mt-8 flex flex-col items-center gap-2">
          <p className="font-mono text-xs text-ink-soft">
            {visibles} sur {elements.length}
          </p>
          <button
            type="button"
            onClick={() => setVisibles((v) => v + PAS)}
            className="min-h-11 rounded-[10px] border border-ink/25 bg-paper-light px-6 text-sm font-medium text-ink transition-colors hover:border-ink/50"
          >
            Afficher plus
          </button>
        </div>
      )}
    </>
  );
}
