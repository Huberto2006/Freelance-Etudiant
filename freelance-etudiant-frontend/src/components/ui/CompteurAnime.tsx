"use client";

import { useLayoutEffect, useRef } from "react";
import { useLocale } from "next-intl";

import { etiquetteIntl, normaliserLocale } from "@/i18n/config";

const DUREE_MS = 900;

/**
 * Nombre entier qui « compte » de 0 jusqu'à sa valeur la première fois
 * qu'il devient visible. Réservé aux données RÉELLES (jamais de chiffre
 * décoratif).
 *
 * - Le DOM est mis à jour directement (requestAnimationFrame + ref) : aucun
 *   re-rendu React pendant l'animation.
 * - Le rendu serveur et les lecteurs d'écran reçoivent toujours la valeur
 *   finale ; la version animée est masquée aux technologies d'assistance.
 * - Avec prefers-reduced-motion, la valeur finale s'affiche directement.
 */
export function CompteurAnime({ valeur }: { valeur: number }) {
  const locale = etiquetteIntl(normaliserLocale(useLocale()));
  const ref = useRef<HTMLSpanElement>(null);
  const formater = new Intl.NumberFormat(locale).format;
  const finale = formater(valeur);

  // Avant le premier affichage (layout effect) : on pose 0 pour éviter un
  // flash de la valeur finale suivi d'un retour à zéro.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || valeur === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const format = new Intl.NumberFormat(locale).format;
    el.textContent = format(0);
    let cadre = 0;

    const demarrer = () => {
      const debut = performance.now();
      const pas = (maintenant: number) => {
        const t = Math.min(1, (maintenant - debut) / DUREE_MS);
        // easeOutCubic : départ rapide, arrivée douce sur la valeur réelle.
        const progression = 1 - Math.pow(1 - t, 3);
        el.textContent = format(Math.round(valeur * progression));
        if (t < 1) cadre = requestAnimationFrame(pas);
      };
      cadre = requestAnimationFrame(pas);
    };

    const observateur = new IntersectionObserver(
      (entrees) => {
        if (entrees.some((e) => e.isIntersecting)) {
          observateur.disconnect();
          demarrer();
        }
      },
      { threshold: 0.4 },
    );
    observateur.observe(el);

    return () => {
      observateur.disconnect();
      cancelAnimationFrame(cadre);
      el.textContent = format(valeur);
    };
  }, [valeur, locale]);

  return (
    <>
      <span ref={ref} aria-hidden="true" className="tabular-nums">
        {finale}
      </span>
      <span className="sr-only">{finale}</span>
    </>
  );
}
