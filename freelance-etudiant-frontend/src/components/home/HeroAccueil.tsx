"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Briefcase, GraduationCap, Layers, Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth-context";

export interface SuggestionCategorie {
  valeur: string;
  libelle: string;
}

export interface StatVive {
  label: string;
  valeur: string;
}

type CibleRecherche = "services" | "missions";

/**
 * Hero de la page d'accueil, en deux colonnes : à gauche le message, la
 * recherche (sélecteur Services / Missions intégré) et les actions ; à droite
 * la photo d'un étudiant, avec trois badges HTML (Étudiants, Missions,
 * Services). Les badges sont décoratifs : aucune donnée chiffrée, aucun
 * texte incrusté dans l'image.
 */
export function HeroAccueil({
  suggestions,
  stats,
}: {
  suggestions: SuggestionCategorie[];
  stats?: StatVive[];
}) {
  const t = useTranslations("home.hero");
  const router = useRouter();
  const { utilisateur, chargement } = useAuth();

  const [recherche, setRecherche] = useState("");
  const [cible, setCible] = useState<CibleRecherche>("services");

  function lancerRecherche(e: React.FormEvent) {
    e.preventDefault();
    const motsCles = recherche.trim();
    router.push(
      motsCles
        ? `/${cible}?q=${encodeURIComponent(motsCles)}`
        : `/${cible}`,
    );
  }

  return (
    <section className="overflow-hidden border-b border-ink/10 bg-paper-light">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-5 sm:py-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-14 lg:py-20">
        <div>
          <p className="animate-in mb-5 inline-flex items-center gap-2 rounded-md border border-ink/10 bg-ink/[0.03] px-2.5 py-1 text-xs font-medium text-ink-soft">
            <GraduationCap size={13} aria-hidden="true" className="text-bleu-dark" />
            {t("eyebrow")}
          </p>

          <h1 className="animate-in delay-1 font-display text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
            {t("titleStart")}{" "}
            <span className="text-bleu-dark">{t("titleAccent")}</span>
          </h1>

          <p className="animate-in delay-2 mt-5 max-w-xl text-base leading-relaxed text-ink-soft">
            {t("intro")}
          </p>

          {/* Recherche : une seule barre, sélecteur Services / Missions intégré */}
          <form
            onSubmit={lancerRecherche}
            role="search"
            className="animate-in delay-3 mt-8 flex max-w-xl items-stretch overflow-hidden rounded-lg border border-ink/15 bg-paper-light transition-colors duration-150 focus-within:border-ink/50 hover:border-ink/30"
          >
            <label className="sr-only" htmlFor="cible-recherche">
              {t("searchTypeLabel")}
            </label>
            <select
              id="cible-recherche"
              value={cible}
              onChange={(e) => setCible(e.target.value as CibleRecherche)}
              className="kianja-field-control cursor-pointer border-r border-ink/10 bg-ink/[0.03] py-3 pl-4 pr-2 text-sm font-medium text-ink outline-none focus:outline-none"
            >
              <option value="services">{t("targetServices")}</option>
              <option value="missions">{t("targetMissions")}</option>
            </select>

            <input
              type="search"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder={
                cible === "services"
                  ? t("placeholderServices")
                  : t("placeholderMissions")
              }
              aria-label={
                cible === "services"
                  ? t("ariaSearchServices")
                  : t("ariaSearchMissions")
              }
              className="kianja-field-control min-w-0 flex-1 bg-transparent px-3 text-sm text-ink outline-none focus:outline-none placeholder:text-ink-soft/60"
            />

            <button
              type="submit"
              aria-label={t("searchSubmit")}
              className="flex w-12 shrink-0 cursor-pointer items-center justify-center bg-ink text-paper-light transition-colors duration-150 hover:bg-ink-soft"
            >
              <Search size={17} aria-hidden="true" />
            </button>
          </form>

          {/* Domaines populaires : liens texte discrets */}
          {suggestions.length > 0 && (
            <p className="animate-in delay-3 mt-4 text-xs text-ink-soft">
              {t("popular")}{" "}
              {suggestions.slice(0, 4).map((suggestion, index) => (
                <span key={suggestion.valeur}>
                  {index > 0 && (
                    <span aria-hidden="true" className="mx-1.5 text-ink/30">
                      ·
                    </span>
                  )}
                  <Link
                    href={`/${cible}?categorie=${encodeURIComponent(suggestion.valeur)}`}
                    className="underline-offset-4 transition-colors hover:text-bleu-dark hover:underline"
                  >
                    {suggestion.libelle}
                  </Link>
                </span>
              ))}
            </p>
          )}

          {/* Actions : une principale + un lien secondaire */}
          {/* Zone réservée pendant la résolution de la session : évite que la
              colonne ne grandisse (décalage de mise en page) à l'apparition
              des boutons. */}
          {chargement && <div aria-hidden="true" className="mt-8 h-12" />}
          {!chargement && (
            <div className="animate-in delay-4 mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
              {utilisateur ? (
                <>
                  <Button href="/tableau-de-bord" size="lg">
                    {t("goDashboard")}
                  </Button>
                  {utilisateur.role === "client" && (
                    <Link
                      href="/tableau-de-bord/mes-missions"
                      className="text-sm font-medium text-ink underline-offset-4 hover:underline"
                    >
                      {t("publishMission")}
                    </Link>
                  )}
                  {utilisateur.role === "etudiant" && (
                    <Link
                      href="/missions"
                      className="text-sm font-medium text-ink underline-offset-4 hover:underline"
                    >
                      {t("findMission")}
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <Button href="/services" size="lg">
                    {t("exploreServices")}
                  </Button>
                  <Button href="/missions" size="lg" variant="secondary">
                    {t("discoverMissions")}
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Chiffres réels : une ligne de texte, sans cartes */}
          {!stats && <div aria-hidden="true" className="mt-10 h-[3.75rem]" />}
          {stats && stats.length > 0 && (
            <p className="mt-10 border-t border-ink/10 pt-5 text-sm text-ink-soft">
              {stats.map((stat, index) => (
                <span key={stat.label}>
                  {index > 0 && (
                    <span aria-hidden="true" className="mx-3 text-ink/30">
                      |
                    </span>
                  )}
                  <span className="font-semibold tabular-nums text-ink">
                    {stat.valeur}
                  </span>{" "}
                  {stat.label}
                </span>
              ))}
            </p>
          )}
        </div>

        {/* Illustration : photo + formes douces + badges */}
        <div className="animate-in delay-2 relative mx-auto w-full max-w-[19rem] sm:max-w-sm lg:max-w-md">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="absolute -right-6 -top-6 h-3/4 w-3/4 rounded-[2.5rem] bg-bleu-soft" />
            <div className="absolute -bottom-6 -left-6 h-1/2 w-1/2 rounded-full bg-ink/[0.05]" />
          </div>

          <div className="relative overflow-hidden rounded-xl border border-ink/10 bg-paper">
            <Image
              src="/images/hero-etudiant-kianja.webp"
              alt={t("imageAlt")}
              width={720}
              height={861}
              priority
              sizes="(min-width: 1024px) 448px, (min-width: 640px) 384px, 304px"
              className="h-auto w-full"
            />
          </div>

          <ul className="contents">
            <li className="animate-in delay-4 absolute -left-3 top-10 sm:-left-8">
              <span className="flex items-center gap-2 rounded-lg border border-ink/10 bg-paper-light px-3 py-2 text-xs font-medium text-ink shadow-xs motion-safe:[animation:kianja-float_6s_ease-in-out_infinite]">
                <GraduationCap size={14} aria-hidden="true" className="text-bleu-dark" />
                {t("badgeStudents")}
              </span>
            </li>
            <li className="animate-in delay-4 absolute -right-2 top-1/2 sm:-right-6">
              <span className="flex items-center gap-2 rounded-lg border border-ink/10 bg-paper-light px-3 py-2 text-xs font-medium text-ink shadow-xs motion-safe:[animation:kianja-float_7s_ease-in-out_infinite]">
                <Briefcase size={14} aria-hidden="true" className="text-bleu-dark" />
                {t("badgeMissions")}
              </span>
            </li>
            <li className="animate-in delay-4 absolute -bottom-3 -left-4 hidden sm:block">
              <span className="flex items-center gap-2 rounded-lg border border-ink/10 bg-paper-light px-3 py-2 text-xs font-medium text-ink shadow-xs motion-safe:[animation:kianja-float_8s_ease-in-out_infinite]">
                <Layers size={14} aria-hidden="true" className="text-bleu-dark" />
                {t("badgeServices")}
              </span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
