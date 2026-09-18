"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowUpDown,
  BriefcaseBusiness,
  Layers3,
  Plus,
  RotateCcw,
  Sparkles,
  Wrench,
} from "lucide-react";

import { api, ApiError } from "@/lib/api";
import type { Mission, ServiceOffert } from "@/lib/types";

import {
  PanneauFiltres,
  type Filtres,
} from "@/components/ui/PanneauFiltres";
import {
  SousMenuCatalogue,
  type OngletCatalogue,
} from "@/components/ui/SousMenuCatalogue";
import { CarteMission } from "@/components/ui/CarteMission";
import { CarteService } from "@/components/ui/CarteService";
import { NoticeCard } from "@/components/ui/Notice";
import { BoutonRetour } from "@/components/ui/BoutonRetour";
import { Button } from "@/components/ui/Button";
import { SqueletteCatalogue } from "@/components/ui/SqueletteCatalogue";
import { useAuth } from "@/lib/auth-context";

export default function PublicationsPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-6xl px-4 pb-12 pt-8">
          <SqueletteCatalogue nombre={6} />
        </div>
      }
    >
      <PublicationsContent />
    </Suspense>
  );
}

/**
 * Type union pour l'orchestration du catalogue unifié :
 * les entités Mission et Service restent strictement séparées côté métier.
 */
type PublicationItem =
  | { type: "mission"; id: string; date: string; mission: Mission }
  | { type: "service"; id: string; date: string; service: ServiceOffert };

type TypeFiltrePublication = "toutes" | "missions" | "services";
type OptionTri = "recent" | "meilleurs" | "prix_asc" | "prix_desc";

/** Lit l'onglet de catégorie ou mode spécial depuis l'URL courante. */
function ongletDepuisUrl(searchParams: URLSearchParams): OngletCatalogue {
  const tri = searchParams.get("tri");
  if (tri === "recommande" || tri === "meilleurs") {
    return { type: "mode", valeur: tri };
  }

  const categorie = searchParams.get("categorie");
  if (categorie) return { type: "categorie", valeur: categorie };

  return { type: "mode", valeur: "tous" };
}

/** Lit le type de publication filtré depuis l'URL ("toutes" | "missions" | "services"). */
function typeDepuisUrl(searchParams: URLSearchParams): TypeFiltrePublication {
  const t = searchParams.get("type");
  if (t === "missions" || t === "services") return t;
  return "toutes";
}

/** Lit les filtres de recherche textuelle et montants depuis l'URL. */
function filtresDepuisUrl(searchParams: URLSearchParams): Filtres {
  return {
    motsCles: searchParams.get("q") ?? searchParams.get("motsCles") ?? undefined,
    competence: searchParams.get("competence") ?? undefined,
    budgetMin: searchParams.get("budgetMin") ?? undefined,
    budgetMax: searchParams.get("budgetMax") ?? undefined,
  };
}

