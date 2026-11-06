"use client";

import { clsx } from "clsx";

import { usePauseHorsEcran } from "./usePauseHorsEcran";

/**
 * Fond dégradé à dérive très lente, posé dans un parent `relative
 * overflow-hidden`. Le dégradé est peint une seule fois : seuls `transform` et
 * `opacity` varient, sans repeindre à chaque image. Couleurs issues du thème
 * actif, donc correctes en mode sombre. Statique sur mobile et avec
 * prefers-reduced-motion. Une seule instance par écran.
 */
export function AnimatedGradient({ className }: { className?: string }) {
  const ref = usePauseHorsEcran<HTMLDivElement>();

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={clsx("degrade-anime pointer-events-none absolute", className)}
    />
  );
}
