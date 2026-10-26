import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { DEFAULT_LOCALE, LOCALE_COOKIE, normaliserLocale } from "./config";
import { DOMAINES } from "./domaines";

/**
 * Configuration next-intl par requête (sans préfixe d'URL) : la langue vient
 * du cookie NEXT_LOCALE. Une valeur absente ou invalide donne le français.
 * Les messages de chaque domaine sont chargés puis fusionnés en un seul objet.
 */
export default getRequestConfig(async () => {
  const brut = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = normaliserLocale(brut);

  const parties = await Promise.all(
    DOMAINES.map(async (domaine) => {
      const fichier = await import(`../../messages/${locale}/${domaine}.json`);
      return [domaine, fichier.default] as const;
    }),
  );

  return {
    locale,
    messages: Object.fromEntries(parties),
    // Un texte manquant ne doit jamais casser la page : voir `i18n:check`.
    onError: () => undefined,
    getMessageFallback: ({ namespace, key }) =>
      namespace ? `${namespace}.${key}` : key,
    timeZone: "Indian/Antananarivo",
  };
});

export { DEFAULT_LOCALE };
