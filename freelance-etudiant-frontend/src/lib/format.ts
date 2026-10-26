import { DEFAULT_LOCALE, etiquetteIntl, type Locale } from "@/i18n/config";

/*
 * Formatage dépendant de la langue de l'interface.
 *
 * Toutes les fonctions acceptent la langue en dernier argument (français par
 * défaut). Dans un composant React, utiliser le hook `useFormats()`
 * (src/i18n/use-formats.ts) qui les lie à la langue courante.
 *
 * RÈGLE FINANCIÈRE : un montant est toujours affiché en ariary malagasy (Ar).
 * Changer de langue ne convertit JAMAIS une somme dans une autre devise : seuls
 * les séparateurs (milliers, décimales) et la place du nombre changent.
 */

export function formatNombre(
  valeur: number | string,
  locale: Locale = DEFAULT_LOCALE,
  options?: Intl.NumberFormatOptions,
): string {
  const nombre = typeof valeur === "string" ? parseFloat(valeur) : valeur;
  if (Number.isNaN(nombre)) return "—";
  return new Intl.NumberFormat(etiquetteIntl(locale), options).format(nombre);
}

export function formatArgent(
  valeur: number | string,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const nombre = typeof valeur === "string" ? parseFloat(valeur) : valeur;
  if (Number.isNaN(nombre)) return "—";
  return `${new Intl.NumberFormat(etiquetteIntl(locale), {
    maximumFractionDigits: 2,
  }).format(nombre)} Ar`;
}

/**
 * Convertit une date en objet Date. Une date seule ("2026-09-30", colonne
 * SQL `date`) est lue comme un jour CALENDAIRE local : new Date("2026-09-30")
 * la lirait en UTC et l'afficherait la veille sous un fuseau negatif.
 */
export function versDate(date: string): Date {
  const jour = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.slice(0, 10));
  if (jour && (date.length === 10 || date.length > 10 && date[10] === "T" && /T00:00:00(\.0+)?Z?$/.test(date.slice(10)))) {
    return new Date(Number(jour[1]), Number(jour[2]) - 1, Number(jour[3]));
  }
  return new Date(date);
}

/**
 * Vrai si le JOUR de la date limite est strictement passe. La date limite
 * est inclusive : elle reste valable jusqu'a la fin de ce jour (meme regle
 * que le backend).
 */
export function dateLimiteDepassee(dateLimite: string): boolean {
  const limite = versDate(dateLimite);
  const finDuJour = new Date(
    limite.getFullYear(),
    limite.getMonth(),
    limite.getDate() + 1,
  );
  return Date.now() >= finDuJour.getTime();
}

export function formatDate(
  date: string,
  locale: Locale = DEFAULT_LOCALE,
): string {
  try {
    return new Intl.DateTimeFormat(etiquetteIntl(locale), {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(versDate(date));
  } catch {
    return date;
  }
}

export function formatDateCourte(
  date: string,
  locale: Locale = DEFAULT_LOCALE,
): string {
  try {
    return new Intl.DateTimeFormat(etiquetteIntl(locale), {
      day: "numeric",
      month: "short",
    }).format(versDate(date));
  } catch {
    return date;
  }
}

/** Date et heure (fuseau de Madagascar), par exemple pour les messages. */
export function formatDateHeure(
  date: string | Date,
  locale: Locale = DEFAULT_LOCALE,
): string {
  try {
    const d = typeof date === "string" ? versDate(date) : date;
    return new Intl.DateTimeFormat(etiquetteIntl(locale), {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Indian/Antananarivo",
    }).format(d);
  } catch {
    return typeof date === "string" ? date : "";
  }
}

/** Heure seule (HH:mm), fuseau de Madagascar. */
export function formatHeure(
  date: string | Date,
  locale: Locale = DEFAULT_LOCALE,
): string {
  try {
    const d = typeof date === "string" ? versDate(date) : date;
    return new Intl.DateTimeFormat(etiquetteIntl(locale), {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Indian/Antananarivo",
    }).format(d);
  } catch {
    return "";
  }
}
