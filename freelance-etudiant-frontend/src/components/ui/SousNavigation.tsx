"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

export interface OngletSousMenu {
  /** Valeur de filtre locale (onglets gérés côté client) OU href (liens). */
  valeur: string;
  label: string;
  /** Compteur optionnel affiché dans l'onglet. */
  compte?: number;
}

/**
 * Sous-navigation de catégorie : distingue visuellement les sous-menus
 * (filtres de données) de la navigation principale (Navbar/Sidebar).
 *
 * Style volontairement différent : pilules compactes, police mono
 * majuscule, alignées sur la palette existante (ocre/ink/paper).
 * Responsive : défilement horizontal sur mobile sans casser la mise en
 * page (aucune nouvelle sidebar).
 */
export function SousNavigation({
  onglets,
  actif,
  onChanger,
}: {
  onglets: OngletSousMenu[];
  /** Onglet actif (valeur). */
  actif: string;
  /** Sélection d'un onglet (filtrage client-side). */
  onChanger: (valeur: string) => void;
}) {
  return (
    <nav
      aria-label="Filtres de catégorie"
      className="
        -mx-1 mb-6 flex gap-2 overflow-x-auto pb-1
        [scrollbar-width:thin]
      "
    >
      {onglets.map((onglet) => {
        const estActif = onglet.valeur === actif;
        return (
          <button
            key={onglet.valeur}
            type="button"
            onClick={() => onChanger(onglet.valeur)}
            aria-current={estActif ? "true" : undefined}
            className={clsx(
              "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5",
              "font-mono text-[11px] uppercase tracking-wider transition-colors",
              estActif
                ? "border-ink bg-ink text-paper-light"
                : "border-ink/20 bg-paper text-ink-soft hover:border-ink/50 hover:text-ink",
            )}
          >
            {onglet.label}
            {onglet.compte !== undefined && (
              <span
                className={clsx(
                  "rounded-full px-1.5 py-px text-[10px] leading-none",
                  estActif
                    ? "bg-paper-light/20 text-paper-light"
                    : "bg-ink/10 text-ink-soft",
                )}
              >
                {onglet.compte}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

/**
 * Variante lien (next/link) pour sous-menus qui correspondent à des
 * routes réelles plutôt qu'à des filtres locaux.
 */
export function SousNavigationLiens({
  liens,
}: {
  liens: { href: string; label: string; compte?: number }[];
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Sous-navigation"
      className="-mx-1 mb-6 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]"
    >
      {liens.map((lien) => {
        const estActif = pathname === lien.href;
        return (
          <Link
            key={lien.href}
            href={lien.href}
            aria-current={estActif ? "page" : undefined}
            className={clsx(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5",
              "font-mono text-[11px] uppercase tracking-wider transition-colors",
              estActif
                ? "border-ink bg-ink text-paper-light"
                : "border-ink/20 bg-paper text-ink-soft hover:border-ink/50 hover:text-ink",
            )}
          >
            {lien.label}
            {lien.compte !== undefined && (
              <span
                className={clsx(
                  "rounded-full px-1.5 py-px text-[10px] leading-none",
                  estActif
                    ? "bg-paper-light/20 text-paper-light"
                    : "bg-ink/10 text-ink-soft",
                )}
              >
                {lien.compte}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}