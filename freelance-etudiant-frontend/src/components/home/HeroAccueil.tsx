"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, CalendarClock, Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth-context";
import { useFormats } from "@/i18n/use-formats";
import { useOptionLabels } from "@/i18n/use-option-labels";
import type { Mission } from "@/lib/types";

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
 * recherche (sélecteur Services / Missions intégré) et l'action principale ;
 * à droite un extrait des missions réellement ouvertes, pour montrer dès
 * l'arrivée ce qu'on peut faire sur la plateforme. Le panneau n'existe que
 * s'il y a de vraies missions ouvertes : aucun contenu d'illustration.
 */
export function HeroAccueil({
  suggestions,
  stats,
  missions = [],
}: {
  suggestions: SuggestionCategorie[];
  stats?: StatVive[];
  missions?: Mission[];
}) {
  const t = useTranslations("home.hero");
  const tc = useTranslations("common");
  const router = useRouter();
  const { utilisateur, chargement } = useAuth();
  const { argent, dateCourte } = useFormats();
  const { categorie } = useOptionLabels();

  const [recherche, setRecherche] = useState("");
  const [cible, setCible] = useState<CibleRecherche>("services");

  // Seules les missions réellement ouvertes sont présentées.
  const ouvertes = missions.filter((m) => m.statut === "ouverte").slice(0, 3);
  const aPanneau = ouvertes.length > 0;

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
    <section className="border-b border-ink/10 bg-paper-light">
      <div
        className={
          aPanneau
            ? "mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-5 sm:py-20 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-center lg:gap-14"
            : "mx-auto max-w-6xl px-4 py-14 sm:px-5 sm:py-20"
        }
      >
        <div className={aPanneau ? "" : "max-w-2xl"}>
          <p className="animate-in mb-4 text-xs font-medium uppercase tracking-[0.08em] text-ink-soft">
            {t("eyebrow")}
          </p>

          <h1 className="animate-in delay-1 font-display text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
            {t("titleStart")}{" "}
            <span className="text-ocre-dark">{t("titleAccent")}</span>
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
                  <Button href="/inscription" size="lg">
                    {t("join")}
                  </Button>
                  <Link
                    href="/publications"
                    className="text-sm font-medium text-ink underline-offset-4 hover:underline"
                  >
                    {t("explorePublications")}
                  </Link>
                </>
              )}
            </div>
          )}

          {/* Chiffres réels : une ligne de texte, sans cartes */}
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

        {/* Missions ouvertes : extrait réel du catalogue */}
        {aPanneau && (
          <aside
            aria-label={t("openMissionsTitle")}
            className="animate-in delay-3 rounded-lg border border-ink/10 bg-paper"
          >
            <div className="flex items-center justify-between gap-3 border-b border-ink/10 px-5 py-3.5">
              <h2 className="text-sm font-semibold text-ink">
                {t("openMissionsTitle")}
              </h2>
              <Link
                href="/missions"
                className="group inline-flex items-center gap-1 text-xs font-medium text-bleu-dark transition-colors hover:text-bleu"
              >
                {t("openMissionsAll")}
                <ArrowRight
                  size={13}
                  aria-hidden="true"
                  className="transition-transform duration-150 ease-out-soft group-hover:translate-x-0.5"
                />
              </Link>
            </div>

            <ul className="divide-y divide-ink/10">
              {ouvertes.map((mission) => (
                <li key={mission.id}>
                  <Link
                    href={`/missions/${mission.id}`}
                    className="flex items-start justify-between gap-4 px-5 py-4 transition-colors duration-150 hover:bg-ink/[0.03]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-display font-medium text-ink">
                        {mission.titre}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
                        <span>{categorie(mission.categorie)}</span>
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          <CalendarClock size={12} aria-hidden="true" />
                          {tc("card.before", {
                            date: dateCourte(mission.dateLimite),
                          })}
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-ocre-dark">
                      {argent(mission.budget)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
    </section>
  );
}
