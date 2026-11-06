import { clsx } from "clsx";
import { useTranslations } from "next-intl";

import { SkeletonShimmer } from "@/components/ui/motion/SkeletonShimmer";

/**
 * Squelette de chargement du catalogue : réplique la géométrie des cartes
 * (couverture, étiquette, titre, description, pied auteur/prix) avec un
 * reflet par carte, pour éviter le saut visuel au chargement.
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
        <SkeletonShimmer
          key={index}
          className="rounded-xl border border-ink/10 bg-paper-light"
        >
          <div className="h-28 bg-ink/10 sm:h-32" />

          <div className="flex flex-col gap-2.5 p-4">
            <div className="h-2.5 w-20 rounded bg-ink/10" />
            <div className="h-4 w-3/4 rounded bg-ink/10" />
            <div className="h-3 w-full rounded bg-ink/10" />
            <div className="h-3 w-2/3 rounded bg-ink/10" />

            <div className="mt-2 flex items-center justify-between border-t border-ink/10 pt-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-ink/10" />
                <div className="h-3 w-16 rounded bg-ink/10" />
              </div>
              <div className="h-4 w-20 rounded bg-ink/10" />
            </div>
          </div>
        </SkeletonShimmer>
      ))}
    </div>
  );
}