function PublicationsContent() {
  const { utilisateur } = useAuth();
  const searchParams = useSearchParams();

  const [missions, setMissions] = useState<Mission[]>([]);
  const [services, setServices] = useState<ServiceOffert[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const [typeActif, setTypeActif] = useState<TypeFiltrePublication>(() =>
    typeDepuisUrl(searchParams),
  );
  const [onglet, setOnglet] = useState<OngletCatalogue>(() =>
    ongletDepuisUrl(searchParams),
  );
  const [filtresAvances, setFiltresAvances] = useState<Filtres>(() =>
    filtresDepuisUrl(searchParams),
  );
  const [triOption, setTriOption] = useState<OptionTri>("recent");

  const [declencheur, setDeclencheur] = useState(0);

  /**
   * Charge simultanément les missions et les services publics.
   * L'appel asynchrone évite tout setState synchrone dans le corps de l'effet.
   */
  useEffect(() => {
    let annule = false;

    async function charger() {
      try {
        const [resMissions, resServices] = await Promise.allSettled([
          api.get<Mission[]>("/missions", { auth: false }),
          api.get<ServiceOffert[]>("/services", { auth: false }),
        ]);

        if (annule) return;

        if (resMissions.status === "fulfilled") {
          setMissions(resMissions.value);
        } else {
          console.error("Impossible de charger les missions :", resMissions.reason);
        }

        if (resServices.status === "fulfilled") {
          setServices(resServices.value);
        } else {
          console.error("Impossible de charger les services :", resServices.reason);
        }

        if (resMissions.status === "rejected" && resServices.status === "rejected") {
          setErreur("Impossible de charger le catalogue de publications pour le moment.");
        }
      } catch (err) {
        if (annule) return;
        console.error("Erreur générale de chargement :", err);
        setErreur(
          err instanceof ApiError
            ? err.message
            : "Une erreur est survenue lors du chargement des publications.",
        );
      } finally {
        if (!annule) setChargement(false);
      }
    }

    void charger();

    return () => {
      annule = true;
    };
  }, [declencheur]);

  /**
   * Filtrage et tri côté client des publications combinées.
   */
  const publicationsFiltrees = useMemo<PublicationItem[]>(() => {
    const items: PublicationItem[] = [];

    // 1. Sélection selon le type de publication
    if (typeActif === "toutes" || typeActif === "missions") {
      for (const m of missions) {
        items.push({
          type: "mission",
          id: m.id,
          date: m.dateCreation,
          mission: m,
        });
      }
    }

    if (typeActif === "toutes" || typeActif === "services") {
      for (const s of services) {
        items.push({
          type: "service",
          id: s.id,
          date: s.dateCreation,
          service: s,
        });
      }
    }

    // 2. Filtre de catégorie (si sélectionnée dans le sous-menu)
    let resultat = items;
    if (onglet.type === "categorie") {
      const cat = onglet.valeur.toLowerCase();
      resultat = resultat.filter((item) => {
        const catItem =
          item.type === "mission"
            ? item.mission.categorie
            : item.service.categorie;
        return catItem?.toLowerCase() === cat;
      });
    }

    // 3. Filtre par mots-clés
    const motsCles = filtresAvances.motsCles?.trim().toLowerCase();
    if (motsCles) {
      resultat = resultat.filter((item) => {
        const titre =
          item.type === "mission" ? item.mission.titre : item.service.titre;
        const description =
          item.type === "mission"
            ? item.mission.description
            : item.service.description;
        return (
          titre.toLowerCase().includes(motsCles) ||
          description.toLowerCase().includes(motsCles)
        );
      });
    }

    // 4. Filtre par compétence
    const compRecherche = filtresAvances.competence?.trim().toLowerCase();
    if (compRecherche) {
      resultat = resultat.filter((item) => {
        const competences =
          item.type === "mission"
            ? item.mission.competencesRequises
            : item.service.competences;
        return competences?.some((c) => c.toLowerCase().includes(compRecherche));
      });
    }

    // 5. Filtre par budget / prix min & max
    const budgetMin = filtresAvances.budgetMin
      ? Number(filtresAvances.budgetMin)
      : undefined;
    const budgetMax = filtresAvances.budgetMax
      ? Number(filtresAvances.budgetMax)
      : undefined;

    if (budgetMin !== undefined || budgetMax !== undefined) {
      resultat = resultat.filter((item) => {
        const valeur =
          item.type === "mission"
            ? Number(item.mission.budget)
            : Number(item.service.prix);
        if (budgetMin !== undefined && valeur < budgetMin) return false;
        if (budgetMax !== undefined && valeur > budgetMax) return false;
        return true;
      });
    }

    // 6. Tri
    return resultat.sort((a, b) => {
      if (triOption === "prix_asc") {
        const prixA =
          a.type === "mission" ? Number(a.mission.budget) : Number(a.service.prix);
        const prixB =
          b.type === "mission" ? Number(b.mission.budget) : Number(b.service.prix);
        return prixA - prixB;
      }

      if (triOption === "prix_desc") {
        const prixA =
          a.type === "mission" ? Number(a.mission.budget) : Number(a.service.prix);
        const prixB =
          b.type === "mission" ? Number(b.mission.budget) : Number(b.service.prix);
        return prixB - prixA;
      }

      if (triOption === "meilleurs" || (onglet.type === "mode" && onglet.valeur === "meilleurs")) {
        const qualiteA =
          a.type === "service"
            ? Number(a.service.etudiant?.noteMoyenne ?? 0) * 1000
            : Number(a.mission.budget);
        const qualiteB =
          b.type === "service"
            ? Number(b.service.etudiant?.noteMoyenne ?? 0) * 1000
            : Number(b.mission.budget);
        return qualiteB - qualiteA;
      }

      // Par défaut : tri chronologique (plus récent au plus ancien)
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [missions, services, typeActif, onglet, filtresAvances, triOption]);

  const nbMissionsTotal = missions.length;
  const nbServicesTotal = services.length;
  const nbTotal = nbMissionsTotal + nbServicesTotal;

  function reinitialiserFiltres() {
    setTypeActif("toutes");
    setOnglet({ type: "mode", valeur: "tous" });
    setFiltresAvances({});
    setTriOption("recent");
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 pb-12 pt-8">
      {/* ---------------------------------------------------- RETOUR */}
      <div className="mb-4">
        <BoutonRetour repli="/" forcer />
      </div>

      {/* ---------------------------------------------------- EN-TÊTE */}
      <header className="mb-6 flex flex-col justify-between gap-4 border-b border-ink/10 pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-bleu-dark">
            <Layers3 size={15} aria-hidden="true" />
            Catalogue général · Kianja Marketplace
          </p>

          <h1 className="font-display text-3xl font-bold sm:text-4xl text-ink">
            Publications
          </h1>

          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-soft">
            Découvrez les besoins des clients et les compétences des étudiants
            sur Kianja. Un espace unifié pour explorer l&apos;ensemble des
            opportunités et des prestations disponibles.
          </p>

          {/* Badges de synthèse en direct */}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center rounded-full border border-ink/15 bg-paper-light px-2.5 py-0.5 font-mono text-[11px] font-medium text-ink">
              {chargement ? "…" : `${nbTotal} publications`}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-bleu/20 bg-bleu/10 px-2.5 py-0.5 font-mono text-[11px] font-medium text-bleu-dark">
              <BriefcaseBusiness size={11} aria-hidden="true" />
              {chargement ? "…" : `${nbMissionsTotal} missions ouvertes`}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-ocre/20 bg-ocre/10 px-2.5 py-0.5 font-mono text-[11px] font-medium text-ocre-dark">
              <Wrench size={11} aria-hidden="true" />
              {chargement ? "…" : `${nbServicesTotal} services proposés`}
            </span>
          </div>
        </div>

        {/* Accès direct contextuel selon le rôle */}
        {utilisateur && (
          <div className="flex shrink-0 items-center gap-2">
            {utilisateur.role === "client" && (
              <Link href="/tableau-de-bord/mes-missions">
                <Button variant="primary" size="sm" className="gap-1.5 text-xs">
                  <Plus size={14} aria-hidden="true" />
                  Publier une mission
                </Button>
              </Link>
            )}
            {utilisateur.role === "etudiant" && (
              <Link href="/tableau-de-bord/mes-services">
                <Button variant="primary" size="sm" className="gap-1.5 text-xs">
                  <Sparkles size={14} aria-hidden="true" />
                  Proposer un service
                </Button>
              </Link>
            )}
          </div>
        )}
      </header>

      {/* --------------------------------- NAVIGATION PRINCIPALE (ONGLETS TYPE) */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {/* Commutateur de Type de publication */}
        <div
          role="tablist"
          aria-label="Filtrer par type de publication"
          className="inline-flex rounded-xl border border-ink/15 bg-paper-light p-1 shadow-xs"
        >
          <button
            type="button"
            role="tab"
            aria-selected={typeActif === "toutes"}
            onClick={() => setTypeActif("toutes")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
              typeActif === "toutes"
                ? "bg-ink text-paper-light shadow-xs"
                : "text-ink-soft hover:bg-ink/5 hover:text-ink"
            }`}
          >
            <Layers3 size={14} aria-hidden="true" />
            <span>Toutes ({chargement ? "…" : nbTotal})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={typeActif === "missions"}
            onClick={() => setTypeActif("missions")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
              typeActif === "missions"
                ? "bg-bleu text-white shadow-xs"
                : "text-ink-soft hover:bg-ink/5 hover:text-ink"
            }`}
          >
            <BriefcaseBusiness size={14} aria-hidden="true" />
            <span>Missions clients ({chargement ? "…" : nbMissionsTotal})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={typeActif === "services"}
            onClick={() => setTypeActif("services")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
              typeActif === "services"
                ? "bg-bleu text-white shadow-xs"
                : "text-ink-soft hover:bg-ink/5 hover:text-ink"
            }`}
          >
            <Wrench size={14} aria-hidden="true" />
            <span>Services étudiants ({chargement ? "…" : nbServicesTotal})</span>
          </button>
        </div>

        {/* Sélecteur de tri */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="select-tri-publications"
            className="flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-ink-soft"
          >
            <ArrowUpDown size={13} aria-hidden="true" />
            <span className="hidden sm:inline">Trier par</span>
          </label>

          <select
            id="select-tri-publications"
            value={triOption}
            onChange={(e) => setTriOption(e.target.value as OptionTri)}
            className="h-9 rounded-lg border border-ink/20 bg-paper-light px-2.5 text-xs text-ink outline-none transition focus:border-bleu focus:ring-1 focus:ring-bleu"
          >
            <option value="recent">Plus récentes d&apos;abord</option>
            <option value="meilleurs">Mieux notés / budget</option>
            <option value="prix_asc">Prix / Budget croissant</option>
            <option value="prix_desc">Prix / Budget décroissant</option>
          </select>
        </div>
      </div>

      {/* --------------------------------- SOUS-MENU (CATÉGORIES & MODES) */}
      <div className="mb-6">
        <SousMenuCatalogue
          actif={onglet}
          onChange={(nouvelOnglet) => setOnglet(nouvelOnglet)}
        />
      </div>

      {/* --------------------------------- FILTRES + GRILLE RÉSULTATS */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Colonne latérale de filtres */}
        <aside className="w-full shrink-0 lg:sticky lg:top-[7.5rem] lg:w-72 lg:max-h-[calc(100vh-7.5rem-1.5rem)] lg:overflow-y-auto">
          <PanneauFiltres
            filtresInitiaux={filtresAvances}
            placeholder="Rechercher par mot-clé…"
            labelBudget="Budget ou Tarif (Ar)"
            onFiltrer={(nouveauxFiltres) => setFiltresAvances(nouveauxFiltres)}
          />

          {/* Raccourci vers les catalogues spécialisés */}
          <div className="mt-4 rounded-xl border border-ink/10 bg-paper-light p-4 text-xs text-ink-soft">
            <p className="font-semibold text-ink">Navigation ciblée</p>
            <p className="mt-1 leading-relaxed">
              Consultez nos catalogues dédiés avec options avancées :
            </p>
            <div className="mt-2.5 flex flex-col gap-1.5">
              <Link
                href="/missions"
                className="inline-flex items-center gap-1.5 text-bleu-dark hover:underline"
              >
                <BriefcaseBusiness size={13} aria-hidden="true" />
                <span>Voir uniquement les missions</span>
              </Link>
              <Link
                href="/services"
                className="inline-flex items-center gap-1.5 text-bleu-dark hover:underline"
              >
                <Wrench size={13} aria-hidden="true" />
                <span>Voir uniquement les services</span>
              </Link>
            </div>
          </div>
        </aside>

        {/* Zone centrale des résultats */}
        <div className="min-w-0 flex-1">
          {chargement ? (
            <SqueletteCatalogue nombre={6} />
          ) : erreur ? (
            <NoticeCard>
              <div className="py-4 text-center">
                <p className="text-sm font-medium text-brique">{erreur}</p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setChargement(true);
                    setErreur(null);
                    setDeclencheur((d) => d + 1);
                  }}
                  className="mt-3"
                >
                  <RotateCcw size={13} className="mr-1.5" />
                  Réessayer
                </Button>
              </div>
            </NoticeCard>
          ) : publicationsFiltrees.length === 0 ? (
            <NoticeCard>
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-ink/5 text-ink-soft"
                  aria-hidden="true"
                >
                  <Layers3 size={22} />
                </span>

                <h3 className="font-display text-base font-semibold text-ink">
                  {typeActif === "missions"
                    ? "Aucune mission ne correspond à vos critères."
                    : typeActif === "services"
                    ? "Aucun service ne correspond à vos critères."
                    : "Aucune publication ne correspond à votre recherche."}
                </h3>

                <p className="max-w-md text-xs leading-relaxed text-ink-soft">
                  Essayez d&apos;élargir vos termes de recherche, de réinitialiser vos
                  filtres ou de changer de catégorie.
                </p>

                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={reinitialiserFiltres}
                    className="gap-1 text-xs"
                  >
                    <RotateCcw size={13} />
                    Réinitialiser les filtres
                  </Button>

                  {typeActif !== "toutes" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTypeActif("toutes")}
                      className="text-xs"
                    >
                      Afficher tout le catalogue
                    </Button>
                  )}
                </div>
              </div>
            </NoticeCard>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between text-xs text-ink-soft">
                <p>
                  <span className="font-semibold text-ink">
                    {publicationsFiltrees.length}
                  </span>{" "}
                  publication{publicationsFiltrees.length > 1 ? "s" : ""} trouvée
                  {publicationsFiltrees.length > 1 ? "s" : ""}
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {publicationsFiltrees.map((item) =>
                  item.type === "mission" ? (
                    <CarteMission
                      key={`m-${item.id}`}
                      mission={item.mission}
                      afficherType={true}
                    />
                  ) : (
                    <CarteService
                      key={`s-${item.id}`}
                      service={item.service}
                      afficherType={true}
                    />
                  ),
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}