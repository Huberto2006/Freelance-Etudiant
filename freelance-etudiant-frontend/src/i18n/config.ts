/**
 * Configuration centrale de l'internationalisation.
 *
 * Pour ajouter une langue :
 *   1. l'ajouter à LOCALES et à LANGUES (libellé natif + drapeau) ;
 *   2. créer messages/<code>/ en copiant messages/fr/ (mêmes fichiers, mêmes clés) ;
 *   3. lancer `npm run i18n:check` : il liste les clés manquantes ;
 *   4. autoriser le code côté backend (liste LANGUES_SUPPORTEES du module users).
 */

export const LOCALES = ["fr", "mg", "en"] as const;

export type Locale = (typeof LOCALES)[number];

/** Langue par défaut, et langue de repli si la valeur enregistrée est invalide. */
export const DEFAULT_LOCALE: Locale = "fr";

/** Cookie lu côté serveur (SSR) pour choisir la langue du rendu. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** Durée de conservation de la préférence : un an. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isLocale(valeur: unknown): valeur is Locale {
  return (
    typeof valeur === "string" && (LOCALES as readonly string[]).includes(valeur)
  );
}

/** Retourne la langue demandée si elle est valide, sinon le français. */
export function normaliserLocale(valeur: unknown): Locale {
  return isLocale(valeur) ? valeur : DEFAULT_LOCALE;
}

/**
 * Libellés affichés dans le sélecteur. Chaque langue est écrite dans sa propre
 * langue (jamais traduite) pour rester reconnaissable quelle que soit la langue
 * courante de l'interface.
 */
export const LANGUES: Record<
  Locale,
  { nom: string; code: string; drapeau: string }
> = {
  fr: { nom: "Français", code: "FR", drapeau: "🇫🇷" },
  mg: { nom: "Malagasy", code: "MG", drapeau: "🇲🇬" },
  en: { nom: "English", code: "EN", drapeau: "🇬🇧" },
};

/**
 * Étiquette BCP 47 passée à Intl pour une langue de l'interface.
 * Le malagasy n'est pas disponible dans tous les environnements : on bascule
 * alors sur le français pour les nombres et les dates (jamais d'erreur).
 */
export function etiquetteIntl(locale: Locale): string {
  if (locale === "en") return "en-GB";
  if (locale === "mg") {
    try {
      if (
        Intl.NumberFormat.supportedLocalesOf(["mg"]).length > 0 &&
        Intl.DateTimeFormat.supportedLocalesOf(["mg"]).length > 0
      ) {
        return "mg";
      }
    } catch {
      /* repli ci-dessous */
    }
    return "fr-FR";
  }
  return "fr-FR";
}
