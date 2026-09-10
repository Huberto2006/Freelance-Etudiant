"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { api, ApiError } from "@/lib/api";
import type { ServiceOffert } from "@/lib/types";

import {
  PanneauFiltres,
  type Filtres,
} from "@/components/ui/PanneauFiltres";
import {
  SousMenuCatalogue,
  type OngletCatalogue,
} from "@/components/ui/SousMenuCatalogue";
import { CarteService } from "@/components/ui/CarteService";
import { NoticeCard } from "@/components/ui/Notice";
import { BoutonRetour } from "@/components/ui/BoutonRetour";
import { useAuth } from "@/lib/auth-context";

export default function ServicesPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-6xl px-4 py-10">
          <p className="text-sm text-ink-soft">Chargement…</p>
        </div>
      }
    >
      <ServicesContent />
    </Suspense>
  );
}

/** Lit l'onglet actif (mode spécial ou catégorie) depuis l'URL courante. */
function ongletDepuisUrl(searchParams: URLSearchParams): OngletCatalogue {
  const tri = searchParams.get("tri");
  if (tri === "recommande" || tri === "meilleurs") {
    return { type: "mode", valeur: tri };
  }

  const categorie = searchParams.get("categorie");
  if (categorie) return { type: "categorie", valeur: categorie };

  return { type: "mode", valeur: "tous" };
}

/** Lit les filtres avancés (hors catégorie/tri) depuis l'URL courante. */
function filtresDepuisUrl(searchParams: URLSearchParams): Filtres {
  return {
    motsCles: searchParams.get("q") ?? searchParams.get("motsCles") ?? undefined,
    competence: searchParams.get("competence") ?? undefined,
    budgetMin: searchParams.get("budgetMin") ?? undefined,
    budgetMax: searchParams.get("budgetMax") ?? undefined,
  };
}

/** Note moyenne du prestataire, utilisée pour trier « Meilleurs »/« Recommandé ». */
function noteDuService(service: ServiceOffert): number {
  return Number(service.etudiant?.noteMoyenne ?? 0);
}

function ServicesContent() {
  const { utilisateur } = useAuth();
  const searchParams = useSearchParams();
  const cleParams = searchParams.toString();

  const [services, setServices] = useState<ServiceOffert[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const [onglet, setOnglet] = useState<OngletCatalogue>(() =>
    ongletDepuisUrl(searchParams),
  );
  const [filtresAvances, setFiltresAvances] = useState<Filtres>(() =>
    filtresDepuisUrl(searchParams),
  );

  const rechercher = useCallback(
    async (ongletCourant: OngletCatalogue, filtres: Filtres) => {
      setChargement(true);
      setErreur(null);

      const params = new URLSearchParams();

      if (filtres.motsCles) params.set("motsCles", filtres.motsCles);
      if (filtres.competence) params.set("competence", filtres.competence);
      if (filtres.budgetMin) params.set("budgetMin", filtres.budgetMin);
      if (filtres.budgetMax) params.set("budgetMax", filtres.budgetMax);
      if (ongletCourant.type === "categorie") {
        params.set("categorie", ongletCourant.valeur);
      }

      try {
        const data = (await api.get(`/services?${params.toString()}`, {
          auth: false,
        })) as ServiceOffert[];

        let resultat = data;

        if (ongletCourant.type === "mode" && ongletCourant.valeur === "meilleurs") {
          resultat = [...data].sort(
            (a, b) => noteDuService(b) - noteDuService(a),
          );
        } else if (
          ongletCourant.type === "mode" &&
          ongletCourant.valeur === "recommande"
        ) {
          /*
           * Il n'existe pas (encore) d'endpoint de matching pour les
           * services côté backend (contrairement aux missions, voir
           * /matching/missions-recommandees). En attendant, « Recommandé »
           * applique une heuristique côté client : meilleure note du
           * prestataire d'abord, puis les plus récents pour départager.
           */
          resultat = [...data].sort((a, b) => {
            const diffNote = noteDuService(b) - noteDuService(a);
            if (diffNote !== 0) return diffNote;
            return (
              new Date(b.dateCreation).getTime() -
              new Date(a.dateCreation).getTime()
            );
          });
        }

        setServices(resultat);
      } catch (err) {
        console.error("Erreur lors du chargement des services :", err);
        setErreur(
          err instanceof ApiError
            ? err.message
            : "Impossible de charger les services pour le moment.",
        );
        setServices([]);
      } finally {
        setChargement(false);
      }
    },
    [],
  );

  /*
   * Les filtres/onglet proviennent de l'URL : recherche du hero, cartes de
   * categories (/services?categorie=...), ou lien direct. Le chargement
   * est differe d'un tick pour eviter un setState synchrone dans l'effet
   * (meme convention que le tableau de bord).
   */
  useEffect(() => {
    const nouvelOnglet = ongletDepuisUrl(searchParams);
    const nouveauxFiltres = filtresDepuisUrl(searchParams);

    setOnglet(nouvelOnglet);
    setFiltresAvances(nouveauxFiltres);

    const timer = window.setTimeout(() => {
      rechercher(nouvelOnglet, nouveauxFiltres);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rechercher, cleParams]);

  return (
    <div className="container mx-auto max-w-6xl px-4 pb-10 pt-8">
      {/* ---------------------------------------- EN-TETE */}
      <div className="mb-4">
        <BoutonRetour
          repli={utilisateur ? "/tableau-de-bord" : "/"}
          forcer
        />
      </div>
      <div className="mb-6">
        <p className="mb-1 font-mono text-xs uppercase tracking-[0.2em] text-ocre-dark">
          Étals du kianja
        </p>
        <h1 className="font-display text-3xl font-bold">Services</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {chargement
            ? "Chargement des services…"
            : `${services.length} service${services.length > 1 ? "s" : ""} disponible${services.length > 1 ? "s" : ""}`}
        </p>
      </div>

      {/* ---------------------------------------- SOUS-MENU */}
      <div className="mb-6">
        <SousMenuCatalogue
          actif={onglet}
          onChange={(nouvelOnglet) => {
            setOnglet(nouvelOnglet);
            rechercher(nouvelOnglet, filtresAvances);
          }}
        />
      </div>

      {/* ---------------------------------------- FILTRES + RESULTATS */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <aside
          className="w-full shrink-0 lg:sticky lg:top-[7.5rem] lg:w-72 lg:max-h-[calc(100vh-7.5rem-1.5rem)] lg:overflow-y-auto"
        >
          <PanneauFiltres
            filtresInitiaux={filtresAvances}
            placeholder="Design, développement, rédaction…"
            labelBudget="Prix (Ar)"
            onFiltrer={(nouveauxFiltres) => {
              setFiltresAvances(nouveauxFiltres);
              rechercher(onglet, nouveauxFiltres);
            }}
          />
        </aside>

        <div className="min-w-0 flex-1">
          {chargement ? (
            <p className="text-sm text-ink-soft">Chargement…</p>
          ) : erreur ? (
            <NoticeCard>
              <p className="text-sm text-brique">{erreur}</p>
            </NoticeCard>
          ) : services.length === 0 ? (
            <NoticeCard>
              <p className="text-sm text-ink-soft">
                Aucun service ne correspond à ces critères pour le moment.
              </p>
            </NoticeCard>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {services.map((service) => (
                <CarteService key={service.id} service={service} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}