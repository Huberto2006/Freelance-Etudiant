"use client";

import { EnteteCatalogue } from "@/features/catalogue/components/EnteteCatalogue";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { BriefcaseBusiness } from "lucide-react";

import { api, ApiError } from "@/lib/api";
import type { Mission } from "@/types/missions";

import {
  PanneauFiltres,
  type Filtres,
} from "@/features/catalogue/components/PanneauFiltres";
import {
  SousMenuCatalogue,
  type OngletCatalogue,
} from "@/features/catalogue/components/SousMenuCatalogue";
import { CarteMission } from "@/features/missions/components/CarteMission";
import {
  NoticeCard,
  EtatVide,
} from "@/components/ui/Notice";
import { Button } from "@/components/ui/Button";
import { SqueletteCatalogue } from "@/features/catalogue/components/SqueletteCatalogue";
import { useAuth } from "@/lib/auth-context";

export default function MissionsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-5 pb-7 pt-8 sm:pt-11">
          <SqueletteCatalogue nombre={6} />
        </div>
      }
    >
      <MissionsContent />
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

function MissionsContent() {
  const t = useTranslations("missions");
  const { utilisateur } = useAuth();
  const searchParams = useSearchParams();
  const cleParams = searchParams.toString();

  const [missions, setMissions] = useState<Mission[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const [onglet, setOnglet] = useState<OngletCatalogue>(() =>
    ongletDepuisUrl(searchParams),
  );
  const [filtresAvances, setFiltresAvances] = useState<Filtres>(() =>
    filtresDepuisUrl(searchParams),
  );

  const estEtudiant = utilisateur?.role === "etudiant";

  const rechercher = useCallback(
    async (ongletCourant: OngletCatalogue, filtres: Filtres) => {
      setChargement(true);
      setErreur(null);

      /*
       * « Recommandé » pour un étudiant connecté : réutilise le système de
       * matching déjà utilisé sur le tableau de bord (score de
       * compatibilité compétences / disponibilité / tarif). Sans profil
       * étudiant complet (404) ou pour un visiteur/client, on retombe sur
       * les missions ouvertes les plus récentes plutôt que de bloquer la
       * page.
       */
      if (
        ongletCourant.type === "mode" &&
        ongletCourant.valeur === "recommande" &&
        estEtudiant
      ) {
        try {
          const recommandations = await api.get<
            { mission: Mission; scoreCompatibilite: number }[]
          >("/matching/missions-recommandees");

          const ouvertes = recommandations
            .map((r) => r.mission)
            .filter((m) => m.statut === "ouverte");

          setMissions(appliquerFiltresAvances(ouvertes, filtres));
          setChargement(false);
          return;
        } catch (err) {
          console.error(
            "Recommandations indisponibles, repli sur les missions récentes :",
            err,
          );
          // On continue ci-dessous avec le repli « plus récentes ».
        }
      }

      const params = new URLSearchParams();

      if (filtres.motsCles) params.set("motsCles", filtres.motsCles);
      if (filtres.competence) params.set("competence", filtres.competence);
      if (filtres.budgetMin) params.set("budgetMin", filtres.budgetMin);
      if (filtres.budgetMax) params.set("budgetMax", filtres.budgetMax);
      if (ongletCourant.type === "categorie") {
        params.set("categorie", ongletCourant.valeur);
      }

      try {
        const data = (await api.get(`/missions?${params.toString()}`, {
          auth: false,
        })) as Mission[];

        let resultat = data;

        if (ongletCourant.type === "mode" && ongletCourant.valeur === "meilleurs") {
          // Pas de note sur les missions elles-mêmes : les mieux
          // rémunérées en premier sert de proxy raisonnable pour
          // « meilleures missions ».
          resultat = [...data].sort(
            (a, b) => Number(b.budget) - Number(a.budget),
          );
        } else if (
          ongletCourant.type === "mode" &&
          ongletCourant.valeur === "recommande"
        ) {
          // Repli (visiteur ou client) : les plus récentes d'abord.
          resultat = [...data].sort(
            (a, b) =>
              new Date(b.dateCreation).getTime() -
              new Date(a.dateCreation).getTime(),
          );
        }

        setMissions(resultat);
      } catch (err) {
        console.error("Erreur lors du chargement des missions :", err);
        setErreur(
          err instanceof ApiError
            ? err.message
            : t("list.loadError"),
        );
        setMissions([]);
      } finally {
        setChargement(false);
      }
    },
    [estEtudiant, t],
  );

  /*
   * Les filtres/onglet proviennent de l'URL : recherche du hero, cartes de
   * categories, ou lien direct (/missions?categorie=...). Le chargement est
   * differe d'un tick pour eviter un setState synchrone dans l'effet (meme
   * convention que le tableau de bord).
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
            : t("list.count", { count: missions.length })
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
            labelBudget={t("list.filterBudget")}
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
          ) : missions.length === 0 ? (
            <EtatVide
              icon={BriefcaseBusiness}
              titre={t("list.emptyTitle")}
              action={
                <Button variant="secondary" size="sm" href="/missions">
                  {t("list.seeAll")}
                </Button>
              }
            >
              {t("list.emptyHint")}
            </EtatVide>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {missions.map((mission) => (
                <CarteMission key={mission.id} mission={mission} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Applique les filtres avancés (mots-clés / compétence / budget) côté
 * client, pour la liste déjà personnalisée renvoyée par le matching
 * (`/matching/missions-recommandees`), qui ne les accepte pas en paramètre.
 */
function appliquerFiltresAvances(
  missions: Mission[],
  filtres: Filtres,
): Mission[] {
  const motsCles = filtres.motsCles?.trim().toLowerCase();
  const competence = filtres.competence?.trim().toLowerCase();
  const budgetMin = filtres.budgetMin ? Number(filtres.budgetMin) : undefined;
  const budgetMax = filtres.budgetMax ? Number(filtres.budgetMax) : undefined;

  return missions.filter((mission) => {
    if (
      motsCles &&
      !mission.titre.toLowerCase().includes(motsCles) &&
      !mission.description.toLowerCase().includes(motsCles)
    ) {
      return false;
    }

    if (
      competence &&
      !mission.competencesRequises.some((c) =>
        c.toLowerCase().includes(competence),
      )
    ) {
      return false;
    }

    const budget = Number(mission.budget);
    if (budgetMin !== undefined && budget < budgetMin) return false;
    if (budgetMax !== undefined && budget > budgetMax) return false;

    return true;
  });
}