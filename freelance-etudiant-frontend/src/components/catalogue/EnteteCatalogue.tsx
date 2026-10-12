import type { ReactNode } from "react";

/**
 * En-tête sobre des pages catalogue : surtitre mono, titre Zilla Slab,
 * description, compteur discret et (optionnel) une seule action.
 */
export function EnteteCatalogue({
  surtitre,
  titre,
  description,
  indicateurs,
  action,
}: {
  surtitre: string;
  titre: string;
  description: string;
  /** Ligne de synthèse discrète (ex. « 48 publications · 30 missions · 18 services »). */
  indicateurs?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div className="min-w-0">
        <p className="mb-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-ink-soft">
          {surtitre}
        </p>
        <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">
          {titre}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
          {description}
        </p>
        {indicateurs && (
          <p
            className="mt-2 font-mono text-xs text-ink-soft/80"
            aria-live="polite"
          >
            {indicateurs}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
