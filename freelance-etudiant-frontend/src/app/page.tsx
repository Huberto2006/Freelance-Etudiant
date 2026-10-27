"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { api } from "@/lib/api";
import { useOptionLabels } from "@/i18n/use-option-labels";
import type { Mission, ServiceOffert } from "@/lib/types";

import { HeroAccueil, type StatVive } from "@/components/home/HeroAccueil";
import {
  SectionCategories,
  type CategorieAccueil,
} from "@/components/home/SectionCategories";
import { SectionServices } from "@/components/home/SectionServices";
import { SectionMissions } from "@/components/home/SectionMissions";
import { SectionAvantages } from "@/components/home/SectionAvantages";
import { SectionAudiences } from "@/components/home/SectionAudiences";
import { SectionFonctionnement } from "@/components/home/SectionFonctionnement";

/**
 * Page d'accueil publique de Kianja : hero avec recherche, categories de
 * services, services populaires, missions recentes, avantages de la
 * plateforme et appel a l'action final (un seul bouton principal par bloc). Les donnees proviennent des
 * endpoints publics (aucune authentification requise).
 */
export default function PageAccueil() {
  const t = useTranslations("home.hero");
  const libelleCategorie = useOptionLabels().categorie;
  const [services, setServices] = useState<ServiceOffert[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    let annule = false;

    async function charger() {
      // Le total des étudiants n'est plus demandé ici : GET /etudiants est
      // réservé aux utilisateurs connectés (RG-VIS-001) — un visiteur
      // recevait un 401 — et n'est de toute façon paginé (il ne renvoie
      // pas le nombre total d'étudiants).
      const [resServices, resMissions] = await Promise.allSettled([
        api.get<ServiceOffert[]>("/services", { auth: false }),
        api.get<Mission[]>("/missions", { auth: false }),
      ]);

      if (annule) return;

      if (resServices.status === "fulfilled") setServices(resServices.value);
      if (resMissions.status === "fulfilled") setMissions(resMissions.value);

      setChargement(false);
    }

    void charger();

    return () => {
      annule = true;
    };
  }, []);

  /**
   * Categories dedupliquees a partir des services reelslement publies,
   * triees par nombre d'offres decroissant.
   */
  const categories = useMemo<CategorieAccueil[]>(() => {
    const compteurs = new Map<string, number>();

    for (const service of services) {
      compteurs.set(
        service.categorie,
        (compteurs.get(service.categorie) ?? 0) + 1,
      );
    }

    return [...compteurs.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([valeur, total]) => ({
        valeur,
        libelle: libelleCategorie(valeur),
        total,
      }));
  }, [services, libelleCategorie]);

  const suggestions = categories.slice(0, 5);

  const stats: StatVive[] | undefined = chargement
    ? undefined
    : [
        { label: t("statServices"), valeur: String(services.length) },
        {
          label: t("statMissions"),
          // « Missions ouvertes » : on ne compte que les missions dont le
          // statut backend est réellement « ouverte ».
          valeur: String(missions.filter((m) => m.statut === "ouverte").length),
        },
      ];

  return (
    <div className="mx-auto">
      {/* 1. Hero : recherche bilatérale, métriques vivantes et accès direct */}
      <HeroAccueil suggestions={suggestions} stats={stats} missions={missions} />

      {/* 2. Audiences : mise en valeur immédiate des deux côtés de la marketplace */}
      <SectionAudiences />

      {/* 3. Besoins des clients : missions ouvertes aux étudiants */}
      <SectionMissions missions={missions} />

      {/* 4. Compétences étudiantes : services prêts à l'emploi */}
      <SectionServices services={services} />

      {/* 5. Catégories : exploration par domaine de compétences / filière */}
      <SectionCategories
        categories={
          categories.length > 0
            ? categories.slice(0, 8)
            : // Repli : référentiel tant qu'aucun service n'est publié
              [
                "Developpement",
                "Design",
                "Redaction",
                "Traduction",
                "Marketing",
                "Video",
                "Data",
                "Administratif",
              ].map((valeur) => ({ valeur, libelle: libelleCategorie(valeur) }))
        }
      />

      {/* 6. Fonctionnement : les 2 parcours pas à pas */}
      <SectionFonctionnement />

      {/* 7. Avantages & double appel à l'action final */}
      <SectionAvantages />
    </div>
  );
}