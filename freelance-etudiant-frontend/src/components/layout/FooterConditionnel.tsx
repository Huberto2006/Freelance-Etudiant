"use client";

import { usePathname } from "next/navigation";

import { Footer } from "./Footer";

/**
 * Pages (et sections) sur lesquelles le Footer est affiché :
 *
 * - Accueil            : "/"
 * - Section Missions   : "/missions" et "/missions/..."
 * - Section Services   : "/services" et "/services/..."
 *
 * Partout ailleurs (tableau de bord, profil, paramètres, messages,
 * notifications, candidatures, livraisons, paiements, pages
 * d'authentification, vérification email...) le Footer est masqué.
 *
 * On raisonne par SEGMENTS de route (égalité exacte + préfixe de
 * segment terminé par "/") et non par un simple `pathname.includes()`
 * : une page comme "/tableau-de-bord/missions" contient la chaîne
 * "missions" mais ne fait PAS partie de la section Missions et ne
 * doit donc PAS afficher le Footer.
 */
function footerVisibleSur(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/missions" ||
    pathname.startsWith("/missions/") ||
    pathname === "/services" ||
    pathname.startsWith("/services/")
  );
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