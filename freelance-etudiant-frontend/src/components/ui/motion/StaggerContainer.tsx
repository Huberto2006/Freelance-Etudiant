import { clsx } from "clsx";
import type { ElementType, HTMLAttributes, ReactNode } from "react";

/**
 * Apparition échelonnée des enfants directs au montage (classe `.cascade` :
 * 8 premiers éléments, pas de 35 ms). Un élément ajouté plus tard, comme une
 * nouvelle notification, s'anime seul : les éléments déjà affichés ne
 * rejouent rien.
 *
 * À réserver aux listes de cartes : ni aux lignes de tableau, ni aux fils
 * de messages, dont le volume rendrait l'effet long et coûteux.
 */
export function StaggerContainer({
  as: Element = "div",
  className,
  children,
  ...reste
}: HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  children: ReactNode;
}) {
  return (
    <Element className={clsx("cascade", className)} {...reste}>
      {children}
    </Element>
  );
}
