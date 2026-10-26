"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { CATEGORIES_REPERENTIEL } from "@/lib/categories";
import { useNavLabel } from "@/i18n/use-nav-label";
import { useOptionLabels } from "@/i18n/use-option-labels";

const colonnes: {
  titre: string;
  libelleAria: string;
  liens: { href: string; label: string }[];
}[] = [
  {
    titre: "Explorer",
    libelleAria: "exploreAria",
    liens: [
      { href: "/", label: "Accueil" },
      { href: "/publications", label: "Publications" },
      { href: "/freelances", label: "Freelances" },
      { href: "/a-propos", label: "À propos" },
    ],
  },
  {
    titre: "Centre d'aide",
    libelleAria: "helpAria",
    liens: [
      { href: "/faq", label: "FAQ" },
      { href: "/contact", label: "Contact et assistance" },
    ],
  },
  {
    titre: "accountTitle",
    libelleAria: "accountAria",
    liens: [
      { href: "/connexion", label: "Connexion" },
      { href: "/inscription", label: "Rejoindre Kianja" },
    ],
  },
];

/**
 * Pied de page partagé des pages publiques : marque, liens d'exploration,
 * catégories populaires, centre d'aide et accès au compte, avec une barre
 * de mention en bas. Aucune page légale (confidentialité, conditions
 * d'utilisation) n'existe encore : aucun lien n'y est donc affiché.
 */
export function Footer() {
  const t = useTranslations("footer");
  const tn = useNavLabel().label;
  const libelleCategorie = useOptionLabels().categorie;
  const titreColonne = (titre: string) =>
    titre === "accountTitle" ? t("account") : tn(titre);
  const annee = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-ink/15 bg-paper-light/60">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
        {/* ------------------------------- MARQUE */}
        <div className="sm:col-span-2 lg:col-span-1">
          <Link
            href="/"
            aria-label={t("homeAria")}
            className="inline-flex items-center gap-2.5"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/logo-kianja.png"
              alt=""
              aria-hidden="true"
              className="h-10 w-10 rounded-xl border border-ink/10 bg-paper-light p-1 object-contain shadow-sm"
            />
            <span className="font-display text-lg font-semibold">
              Kianja
            </span>
          </Link>

          <p className="mt-1 text-[0.65rem] uppercase tracking-wider text-ink-soft/70">
            {t("signature")}
          </p>

          <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-soft">
            {t("tagline")}
          </p>
        </div>

        {/* ------------------------------- EXPLORER */}
        <nav aria-label={t(colonnes[0].libelleAria as "exploreAria")}>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-ocre-dark">
            {titreColonne(colonnes[0].titre)}
          </p>

          <ul className="mt-4 space-y-2.5 text-sm">
            {colonnes[0].liens.map((lien) => (
              <li key={lien.href}>
                <Link
                  href={lien.href}
                  className="text-ink-soft transition-colors hover:text-ocre-dark"
                >
                  {tn(lien.label)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* ------------------------------- CATEGORIES */}
        <nav aria-label={t("categoriesAria")}>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-ocre-dark">
            {t("categories")}
          </p>

          <ul className="mt-4 space-y-2.5 text-sm">
            {CATEGORIES_REPERENTIEL.slice(0, 5).map((categorie) => (
              <li key={categorie.valeur}>
                <Link
                  href={`/services?categorie=${encodeURIComponent(categorie.valeur)}`}
                  className="text-ink-soft transition-colors hover:text-ocre-dark"
                >
                  {libelleCategorie(categorie.valeur)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* ------------------------------- AIDE + COMPTE */}
        {colonnes.slice(1).map((colonne) => (
          <nav key={colonne.titre} aria-label={t(colonne.libelleAria as "helpAria")}>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-ocre-dark">
              {titreColonne(colonne.titre)}
            </p>

            <ul className="mt-4 space-y-2.5 text-sm">
              {colonne.liens.map((lien) => (
                <li key={lien.href}>
                  <Link
                    href={lien.href}
                    className="text-ink-soft transition-colors hover:text-ocre-dark"
                  >
                    {tn(lien.label)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      {/* ------------------------------- MENTIONS */}
      <div className="border-t border-ink/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-5 py-5 text-xs text-ink-soft/70 sm:flex-row">
          <p>{t("copyright", { annee })}</p>
          <p className="font-mono">
            {t("project")}
          </p>
        </div>
      </div>
    </footer>
  );
}
