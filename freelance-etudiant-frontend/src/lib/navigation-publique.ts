import {
  CircleHelp,
  Layers3,
  LifeBuoy,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * Structure de la navigation publique (Navbar, menu mobile, Footer).
 *
 * Source unique : les libellés, descriptions et routes ne sont écrits
 * qu'ici afin que la Navbar desktop, le menu mobile et le Footer ne
 * divergent jamais.
 */

export interface ElementMenuPublic {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export interface MenuPublicDeroulant {
  id: string;
  label: string;
  /** Préfixes de route pour lesquels le menu est considéré « actif ». */
  prefixesActifs: string[];
  elements: ElementMenuPublic[];
}

export const LIEN_ACCUEIL = { href: "/", label: "Accueil" } as const;
export const LIEN_A_PROPOS = {
  href: "/a-propos",
  label: "À propos",
} as const;

export const MENU_EXPLORER: MenuPublicDeroulant = {
  id: "menu-explorer",
  label: "Explorer",
  // /missions, /services et /etudiants/[id] sont les pages de détail ou
  // les vues filtrées de ce que l'on explore : on garde donc « Explorer »
  // allumé sur ces routes.
  prefixesActifs: [
    "/publications",
    "/missions",
    "/services",
    "/freelances",
    "/etudiants",
  ],
  elements: [
    {
      href: "/publications",
      label: "Toutes les publications",
      description: "Missions et services au même endroit",
      icon: Layers3,
    },
    {
      href: "/freelances",
      label: "Découvrir les freelances",
      description: "Compétences et profils publics",
      icon: Users,
    },
  ],
};

export const MENU_AIDE: MenuPublicDeroulant = {
  id: "menu-aide",
  label: "Centre d'aide",
  prefixesActifs: ["/faq", "/contact"],
  elements: [
    {
      href: "/faq",
      label: "FAQ",
      description: "Réponses aux questions fréquentes",
      icon: CircleHelp,
    },
    {
      href: "/contact",
      label: "Contact et assistance",
      description: "Besoin d'aide ? Contacte-nous",
      icon: LifeBuoy,
    },
  ],
};

/** Vrai si `pathname` est égal au préfixe ou en est un sous-chemin. */
export function cheminCorrespond(
  pathname: string,
  prefixes: string[],
): boolean {
  return prefixes.some(
    (prefixe) =>
      pathname === prefixe || pathname.startsWith(`${prefixe}/`),
  );
}
