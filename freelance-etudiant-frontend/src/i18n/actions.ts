"use server";

import { cookies } from "next/headers";

import {
  isLocale,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  type Locale,
} from "./config";

/**
 * Enregistre la langue choisie dans le cookie lu par le rendu serveur.
 * Une valeur invalide est ignorée (le cookie existant reste inchangé).
 * La page courante est conservée : seul le cookie change, pas l'URL.
 */
export async function definirLangue(locale: Locale): Promise<void> {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
