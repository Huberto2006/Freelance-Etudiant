import { clsx } from "clsx";
import { useTranslations } from "next-intl";

/**
 * Squelette de chargement du catalogue : réplique la géométrie des cartes
 * (couverture, étiquette, titre, description, pied auteur/prix) avec des
 * blocs pulsés, pour éviter le saut visuel au chargement.
 */
export function SqueletteCatalogue({
  nombre = 6,
  className,
}: {
  /** Nombre de cartes fantômes affichées. */
  nombre?: number;
  className?: string;
}) {
  const t = useTranslations("extras.shared");
  return (
    <div
      role="status"
      aria-label={t("catalogLoading")}
      className={clsx("grid gap-4 sm:grid-cols-2 xl:grid-cols-3", className)}
    >
      {Array.from({ length: nombre }).map((_, index) => (
        <div
          key={index}
          aria-hidden="true"
          className="overflow-hidden rounded-xl border border-ink/10 bg-paper-light"
        >
          <div className="h-28 animate-pulse bg-ink/5 sm:h-32" />

          <div className="flex flex-col gap-2.5 p-4">
            <div className="h-2.5 w-20 animate-pulse rounded bg-ink/5" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-ink/5" />
            <div className="h-3 w-full animate-pulse rounded bg-ink/5" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-ink/5" />

            <div className="mt-2 flex items-center justify-between border-t border-ink/10 pt-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 animate-pulse rounded-full bg-ink/5" />
                <div className="h-3 w-16 animate-pulse rounded bg-ink/5" />
              </div>
              <div className="h-4 w-20 animate-pulse rounded bg-ink/5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
