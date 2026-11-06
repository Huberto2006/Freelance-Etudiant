"use client";

import { clsx } from "clsx";
import { useState, type ReactNode } from "react";

/**
 * Compte les hausses d'une valeur (état ajusté pendant le rendu). Une baisse,
 * comme le passage d'une notification à « lue », n'attire jamais l'attention.
 */
function useHausses(valeur: number) {
  const [precedente, setPrecedente] = useState(valeur);
  const [hausses, setHausses] = useState(0);

  if (valeur !== precedente) {
    setPrecedente(valeur);
    if (valeur > precedente) setHausses(hausses + 1);
  }

  return hausses;
}

/**
 * Oscillation unique et brève de l'icône à l'arrivée d'une notification.
 * `signal` est un compteur d'événements temps réel : chaque incrément rejoue
 * l'animation. À 0, rien ne bouge (aucun effet au chargement de la page).
 */
export function NotificationAnimation({
  signal,
  children,
}: {
  signal: number;
  children: ReactNode;
}) {
  return (
    <span
      key={signal}
      className={clsx("inline-flex", signal > 0 && "signal-notification")}
    >
      {children}
    </span>
  );
}

/** Pastille de compteur : légère mise à l'échelle quand le total augmente. */
export function BadgeCompteur({
  total,
  className,
  children,
}: {
  total: number;
  className?: string;
  children: ReactNode;
}) {
  const hausses = useHausses(total);

  return (
    <span key={hausses} className={clsx("badge-apparition", className)}>
      {children}
    </span>
  );
}
