"use client";

import { useMemo } from "react";
import { useLocale } from "next-intl";

import { normaliserLocale } from "./config";
import {
  formatArgent,
  formatDate,
  formatDateCourte,
  formatDateHeure,
  formatHeure,
  formatNombre,
} from "@/lib/format";

/**
 * Formatage lié à la langue courante. Les montants restent TOUJOURS en ariary
 * (Ar) : seule la présentation (séparateurs) dépend de la langue.
 */
export function useFormats() {
  const locale = normaliserLocale(useLocale());
  return useMemo(
    () => ({
      locale,
      nombre: (v: number | string, o?: Intl.NumberFormatOptions) =>
        formatNombre(v, locale, o),
      argent: (v: number | string) => formatArgent(v, locale),
      date: (d: string) => formatDate(d, locale),
      dateCourte: (d: string) => formatDateCourte(d, locale),
      dateHeure: (d: string | Date) => formatDateHeure(d, locale),
      heure: (d: string | Date) => formatHeure(d, locale),
    }),
    [locale],
  );
}
