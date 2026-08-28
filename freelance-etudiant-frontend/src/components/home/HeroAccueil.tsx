"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, Sparkles } from "lucide-react";

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

/**
 * Hero de la page d'accueil : phrase de valeur, champ de recherche
 * principal (redirige vers /services avec le mot-cle saisi), suggestions
 * de categories populaires, appels a l'action selon le profil du
 * visiteur, et quelques chiffres de la plateforme.
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

  function lancerRecherche(e: React.FormEvent) {
    e.preventDefault();
    const motsCles = recherche.trim();
    router.push(
      motsCles
        ? `/services?q=${encodeURIComponent(motsCles)}`
        : "/services",
    );
  }

  return (
    <section className="relative overflow-hidden rounded-xl border border-ink/15 bg-paper-light px-5 py-12 sm:px-10 sm:py-16">
      {/* Halos decoratifs discrets, dans la palette existante */}
      <div
        className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-ocre/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-rice/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-2xl text-center">
        {/* Badge */}
        <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-ocre-dark/30 bg-ocre/10 px-3.5 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-ocre-dark">
          <Sparkles size={12} aria-hidden="true" />
          Kianja · Talents de l&apos;EMIT
        </p>

        {/* Phrase de valeur */}
        <h1 className="font-display text-4xl font-semibold leading-tight sm:text-5xl">
          Le talent étudiant,{" "}
          <span className="text-ocre-dark">au service</span> de vos projets
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-ink-soft">
          Publiez une mission ou commandez un service auprès d&apos;étudiants
          qualifiés. Ou proposez vos compétences, gagnez en expérience et
          construisez votre réputation.
        </p>

        {/* Recherche principale */}
        <form
          onSubmit={lancerRecherche}
          role="search"
          className="mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row"
        >
          <div className="relative flex-1">
            <Search
              size={17}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft/60"
              aria-hidden="true"
            />
            <input
              type="search"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Design, site web, rédaction, traduction…"
              aria-label="Rechercher un service étudiant"
              className="w-full rounded-lg border border-ink/30 bg-paper px-4 py-3 pl-11 text-sm text-ink placeholder:text-ink-soft/50 transition-colors focus:border-rice"
            />
          </div>

          <Button type="submit" variant="secondary" size="lg" className="sm:px-8">
            Rechercher
          </Button>
        </form>

        {/* Suggestions de categories */}
        {suggestions.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <span className="font-mono text-[11px] uppercase tracking-wider text-ink-soft/60">
              Populaires :
            </span>
            {suggestions.map((suggestion) => (
              <Link
                key={suggestion.valeur}
                href={`/services?categorie=${encodeURIComponent(suggestion.valeur)}`}
                className="rounded-full border border-ink/20 bg-paper px-3 py-1 text-xs text-ink-soft transition-colors hover:border-ocre hover:bg-ocre/10 hover:text-ocre-dark"
              >
                {suggestion.libelle}
              </Link>
            ))}
          </div>
        )}

        {/* Appels a l'action selon le profil */}
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          {chargement ? null : !utilisateur ? (
            <>
              <Link href="/inscription?role=etudiant">
                <Button size="lg">Proposer mes services</Button>
              </Link>
              <Link href="/missions">
                <Button variant="ghost" size="lg">
                  Publier une mission
                </Button>
              </Link>
            </>
          ) : utilisateur.role === "etudiant" ? (
            <Link href="/missions">
              <Button size="lg">Parcourir les missions ouvertes</Button>
            </Link>
          ) : utilisateur.role === "client" ? (
            <>
              <Link href="/tableau-de-bord/mes-missions">
                <Button size="lg">Publier une mission</Button>
              </Link>
              <Link href="/services">
                <Button variant="ghost" size="lg">
                  Commander un service
                </Button>
              </Link>
            </>
          ) : null}
        </div>

        {/* Chiffres de la plateforme */}
        {stats && stats.length > 0 && (
          <dl className="mx-auto mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-ink/10 pt-6">
            {stats.map((stat) => (
              <div key={stat.label}>
                <dt className="font-mono text-[10px] uppercase tracking-wider text-ink-soft/60 sm:text-[11px]">
                  {stat.label}
                </dt>
                <dd className="mt-1 font-display text-2xl font-semibold text-ocre-dark">
                  {stat.valeur}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}