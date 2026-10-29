import type { ReactNode } from "react";
import { SearchX } from "lucide-react";

/** Aucun résultat : message clair, une seule action principale. */
export function EtatVideCatalogue({
  titre,
  conseil = "Essayez d’élargir votre recherche ou de retirer un filtre.",
  onReinitialiser,
  secondaire,
}: {
  titre: string;
  conseil?: string;
  onReinitialiser?: () => void;
  secondaire?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-ink/20 bg-paper-light px-6 py-12 text-center">
      <span
        className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-ink/5 text-ink-soft"
        aria-hidden="true"
      >
        <SearchX size={20} />
      </span>
      <h2 className="font-display text-lg font-semibold text-ink">{titre}</h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-ink-soft">
        {conseil}
      </p>
      {(onReinitialiser || secondaire) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-4">
          {onReinitialiser && (
            <button
              type="button"
              onClick={onReinitialiser}
              className="min-h-11 rounded-[10px] bg-ink px-5 text-sm font-medium text-paper-light"
            >
              Réinitialiser les filtres
            </button>
          )}
          {secondaire}
        </div>
      )}
    </div>
  );
}

/** Erreur de chargement avec nouvelle tentative. */
export function ErreurCatalogue({
  message,
  onReessayer,
}: {
  message: string;
  onReessayer?: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-brique/30 bg-paper-light px-6 py-10 text-center"
    >
      <p className="text-sm font-medium text-brique">{message}</p>
      {onReessayer && (
        <button
          type="button"
          onClick={onReessayer}
          className="mt-4 min-h-11 rounded-[10px] border border-ink/25 px-5 text-sm font-medium text-ink hover:border-ink/50"
        >
          Réessayer
        </button>
      )}
    </div>
  );
}
