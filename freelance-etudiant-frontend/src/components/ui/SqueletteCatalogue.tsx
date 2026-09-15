import { clsx } from "clsx";

/**
 * Squelette de chargement du catalogue (missions / services) : réplique
 * la géométrie des cartes (couverture + titre + description + pied) avec
 * des blocs pulsés, pour éviter le saut visuel au chargement des données.
 * Utilisé par les pages publiques /missions et /services, ainsi que par
 * leur fallback Suspense.
 */
export function SqueletteCatalogue({
  nombre = 6,
  className,
}: {
  /** Nombre de cartes fantômes affichées. */
  nombre?: number;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label="Chargement du catalogue"
      className={clsx("grid gap-5 sm:grid-cols-2 xl:grid-cols-3", className)}
    >
      {Array.from({ length: nombre }).map((_, index) => (
        <div
          key={index}
          aria-hidden="true"
          className="overflow-hidden rounded-[15px] border border-ink/10 bg-paper-light shadow-[0_1px_0_rgba(15,23,42,0.04),0_8px_16px_-12px_rgba(15,23,42,0.20)]"
        >
          {/* Couverture */}
          <div className="h-32 animate-pulse bg-ink/5 sm:h-36" />

          <div className="flex flex-col gap-3 p-4">
            {/* Titre */}
            <div className="h-4 w-3/4 animate-pulse rounded bg-ink/5" />
            {/* Description */}
            <div className="h-3 w-full animate-pulse rounded bg-ink/5" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-ink/5" />

            {/* Pied : prix + méta */}
            <div className="mt-auto flex items-center justify-between border-t border-ink/10 pt-3">
              <div className="h-4 w-24 animate-pulse rounded bg-ink/5" />
              <div className="h-3 w-16 animate-pulse rounded bg-ink/5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}