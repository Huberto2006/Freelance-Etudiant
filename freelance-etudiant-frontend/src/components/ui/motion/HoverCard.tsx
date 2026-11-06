import { clsx } from "clsx";
import type { ElementType, HTMLAttributes, ReactNode } from "react";

/**
 * Carte entièrement cliquable : élévation de 2 px et bordure plus marquée au
 * survol (appareils à pointeur précis) comme au focus clavier.
 */
export function HoverCard({
  as: Element = "div",
  className,
  children,
  ...reste
}: HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  children: ReactNode;
}) {
  return (
    <Element className={clsx("notice-card card-link", className)} {...reste}>
      {children}
    </Element>
  );
}
