/**
 * Utilitaires anti-injection pour les contenus envoyes par email.
 *
 * Les titres de missions, noms d'utilisateurs, categories, etc. sont saisis
 * par les utilisateurs : inseres tels quels dans un email HTML emis depuis le
 * domaine officiel, ils permettraient du phishing (faux liens, faux boutons).
 */

const ECHAPPEMENTS: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '`': '&#96;',
};

/** Echappe une valeur pour l'inserer dans du HTML (contenu ou attribut). */
export function echapperHtml(valeur: unknown): string {
  if (valeur === null || valeur === undefined) return '';
  return String(valeur).replace(/[&<>"'`]/g, (c) => ECHAPPEMENTS[c]);
}

/**
 * Nettoie une valeur destinee a un en-tete (sujet) : supprime retours a la
 * ligne et caracteres de controle (injection d'en-tetes SMTP).
 */
export function nettoyerSujet(valeur: unknown): string {
  return String(valeur ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F\u2028\u2029]+/g, ' ')
    .trim()
    .slice(0, 200);
}

/**
 * Retourne l'URL si elle est http(s), sinon '#'. A utiliser avant
 * echapperHtml pour tout href/src construit a partir d'une donnee.
 */
export function urlHttpSure(url: unknown): string {
  const valeur = String(url ?? '').trim();
  return /^https?:\/\/[^\s]+$/i.test(valeur) ? valeur : '#';
}
