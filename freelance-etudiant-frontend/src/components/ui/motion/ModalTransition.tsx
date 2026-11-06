"use client";

import type { HTMLAttributes, ReactNode, Ref } from "react";
import { AnimatePresence, useIsPresent } from "motion/react";
import * as m from "motion/react-m";

import { MouvementLocal } from "./MouvementLocal";
import { COURBE_DOUCE, DUREE_BASE, DUREE_LENTE, DUREE_RAPIDE } from "./transitions";

const FERME = {
  centre: { opacity: 0, scale: 0.97, y: 6 },
  droite: { x: "100%" },
} as const;

type AttributsDialogue = Pick<
  HTMLAttributes<HTMLDivElement>,
  | "role"
  | "aria-modal"
  | "aria-label"
  | "aria-labelledby"
  | "aria-describedby"
  | "aria-busy"
>;

type Proprietes = AttributsDialogue & {
  ouvert: boolean;
  /** Classes du fond (position fixed, couleur du voile, alignement). */
  classeFond: string;
  classePanneau?: string;
  /** `centre` : boîte de dialogue. `droite` : panneau latéral. */
  variante?: keyof typeof FERME;
  refPanneau?: Ref<HTMLDivElement>;
  surClicFond?: () => void;
  children: ReactNode;
};

/**
 * Entrée et SORTIE d'un dialogue. Le contenu reste monté le temps de la
 * sortie, avec ses dernières propriétés : son texte ne change pas pendant
 * qu'il disparaît, même si le parent a déjà remis ses données à null.
 */
export function ModalTransition({ ouvert, ...reste }: Proprietes) {
  return (
    <MouvementLocal>
      <AnimatePresence>{ouvert && <Dialogue {...reste} />}</AnimatePresence>
    </MouvementLocal>
  );
}

function Dialogue({
  classeFond,
  classePanneau,
  variante = "centre",
  refPanneau,
  surClicFond,
  children,
  ...attributs
}: Omit<Proprietes, "ouvert">) {
  // Pendant la sortie, le contenu est inerte : un second clic sur « Confirmer »
  // ne peut pas relancer l'action déjà validée.
  const present = useIsPresent();

  return (
    <m.div
      {...attributs}
      inert={!present}
      className={classeFond}
      onClick={(event) => {
        // Seul un clic sur le fond lui-même ferme le dialogue.
        if (event.target === event.currentTarget) surClicFond?.();
      }}
      initial="ferme"
      animate="ouvert"
      exit="ferme"
      variants={{ ferme: { opacity: 0 }, ouvert: { opacity: 1 } }}
      transition={{ duration: DUREE_RAPIDE, ease: "easeOut" }}
    >
      <m.div
        ref={refPanneau}
        className={classePanneau}
        variants={{
          ferme: FERME[variante],
          ouvert: { opacity: 1, scale: 1, x: 0, y: 0 },
        }}
        transition={{
          duration: variante === "droite" ? DUREE_LENTE : DUREE_BASE,
          ease: COURBE_DOUCE,
        }}
      >
        {children}
      </m.div>
    </m.div>
  );
}
