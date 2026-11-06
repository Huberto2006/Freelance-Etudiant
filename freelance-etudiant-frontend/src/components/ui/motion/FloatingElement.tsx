"use client";

import { clsx } from "clsx";
import type { CSSProperties, ReactNode } from "react";

import { usePauseHorsEcran } from "./usePauseHorsEcran";

/**
 * Lévitation lente d'un élément DÉCORATIF : uniquement `transform`, suspendue
 * hors écran, désactivée sur mobile et avec prefers-reduced-motion. Jamais
 * sur du texte ni sur un contrôle.
 */
export function FloatingElement({
  amplitude = 8,
  duree = 7,
  className,
  children,
}: {
  /** Déplacement vertical maximal, en pixels. */
  amplitude?: number;
  /** Durée d'un aller, en secondes. */
  duree?: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = usePauseHorsEcran<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={clsx("flottant", className)}
      style={
        {
          "--flottant-amplitude": `${-amplitude}px`,
          "--flottant-duree": `${duree}s`,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}
