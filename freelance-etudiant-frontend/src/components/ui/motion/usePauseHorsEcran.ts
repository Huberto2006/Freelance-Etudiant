"use client";

import { useEffect, useRef } from "react";

/**
 * Suspend une animation permanente quand son élément n'est plus visible.
 * L'état est porté par un attribut (data-hors-ecran, voir globals.css) posé
 * directement sur le DOM : aucun re-rendu React.
 */
export function usePauseHorsEcran<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observateur = new IntersectionObserver(([entree]) => {
      element.dataset.horsEcran = String(!entree.isIntersecting);
    });
    observateur.observe(element);

    return () => observateur.disconnect();
  }, []);

  return ref;
}
