import { clsx } from "clsx";
import type { ElementType, HTMLAttributes, ReactNode } from "react";

const CLASSES = {
  /** Fondu + montée de 6 px : contenu qui change (étape de formulaire). */
  remonte: "entree-remonte",
  /** Fondu simple : élément neutre. */
  fondu: "animate-in-fade",
  /** Entrée d'emphase, réservée aux premières vues (640 ms). */
  scene: "scene-in",
  /** Révélation au défilement, si le navigateur la prend en charge. */
  defilement: "reveal",
} as const;

/**
 * Apparition d'un bloc, 100 % CSS : utilisable dans un composant serveur et
 * sans JavaScript ajouté. Pour rejouer l'animation quand un contenu change,
 * donner une `key` liée à ce contenu.
 */
export function FadeIn({
  as: Element = "div",
  variante = "remonte",
  delai,
  className,
  style,
  children,
  ...reste
}: HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  variante?: keyof typeof CLASSES;
  /** Délai en millisecondes (jamais sur une action de l'utilisateur). */
  delai?: number;
  children: ReactNode;
}) {
  return (
    <Element
      className={clsx(CLASSES[variante], className)}
      style={delai ? { ...style, animationDelay: `${delai}ms` } : style}
      {...reste}
    >
      {children}
    </Element>
  );
}
