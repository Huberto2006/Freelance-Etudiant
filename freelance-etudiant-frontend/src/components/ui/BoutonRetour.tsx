"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/**
 * Bouton « ← Retour » des pages internes.
 *
 * Deux comportements possibles :
 *  - Par défaut (`forcer` absent) : utilise l'historique du navigateur
 *    (router.back()) afin de revenir à la page précédente réelle — adapté
 *    aux pages de DÉTAIL atteintes depuis une liste (ex. détail d'une
 *    mission → liste des missions). Si l'historique est vide, un repli
 *    statique est utilisé.
 *  - `forcer` : navigue toujours vers `repli`, sans passer par
 *    l'historique. Adapté aux pages RACINES d'une section du tableau de
 *    bord (livraisons, paiements, messages...), qui sont accessibles
 *    depuis la sidebar depuis n'importe où : l'historique du navigateur
 *    n'y reflète pas la hiérarchie logique de navigation, donc
 *    router.back() peut renvoyer vers une page sans rapport (ex. le
 *    profil) au lieu du tableau de bord.
 *
 * À NE PAS afficher sur la page d'accueil principale (« / »), où il
 * n'améliore pas la navigation.
 */
export function BoutonRetour({
  label = "Retour",
  repli = "/tableau-de-bord",
  forcer = false,
  className = "",
}: {
  label?: string;
  /** Destination utilisée si l'historique navigateur est vide, ou toujours si `forcer` est vrai. */
  repli?: string;
  /** Si vrai, navigue toujours vers `repli` (ignore l'historique du navigateur). */
  forcer?: boolean;
  className?: string;
}) {
  const router = useRouter();

  function retour() {
    if (forcer) {
      router.push(repli);
      return;
    }

    // On ne revient en arrière que si une page précédente existe réellement
    // (évite de rester bloqué sur une URL ouverte dans un nouvel onglet).
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(repli);
    }
  }

  return (
    <button
      type="button"
      onClick={retour}
      aria-label="Revenir à la page précédente"
      className={`
        inline-flex items-center gap-1.5 rounded-lg border border-ink/15
        bg-paper px-3 py-1.5 font-mono text-xs uppercase tracking-wider
        text-ink-soft transition-colors hover:border-ink/40 hover:text-ink
        cursor-pointer
        ${className}
      `}
    >
      <ArrowLeft size={14} aria-hidden="true" />
      {label}
    </button>
  );
}