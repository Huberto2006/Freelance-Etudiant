"use client";

import { useLayoutEffect, useRef } from "react";
import { useLocale } from "next-intl";

import { etiquetteIntl, normaliserLocale } from "@/i18n/config";

const DUREE_MS = 900;

/**
 * Nombre entier qui « compte » jusqu'à sa valeur quand il devient visible,
 * puis de l'ancienne à la nouvelle valeur quand celle-ci change. Réservé aux
 * données RÉELLES (jamais de chiffre décoratif).
 *
 * - Le DOM est mis à jour directement (requestAnimationFrame + ref) : aucun
 *   re-rendu React pendant l'animation.
 * - Le rendu serveur et les lecteurs d'écran reçoivent toujours la valeur
 *   finale ; la version animée est masquée aux technologies d'assistance.
 * - Avec prefers-reduced-motion, la valeur finale s'affiche directement.
 */
export function AnimatedCounter({ valeur }: { valeur: number }) {
  const locale = etiquetteIntl(normaliserLocale(useLocale()));
  const ref = useRef<HTMLSpanElement>(null);
  // Dernière valeur affichée : point de départ de l'animation suivante, même
  // si la précédente a été interrompue.
  const affichee = useRef(0);
  const finale = new Intl.NumberFormat(locale).format(valeur);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const format = new Intl.NumberFormat(locale).format;
    const depart = affichee.current;

    if (
      depart === valeur ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      affichee.current = valeur;
      el.textContent = format(valeur);
      return;
    }

    // Avant le premier affichage : évite un flash de la valeur finale suivi
    // d'un retour au point de départ.
    el.textContent = format(depart);
    let cadre = 0;

    const demarrer = () => {
      const debut = performance.now();
      const pas = (maintenant: number) => {
        const t = Math.min(1, (maintenant - debut) / DUREE_MS);
        // easeOutCubic : départ rapide, arrivée douce sur la valeur réelle.
        const progression = 1 - Math.pow(1 - t, 3);
        const courante = Math.round(depart + (valeur - depart) * progression);
        affichee.current = courante;
        el.textContent = format(courante);
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
