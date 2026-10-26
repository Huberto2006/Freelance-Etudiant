/**
 * Langues prises en charge par la plateforme (interface, emails, notifications,
 * messages d'erreur). Le francais est la langue par defaut et de repli.
 *
 * Pour ajouter une langue : l'ajouter ici, ajouter son catalogue dans
 * common/i18n/ puis cote frontend dans src/i18n/config.ts (LOCALES).
 */
export const LANGUES_SUPPORTEES = ['fr', 'mg', 'en'] as const;

export type Langue = (typeof LANGUES_SUPPORTEES)[number];

export const LANGUE_PAR_DEFAUT: Langue = 'fr';

export function estLangueSupportee(valeur: unknown): valeur is Langue {
  return (
    typeof valeur === 'string' &&
    (LANGUES_SUPPORTEES as readonly string[]).includes(valeur)
  );
}

/** Retourne la langue si elle est valide, sinon le francais. */
export function normaliserLangue(valeur: unknown): Langue {
  return estLangueSupportee(valeur) ? valeur : LANGUE_PAR_DEFAUT;
}

/**
 * Extrait la langue d'un en-tete Accept-Language (ex. "mg,fr;q=0.8").
 * Seules les langues supportees sont retenues, dans l'ordre de preference ;
 * les sous-etiquettes regionales sont ignorees ("en-GB" -> "en").
 */
export function langueDepuisAcceptLanguage(entete: unknown): Langue {
  if (typeof entete !== 'string') return LANGUE_PAR_DEFAUT;
  const candidates = entete
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params.find((p) => p.trim().startsWith('q='));
      const poids = q ? parseFloat(q.trim().slice(2)) : 1;
      return {
        langue: tag.trim().toLowerCase().split('-')[0],
        poids: Number.isNaN(poids) ? 0 : poids,
      };
    })
    .sort((a, b) => b.poids - a.poids);
  for (const c of candidates) {
    if (estLangueSupportee(c.langue)) return c.langue;
  }
  return LANGUE_PAR_DEFAUT;
}
