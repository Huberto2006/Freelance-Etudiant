"use client";

import { EnteteCatalogue } from "@/features/catalogue/components/EnteteCatalogue";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Wrench } from "lucide-react";

import { api, ApiError } from "@/lib/api";
import type { ServiceOffert } from "@/types/services";

import {
  PanneauFiltres,
  type Filtres,
} from "@/features/catalogue/components/PanneauFiltres";
import {
  SousMenuCatalogue,
  type OngletCatalogue,
} from "@/features/catalogue/components/SousMenuCatalogue";
import { CarteService } from "@/features/services/components/CarteService";
import {
  NoticeCard,
  EtatVide,
} from "@/components/ui/Notice";
import { Button } from "@/components/ui/Button";
import { SqueletteCatalogue } from "@/features/catalogue/components/SqueletteCatalogue";

export default function ServicesPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-5 pb-7 pt-8 sm:pt-11">
          <SqueletteCatalogue nombre={6} />
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
  const t = useTranslations("services");
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
            : t("list.loadError"),
        );
        setServices([]);
      } finally {
        setChargement(false);
      }
    },
    [t],
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

    const timer = window.setTimeout(() => {
      // setState différé d'un tick (react-hooks/set-state-in-effect) :
      // la synchronisation URL -> etat n'appartient pas au corps synchrone
      // de l'effet.
      setOnglet(nouvelOnglet);
      setFiltresAvances(nouveauxFiltres);
      rechercher(nouvelOnglet, nouveauxFiltres);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rechercher, cleParams]);

  return (
    <div className="container mx-auto max-w-7xl px-4 pb-8 pt-7">
      {/* ---------------------------------------- EN-TETE */}
      <EnteteCatalogue
        surtitre={t("list.eyebrow")}
        titre={t("list.title")}
        description={t("list.intro")}
        indicateurs={
          chargement
            ? t("list.loading")
            : t("list.count", { count: services.length })
        }
      />

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
            placeholder={t("list.filterPlaceholder")}
            labelBudget={t("list.filterPrice")}
            onFiltrer={(nouveauxFiltres) => {
              setFiltresAvances(nouveauxFiltres);
              rechercher(onglet, nouveauxFiltres);
            }}
          />
        </aside>

        <div className="min-w-0 flex-1">
          {chargement ? (
            <SqueletteCatalogue nombre={6} />
          ) : erreur ? (
            <NoticeCard>
              <p className="text-sm text-brique">{erreur}</p>
            </NoticeCard>
          ) : services.length === 0 ? (
            <EtatVide
              icon={Wrench}
              titre={t("list.emptyTitle")}
              action={
                <Button variant="secondary" size="sm" href="/services">
                  {t("list.seeAll")}
                </Button>
              }
            >
              {t("list.emptyHint")}
            </EtatVide>
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