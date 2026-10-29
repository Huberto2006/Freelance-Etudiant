"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GraduationCap, Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import { CompteurAnime } from "@/components/ui/CompteurAnime";
import { useAuth } from "@/lib/auth-context";

export interface SuggestionCategorie {
  valeur: string;
  libelle: string;
}

export interface StatVive {
  label: string;
  valeur: number;
}

type CibleRecherche = "services" | "missions";

/**
 * Hero de la page d'accueil, en deux colonnes : à gauche le message, la
 * recherche (sélecteur Services / Missions intégré) et les actions ; à droite
 * l'illustration (ses badges « Étudiants / Missions » sont incrustés dans
 * l'image : aucun badge HTML n'est superposé, pour éviter les doublons).
 * Entrée orchestrée (.scene-*) puis parallaxe légère des formes décoratives.
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
          <p className="scene-in scene-1 mb-5 inline-flex items-center gap-2 rounded-md border border-ink/10 bg-ink/[0.03] px-2.5 py-1 text-xs font-medium text-ink-soft">
            <GraduationCap size={13} aria-hidden="true" className="text-bleu-dark" />
            {t("eyebrow")}
          </p>

          <h1 className="scene-in scene-2 font-display text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
            {t("titleStart")}{" "}
            <span className="text-bleu-dark">{t("titleAccent")}</span>
          </h1>

          <p className="scene-in scene-3 mt-5 max-w-xl text-base leading-relaxed text-ink-soft">
            {t("intro")}
          </p>

          {/* Recherche : une seule barre, sélecteur Services / Missions intégré */}
          <form
            onSubmit={lancerRecherche}
            role="search"
            className="scene-in scene-4 mt-8 flex max-w-xl items-stretch overflow-hidden rounded-lg border border-ink/15 bg-paper-light transition-colors duration-150 focus-within:border-ink/50 hover:border-ink/30"
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
            <p className="scene-in scene-4 mt-4 text-xs text-ink-soft">
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
            <div className="scene-in scene-5 mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
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
                    <CompteurAnime valeur={stat.valeur} />
                  </span>{" "}
                  {stat.label}
                </span>
              ))}
            </p>
          )}
        </div>

        {/* Illustration : photo + formes douces + badges */}
        <div className="relative mx-auto w-full max-w-[19rem] sm:max-w-sm lg:max-w-md">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="parallaxe absolute -right-6 -top-6 h-3/4 w-3/4 rounded-[2.5rem] bg-bleu-soft" />
            <div className="absolute -bottom-6 -left-6 h-1/2 w-1/2 rounded-full bg-ink/[0.05]" />
          </div>

          <div className="scene-media scene-2 relative overflow-hidden rounded-xl border border-ink/10 bg-paper">
            <Image
              src="/images/heros-kianja.webp"
              alt={t("imageAlt")}
              width={1536}
              height={1024}
              priority
              sizes="(min-width: 1024px) 448px, (min-width: 640px) 384px, 304px"
              className="h-auto w-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
