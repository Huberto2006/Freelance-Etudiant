"use client";

import { usePathname } from "next/navigation";

import { Navbar } from "./Navbar";

/**
 * Sections de route gérées par le tableau de bord.
 *
 * Le layout de /tableau-de-bord rend déjà sa propre Navbar (variante
 * hasSidebar : décalée de la largeur de la Sidebar et reliée au drawer
 * mobile). Rendre aussi la Navbar publique ici produirait deux barres
 * fixes superposées : la seconde masque la première, mais ses liens
 * resteraient présents dans l'ordre de tabulation et le DOM porterait
 * deux fois le même composant.
 *
 * On raisonne par SEGMENT de route (égalité exacte + préfixe terminé
 * par "/", même convention que FooterConditionnel).
 */
function tableauDeBordActif(pathname: string): boolean {
  return (
    pathname === "/tableau-de-bord" ||
    pathname.startsWith("/tableau-de-bord/")
  );
}

/**
 * Enveloppe cliente de la Navbar : le layout racine est un Server
 * Component, il ne peut pas appeler usePathname() lui-même (même
 * convention que FooterConditionnel).
 */
export function NavbarConditionnelle() {
  const pathname = usePathname();

  if (tableauDeBordActif(pathname)) {
    return null;
  }

  return <Navbar />;
}