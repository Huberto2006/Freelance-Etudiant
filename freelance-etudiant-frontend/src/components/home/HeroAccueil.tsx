"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BriefcaseBusiness, GraduationCap, Search } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useAuth, roleLabel } from "@/lib/auth-context";

export interface SuggestionCategorie {
  valeur: string;
  libelle: string;
}

export interface StatVive {
  label: string;
  valeur: string;
}

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
  const [cibleRecherche, setCibleRecherche] = useState<"services" | "missions">("services");

  function lancerRecherche(e: React.FormEvent) {
    e.preventDefault();

    const motsCles = recherche.trim();

    if (cibleRecherche === "missions") {
      router.push(
        motsCles
          ? `/missions?q=${encodeURIComponent(motsCles)}`
          : "/missions",
      );
    } else {
      router.push(
        motsCles
          ? `/services?q=${encodeURIComponent(motsCles)}`
          : "/services",
      );
    }
  }

  return (
    <section className="relative overflow-hidden">
      {/* Image de fond */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/images/hero-kianja.png')",
        }}
        aria-hidden="true"
      />

      {/* Overlay pour garder une bonne lisibilité */}
      <div
        className="absolute inset-0 bg-paper-light/20 backdrop-blur-[1px]"
        aria-hidden="true"
      />

      {/* Voile légèrement plus dense au centre */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-paper-light/70 via-paper-light/85 to-paper-light/95"
        aria-hidden="true"
      />

      {/* Halo décoratif */}
      <div
        className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-ocre/15 blur-3xl"
        aria-hidden="true"
      />

      <div
        className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-bleu/10 blur-3xl"
        aria-hidden="true"
      />

      {/* Contenu */}
      <div className="relative mx-auto max-w-2xl px-5 py-12 text-center sm:px-10 sm:py-16">
        {/* Badge */}
        <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-ocre-dark/30 bg-ocre/10 px-3.5 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-ocre-dark">
          Kianja · Marketplace des étudiants de l&apos;EMIT
        </p>

        {/* Titre */}
        <h1 className="font-display text-4xl font-semibold leading-tight sm:text-5xl">
          Les besoins des clients.{" "}
          <span className="text-ocre-dark">Les compétences des étudiants.</span>
        </h1>

        {/* Description */}
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-ink-soft">
          La marketplace qui connecte les étudiants de l&apos;EMIT avec les
          clients à la recherche de talents. Trouvez un profil qualifié, publiez un
          besoin ou proposez vos compétences.
        </p>

        {/* Commutateur de recherche (Services ou Missions) */}
        <div className="mx-auto mt-6 inline-flex rounded-full border border-ink/15 bg-paper-light/90 p-1 shadow-xs backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setCibleRecherche("services")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-medium transition-colors ${
              cibleRecherche === "services"
                ? "bg-bleu text-white shadow-xs"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            <GraduationCap size={14} aria-hidden="true" />
            <span>Services étudiants</span>
          </button>
          <button
            type="button"
            onClick={() => setCibleRecherche("missions")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-medium transition-colors ${
              cibleRecherche === "missions"
                ? "bg-bleu text-white shadow-xs"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            <BriefcaseBusiness size={14} aria-hidden="true" />
            <span>Missions clients</span>
          </button>
        </div>

        {/* Recherche */}
        <form
          onSubmit={lancerRecherche}
          role="search"
          className="
            mx-auto
            mt-3
            flex
            max-w-lg
            flex-col
            gap-2
            sm:flex-row
          "
        >
          <div className="relative flex-1">
            <Search
              size={16}
              className="
                pointer-events-none
                absolute
                left-3.5
                top-1/2
                -translate-y-1/2
                text-ink-soft/60
              "
              aria-hidden="true"
            />

            <input
              type="search"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder={
                cibleRecherche === "services"
                  ? "Design, site web, rédaction, traduction…"
                  : "Refonte de site, application mobile, graphisme…"
              }
              aria-label={
                cibleRecherche === "services"
                  ? "Rechercher un service étudiant"
                  : "Rechercher une mission de client"
              }
              className="
                h-10
                w-full
                rounded-lg
                border
                border-ink/20
                bg-paper-light/95
                pl-9
                pr-3
                text-sm
                text-ink
                shadow-sm
                outline-none
                placeholder:text-ink-soft/60
                transition
                focus:border-bleu
                focus:ring-2
                focus:ring-bleu/15
              "
            />
          </div>

          <Button
            type="submit"
            variant="secondary"
            size="sm"
            className="
              flex
              h-10
              shrink-0
              items-center
              justify-center
              gap-1.5
              px-4
              text-sm
            "
          >
            <Search
              size={15}
              className="sm:hidden"
              aria-hidden="true"
            />
            <span>Rechercher</span>
          </Button>
        </form>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-ink-soft">
              Domaines populaires :
            </span>

            {suggestions.map((suggestion) => (
              <Link
                key={suggestion.valeur}
                href={
                  cibleRecherche === "missions"
                    ? `/missions?categorie=${encodeURIComponent(suggestion.valeur)}`
                    : `/services?categorie=${encodeURIComponent(suggestion.valeur)}`
                }
                className="
                  rounded-full
                  border
                  border-ink/15
                  bg-paper-light/80
                  px-2.5
                  py-1
                  text-xs
                  text-ink-soft
                  backdrop-blur-sm
                  transition-colors
                  hover:border-bleu/40
                  hover:bg-bleu/10
                  hover:text-bleu-dark
                "
              >
                {suggestion.libelle}
              </Link>
            ))}
          </div>
        )}

        {/* Appels à l'action : les deux parcours, traités à égalité */}
        {!chargement && (
          <div className="mt-8">
            {utilisateur ? (
              <div className="rounded-xl border border-ink/10 bg-paper-light/80 p-4 shadow-xs backdrop-blur-md">
                <p className="text-xs text-ink-soft">
                  Connecté en tant que{" "}
                  <span className="font-semibold text-ink">{utilisateur.nom}</span>{" "}
                  ({roleLabel(utilisateur.role)})
                </p>

                <div className="mt-3 flex flex-wrap justify-center gap-2.5">
                  <Button
                    variant="primary"
                    size="sm"
                    className="h-9 px-4 text-xs"
                    onClick={() => router.push("/tableau-de-bord")}
                  >
                    Accéder à mon tableau de bord
                  </Button>

                  {utilisateur.role === "client" ? (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-9 px-3 text-xs"
                        onClick={() => router.push("/tableau-de-bord/mes-missions")}
                      >
                        Publier une mission
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-3 text-xs"
                        onClick={() => router.push("/services")}
                      >
                        Trouver un étudiant
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-9 px-3 text-xs"
                        onClick={() => router.push("/missions")}
                      >
                        Trouver une mission
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-3 text-xs"
                        onClick={() => router.push("/tableau-de-bord/mes-services")}
                      >
                        Gérer mes services
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="mx-auto grid w-full max-w-xl grid-cols-1 gap-4 text-left sm:grid-cols-2">
                {/* CÔTÉ CLIENT */}
                <div className="flex flex-col justify-between rounded-xl border border-ink/10 bg-paper-light/85 p-5 shadow-xs backdrop-blur-sm transition hover:border-bleu/30 hover:shadow-md">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-bleu/10 text-bleu-dark">
                        <BriefcaseBusiness size={15} aria-hidden="true" />
                      </span>
                      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-bleu-dark">
                        Côté client
                      </span>
                    </div>

                    <h3 className="mt-2.5 font-display text-base font-semibold text-ink">
                      Vous avez un besoin ?
                    </h3>

                    <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                      Trouvez les talents de l&apos;EMIT, publiez vos missions et suivez la réalisation de vos projets.
                    </p>
                  </div>

                  <div className="mt-4 flex flex-col gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      className="h-9 w-full justify-center text-xs"
                      onClick={() => router.push("/services")}
                    >
                      Trouver un étudiant
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-9 w-full justify-center text-xs"
                      onClick={() => router.push("/missions")}
                    >
                      Publier une mission
                    </Button>
                  </div>
                </div>

                {/* CÔTÉ ÉTUDIANT */}
                <div className="flex flex-col justify-between rounded-xl border border-ink/10 bg-paper-light/85 p-5 shadow-xs backdrop-blur-sm transition hover:border-ocre/30 hover:shadow-md">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ocre/10 text-ocre-dark">
                        <GraduationCap size={15} aria-hidden="true" />
                      </span>
                      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-ocre-dark">
                        Côté étudiant
                      </span>
                    </div>

                    <h3 className="mt-2.5 font-display text-base font-semibold text-ink">
                      Vous avez des compétences ?
                    </h3>

                    <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                      Proposez vos services, candidatez aux missions ouvertes et développez votre réputation professionnelle.
                    </p>
                  </div>

                  <div className="mt-4 flex flex-col gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      className="h-9 w-full justify-center text-xs"
                      onClick={() => router.push("/missions")}
                    >
                      Trouver une mission
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-9 w-full justify-center text-xs"
                      onClick={() => router.push("/inscription")}
                    >
                      Proposer mes services
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Statistiques */}
        {stats && stats.length > 0 && (
          <div className="mx-auto mt-9 grid max-w-lg grid-cols-2 gap-3 border-t border-ink/10 pt-6 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="font-display text-xl font-semibold text-ink">
                  {stat.valeur}
                </p>

                <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-soft">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}