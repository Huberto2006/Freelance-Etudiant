import { Langue, normaliserLangue } from './langues';

/**
 * Formatage des dates et des montants selon la langue du destinataire
 * (emails principalement).
 *
 * Regles :
 * - fuseau toujours Indian/Antananarivo (Madagascar) ;
 * - montants TOUJOURS en Ariary (« Ar ») : aucune conversion de devise,
 *   seul le separateur de milliers change ;
 * - si la locale d'une langue n'est pas supportee par l'ICU du runtime,
 *   repli sur fr-FR.
 */

export const FUSEAU_MADAGASCAR = 'Indian/Antananarivo';

const LOCALES_DATE: Record<Langue, string> = {
  fr: 'fr-FR',
  mg: 'mg',
  en: 'en-GB',
};

/**
 * Nombres : le malagasy s'ecrit avec l'espace comme separateur de milliers
 * (« 75 000 Ar »), comme le francais. Les donnees numeriques ICU de `mg`
 * sont incompletes (separateurs anglo-saxons), on utilise donc fr-FR.
 */
const LOCALES_NOMBRE: Record<Langue, string> = {
  fr: 'fr-FR',
  mg: 'fr-FR',
  en: 'en-GB',
};

const LOCALE_REPLI = 'fr-FR';

const cacheDate = new Map<Langue, string>();

function localeSupportee(locale: string): boolean {
  try {
    return (
      Intl.DateTimeFormat.supportedLocalesOf([locale]).length > 0 &&
      Intl.NumberFormat.supportedLocalesOf([locale]).length > 0
    );
  } catch {
    return false;
  }
}

/** Locale Intl pour les dates, avec repli fr-FR si l'ICU ne la connait pas. */
export function localeDate(langue?: unknown): string {
  const l = normaliserLangue(langue);
  let locale = cacheDate.get(l);
  if (!locale) {
    const souhaitee = LOCALES_DATE[l];
    locale = localeSupportee(souhaitee) ? souhaitee : LOCALE_REPLI;
    cacheDate.set(l, locale);
  }
  return locale;
}

/** Locale Intl pour les nombres (voir LOCALES_NOMBRE). */
export function localeNombre(langue?: unknown): string {
  const souhaitee = LOCALES_NOMBRE[normaliserLangue(langue)];
  return localeSupportee(souhaitee) ? souhaitee : LOCALE_REPLI;
}

/** « 75 000 Ar » (fr/mg) ou « 75,000 Ar » (en). Jamais de conversion. */
export function formaterMontantAr(montant: number, langue?: unknown): string {
  const valeur = Number(montant);
  const nombre = Number.isFinite(valeur)
    ? new Intl.NumberFormat(localeNombre(langue)).format(valeur)
    : String(montant);
  return `${nombre} Ar`;
}

export type StyleDate = 'date' | 'dateHeure';

/**
 * Formate une date (Date, ISO ou YYYY-MM-DD) dans le fuseau de Madagascar.
 * Une valeur invalide est renvoyee telle quelle (jamais d'exception).
 */
export function formaterDate(
  date: Date | string,
  langue?: unknown,
  style: StyleDate = 'date',
): string {
  const valeur = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(valeur.getTime())) {
    return String(date);
  }
  return new Intl.DateTimeFormat(localeDate(langue), {
    dateStyle: 'long',
    ...(style === 'dateHeure' ? { timeStyle: 'short' as const } : {}),
    timeZone: FUSEAU_MADAGASCAR,
  }).format(valeur);
}

/** Dictionnaire complet par langue : une cle manquante ne compile pas. */
export type Dictionnaire<T> = Record<Langue, T>;

/** Retourne l'entree du dictionnaire pour la langue (repli fr). */
export function choisir<T>(dico: Dictionnaire<T>, langue?: unknown): T {
  return dico[normaliserLangue(langue)];
}
