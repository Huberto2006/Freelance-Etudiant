import type { ReactNode } from "react";

/**
 * Fondu d'entrée d'une page, monté par les fichiers template.tsx.
 *
 * Opacité seule, sans transform conservé : un transform ferait du conteneur
 * le bloc de référence des éléments `position: fixed` (dialogues, tiroirs).
 * `h-full min-h-0` conserve la chaîne de hauteurs de la messagerie.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return <div className="page-entree h-full min-h-0">{children}</div>;
}
