"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useRef } from "react";
import type { KeyboardEvent } from "react";
import { clsx } from "clsx";

import type { MenuPublicDeroulant } from "@/lib/navigation-publique";

/**
 * Menu déroulant de la navigation publique (motif « disclosure »
 * recommandé pour une navigation : un bouton aria-expanded qui révèle
 * une liste de liens — pas un role="menu" d'application).
 *
 * L'état ouvert/fermé est piloté par la Navbar afin qu'un seul menu soit
 * ouvert à la fois. Comportements :
 * - clic / toucher : ouvre et ferme (aucun survol requis, donc utilisable
 *   au tactile) ;
 * - Échap : ferme et rend le focus au bouton ;
 * - ↓ sur le bouton : ouvre et place le focus sur le premier lien ;
 *   ↑/↓/Début/Fin : déplacement dans la liste ;
 * - sortie du focus (Tab) hors du menu : fermeture ;
 * - clic sur un lien : fermeture (la Navbar ferme aussi à tout
 *   changement de route).
 */
export function MenuDeroulantNav({
  menu,
  ouvert,
  actif,
  onOuvrirChange,
}: {
  menu: MenuPublicDeroulant;
  ouvert: boolean;
  actif: boolean;
  onOuvrirChange: (ouvert: boolean) => void;
}) {
  const conteneurRef = useRef<HTMLDivElement>(null);
  const boutonRef = useRef<HTMLButtonElement>(null);
  const panneauId = `${menu.id}-panneau`;

  function liens(): HTMLAnchorElement[] {
    return Array.from(
      conteneurRef.current?.querySelectorAll<HTMLAnchorElement>(
        `#${panneauId} a`,
      ) ?? [],
    );
  }

  function focaliser(index: number) {
    const elements = liens();
    if (elements.length === 0) return;
    const borne = (index + elements.length) % elements.length;
    elements[borne]?.focus();
  }

  function surToucheBouton(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!ouvert) onOuvrirChange(true);
      // Le panneau n'existe dans le DOM qu'une fois rendu : on attend
      // la prochaine frame avant de déplacer le focus.
      requestAnimationFrame(() => focaliser(0));
    }
  }

  function surToucheConteneur(event: KeyboardEvent<HTMLDivElement>) {
    if (!ouvert) return;

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onOuvrirChange(false);
      boutonRef.current?.focus();
      return;
    }

    const elements = liens();
    const index = elements.indexOf(
      document.activeElement as HTMLAnchorElement,
    );
    if (index === -1) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      focaliser(index + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focaliser(index - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focaliser(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focaliser(elements.length - 1);
    }
  }

  return (
    <div
      ref={conteneurRef}
      className="relative"
      onKeyDown={surToucheConteneur}
      onBlur={(event) => {
        // Le focus quitte entièrement le menu (Tab, clic ailleurs).
        if (
          ouvert &&
          !event.currentTarget.contains(event.relatedTarget as Node | null)
        ) {
          onOuvrirChange(false);
        }
      }}
    >
      <button
        ref={boutonRef}
        type="button"
        aria-expanded={ouvert}
        aria-controls={panneauId}
        onClick={() => onOuvrirChange(!ouvert)}
        onKeyDown={surToucheBouton}
        className={clsx(
          "inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bleu",
          actif || ouvert
            ? "text-bleu-dark"
            : "text-ink-soft hover:bg-ink/5 hover:text-ink",
        )}
      >
        {menu.label}
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={clsx(
            "transition-transform motion-reduce:transition-none",
            ouvert && "rotate-180",
          )}
        />
      </button>

      {ouvert && (
        <ul
          id={panneauId}
          className="absolute left-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-ink/10 bg-paper-light p-1.5 shadow-xl"
        >
          {menu.elements.map((element) => {
            const Icone = element.icon;
            return (
              <li key={element.href}>
                <Link
                  href={element.href}
                  onClick={() => onOuvrirChange(false)}
                  className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-ink/5 focus-visible:bg-ink/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-bleu"
                >
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bleu-soft text-bleu-dark"
                  >
                    <Icone size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-ink">
                      {element.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-soft">
                      {element.description}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
