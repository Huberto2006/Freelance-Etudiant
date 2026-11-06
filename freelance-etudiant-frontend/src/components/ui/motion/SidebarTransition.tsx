"use client";

import { clsx } from "clsx";
import { useRef, type ReactNode, type Ref } from "react";
import { AnimatePresence, useIsPresent, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";

import { MouvementLocal } from "./MouvementLocal";
import { COURBE_DOUCE, DUREE_BASE, DUREE_LENTE } from "./transitions";

/**
 * Ouverture et fermeture d'un groupe de liens de la Sidebar.
 *
 * Exception assumée à la règle « transform et opacity » : la hauteur est
 * animée car aucune autre propriété ne peut pousser les liens suivants. La
 * Sidebar étant fixe, seule sa propre colonne est recalculée, jamais la page.
 */
export function SectionSidebar({
  ouvert,
  className,
  children,
}: {
  ouvert: boolean;
  className?: string;
  children: ReactNode;
}) {
  const reduit = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  return (
    <MouvementLocal>
      <AnimatePresence>
        {ouvert && (
          <m.div
            ref={ref}
            className={clsx("overflow-hidden", className)}
            variants={{
              ferme: { height: 0, opacity: 0 },
              ouvert: { height: "auto", opacity: 1 },
            }}
            initial="ferme"
            animate="ouvert"
            exit="ferme"
            transition={{
              duration: reduit ? 0 : DUREE_BASE,
              ease: COURBE_DOUCE,
            }}
            // Le masquage ne sert que pendant le mouvement : une fois ouvert,
            // il couperait le contour de focus clavier des liens.
            onAnimationStart={() => {
              if (ref.current) ref.current.style.overflow = "";
            }}
            onAnimationComplete={(definition) => {
              if (ref.current && definition === "ouvert") {
                ref.current.style.overflow = "visible";
              }
            }}
          >
            {children}
          </m.div>
        )}
      </AnimatePresence>
    </MouvementLocal>
  );
}

/** Tiroir mobile : voile en fondu et panneau qui glisse depuis la gauche. */
export function TiroirSidebar({
  ouvert,
  libelle,
  libelleFermer,
  surFermer,
  refTiroir,
  classeTiroir,
  children,
}: {
  ouvert: boolean;
  libelle: string;
  libelleFermer: string;
  surFermer: () => void;
  refTiroir?: Ref<HTMLDivElement>;
  classeTiroir?: string;
  children: ReactNode;
}) {
  return (
    <MouvementLocal>
      <AnimatePresence>
        {ouvert && (
          <ContenuTiroir
            libelle={libelle}
            libelleFermer={libelleFermer}
            surFermer={surFermer}
            refTiroir={refTiroir}
            classeTiroir={classeTiroir}
          >
            {children}
          </ContenuTiroir>
        )}
      </AnimatePresence>
    </MouvementLocal>
  );
}

function ContenuTiroir({
  libelle,
  libelleFermer,
  surFermer,
  refTiroir,
  classeTiroir,
  children,
}: {
  libelle: string;
  libelleFermer: string;
  surFermer: () => void;
  refTiroir?: Ref<HTMLDivElement>;
  classeTiroir?: string;
  children: ReactNode;
}) {
  const present = useIsPresent();

  return (
    <div
      className="fixed inset-0 z-[70] lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label={libelle}
      inert={!present}
    >
      <m.button
        type="button"
        aria-label={libelleFermer}
        onClick={surFermer}
        tabIndex={-1}
        className="absolute inset-0 bg-ink/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: DUREE_BASE, ease: "easeOut" }}
      />
      <m.div
        ref={refTiroir}
        className={classeTiroir}
        initial={{ x: "-100%" }}
        animate={{ x: 0 }}
        exit={{ x: "-100%" }}
        transition={{ duration: DUREE_LENTE, ease: COURBE_DOUCE }}
      >
        {children}
      </m.div>
    </div>
  );
}
