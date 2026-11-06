"use client";

import type { ReactNode } from "react";
import { domAnimation, LazyMotion, MotionConfig } from "motion/react";

/**
 * Contexte commun aux composants fondés sur Motion.
 *
 * Il est monté par chacun de ces composants et non dans le layout racine :
 * seules les routes qui ont réellement besoin d'une animation de sortie
 * téléchargent Motion. `strict` interdit le composant `motion.*` complet.
 *
 * `reducedMotion="user"` respecte prefers-reduced-motion : les déplacements
 * deviennent instantanés, seuls les fondus sont conservés.
 */
export function MouvementLocal({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
