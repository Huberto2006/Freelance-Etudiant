"use client";

import { usePathname } from "next/navigation";

import { Footer } from "./Footer";

/**
 * Le Footer ne doit être affiché que sur la page d'accueil.
 *
 * Toutes les autres routes, y compris les sections publiques comme
 * "/missions" et "/services", doivent le masquer.
 */
function footerVisibleSur(pathname: string): boolean {
  return pathname === "/";
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