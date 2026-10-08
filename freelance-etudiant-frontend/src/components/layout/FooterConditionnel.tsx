"use client";

import { usePathname } from "next/navigation";

import { Footer } from "./Footer";

/**
 * Routes publiques « vitrine » qui affichent le Footer partagé : l'accueil
 * et les pages d'information (À propos, FAQ, Contact) ainsi que
 * l'annuaire des freelances.
 *
 * Les catalogues (/publications, /missions, /services) et les pages de
 * détail restent sans footer, comme avant : ce sont des écrans de travail
 * où le pied de page gênerait le défilement des listes.
 */
const ROUTES_AVEC_FOOTER = [
  "/",
  "/a-propos",
  "/faq",
  "/contact",
  "/freelances",
];

function footerVisibleSur(pathname: string): boolean {
  return ROUTES_AVEC_FOOTER.includes(pathname);
}

/**
 * Enveloppe cliente du Footer : le layout racine est un Server
 * Component, il ne peut pas appeler usePathname() lui-même. Ce
 * composant décide de l'affichage selon la route courante.
 *
 * Quand le Footer est masqué, rien n'est rendu : <main className="flex-1">
 * du layout continue d'occuper toute la hauteur disponible (pas de
 * positionnement fixed, le Footer reste naturellement après le contenu
 * sur les pages où il apparaît).
 */
export function FooterConditionnel() {
  const pathname = usePathname();

  if (!footerVisibleSur(pathname)) {
    return null;
  }

  return <Footer />;
}
