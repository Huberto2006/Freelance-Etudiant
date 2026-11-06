import { clsx } from "clsx";
import type { ReactNode } from "react";

/**
 * Regroupe les blocs d'un squelette de chargement sous UN SEUL reflet qui
 * balaie l'ensemble, au lieu d'un reflet par bloc : une carte de squelette
 * ne coûte qu'une animation, en `transform` uniquement.
 */
export function SkeletonShimmer({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div aria-hidden="true" className={clsx("shimmer-groupe", className)}>
      {children}
    </div>
  );
}
