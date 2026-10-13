"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

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
 * Hero de la page d'accueil. Volontairement sobre : un titre, une seule
 * barre de recherche (le choix Services / Missions est un sélecteur intégré
 * à la barre), des domaines populaires en simples liens texte et au plus
 * deux actions (une principale, un lien secondaire).
 */
export function HeroAccueil({
  suggestions,
  stats,
}: {
  suggestions: SuggestionCategorie[];
  stats?: StatVive[];
}) {
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
    <section className="relative isolate overflow-hidden bg-paper-light">
      {/* Image d'ambiance : conserve son ratio, fondue vers le fond de page. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-0 w-full"
        aria-hidden="true"
      >
        <img
          src="/images/hero-kianja.png"
          alt=""
          className="block h-auto w-full max-w-none brightness-110 contrast-105 saturate-125"
        />
      </div>
      <div
        className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-paper-light/40 via-paper-light/80 to-paper-light"
        aria-hidden="true"
      />

      <div className="relative z-20 mx-auto max-w-3xl px-5 py-16 text-center sm:px-10 sm:py-24">
        <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
          Kianja · Marketplace des étudiants freelances
        </p>

        <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Les besoins des clients.{" "}
          <span className="text-ocre-dark">
            Les compétences des étudiants.
          </span>
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-ink-soft">
          Trouvez un profil qualifié, publiez un besoin ou proposez vos
          compétences, dans un cadre clair et sécurisé.
        </p>

        {/* Recherche : une seule barre, sélecteur Services / Missions intégré */}
        <form
          onSubmit={lancerRecherche}
          role="search"
          className="mx-auto mt-9 flex max-w-xl items-stretch overflow-hidden rounded-xl bg-paper-light shadow-sm transition"
        >
          <label className="sr-only" htmlFor="cible-recherche">
            Type de recherche
          </label>
          <select
            id="cible-recherche"
            value={cible}
            onChange={(e) => setCible(e.target.value as CibleRecherche)}
            className="kianja-field-control cursor-pointer bg-transparent py-3 pl-4 pr-2 text-sm font-medium text-ink outline-none"
          >
            <option value="services">Services</option>
            <option value="missions">Missions</option>
          </select>

          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder={
              cible === "services"
                ? "Design, site web, rédaction, traduction…"
                : "Refonte de site, application mobile…"
            }
            aria-label={
              cible === "services"
                ? "Rechercher un service étudiant"
                : "Rechercher une mission de client"
            }
            className="kianja-field-control min-w-0 flex-1 bg-transparent px-3 text-sm text-ink outline-none placeholder:text-ink-soft/60"
          />

          <button
            type="submit"
            aria-label="Lancer la recherche"
            className="flex w-12 shrink-0 cursor-pointer items-center justify-center bg-ink text-paper-light transition-colors hover:bg-ink-soft"
          >
            <Search size={17} aria-hidden="true" />
          </button>
        </form>

        {/* Domaines populaires : liens texte discrets */}
        {suggestions.length > 0 && (
          <p className="mt-4 text-xs text-ink-soft">
            Populaires :{" "}
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
          <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
            {utilisateur ? (
              <>
                <Button href="/tableau-de-bord" size="lg">
                  Accéder à mon tableau de bord
                </Button>
                {utilisateur.role === "client" && (
                  <Link
                    href="/tableau-de-bord/mes-missions"
                    className="text-sm font-medium text-ink underline-offset-4 hover:underline"
                  >
                    Publier une mission
                  </Link>
                )}
                {utilisateur.role === "etudiant" && (
                  <Link
                    href="/missions"
                    className="text-sm font-medium text-ink underline-offset-4 hover:underline"
                  >
                    Trouver une mission
                  </Link>
                )}
              </>
            ) : (
              <>
                <Button href="/inscription" size="lg">
                  Rejoindre Kianja
                </Button>
                <Link
                  href="/publications"
                  className="text-sm font-medium text-ink underline-offset-4 hover:underline"
                >
                  Explorer les publications →
                </Link>
              </>
            )}
          </div>
        )}

        {/* Chiffres : une ligne de texte, sans cartes */}
        {stats && stats.length > 0 && (
          <p className="mt-10 border-t border-ink/10 pt-6 font-mono text-xs uppercase tracking-wider text-ink-soft">
            {stats.map((stat, index) => (
              <span key={stat.label}>
                {index > 0 && (
                  <span aria-hidden="true" className="mx-3 text-ink/30">
                    |
                  </span>
                )}
                <span className="font-semibold text-ink">{stat.valeur}</span>{" "}
                {stat.label}
              </span>
            ))}
          </p>
        )}
      </div>
    </section>
  );
}
