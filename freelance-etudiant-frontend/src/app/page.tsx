"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { api } from "@/lib/api";
import { libelleCategorie } from "@/lib/categories";
import type { EtudiantProfile, Mission, ServiceOffert } from "@/lib/types";

import { HeroAccueil, type StatVive } from "@/components/home/HeroAccueil";
import {
  SectionCategories,
  type CategorieAccueil,
} from "@/components/home/SectionCategories";
import { SectionServices } from "@/components/home/SectionServices";
import { SectionMissions } from "@/components/home/SectionMissions";
import { SectionAvantages } from "@/components/home/SectionAvantages";

/**
 * Page d'accueil publique de Kianja : hero avec recherche, categories de
 * services, services populaires, missions recentes, avantages de la
 * plateforme et appel a l'action final. Les donnees proviennent des
 * endpoints publics (aucune authentification requise).
 */
export default function PageAccueil() {
  const [services, setServices] = useState<ServiceOffert[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [nombreEtudiants, setNombreEtudiants] = useState<number | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    let annule = false;

    async function charger() {
      const [resServices, resMissions, resEtudiants] = await Promise.allSettled([
        api.get<ServiceOffert[]>("/services", { auth: false }),
        api.get<Mission[]>("/missions", { auth: false }),
        api.get<EtudiantProfile[]>("/etudiants", { auth: false }),
      ]);

      if (annule) return;

      if (resServices.status === "fulfilled") setServices(resServices.value);
      if (resMissions.status === "fulfilled") setMissions(resMissions.value);
      if (resEtudiants.status === "fulfilled") {
        setNombreEtudiants(resEtudiants.value.length);
      }

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
  }, [services]);

  const suggestions = categories.slice(0, 5);

  const stats: StatVive[] | undefined = chargement
    ? undefined
    : [
        { label: "Services proposés", valeur: String(services.length) },
        { label: "Missions ouvertes", valeur: String(missions.length) },
        {
          label: "Étudiants actifs",
          valeur: nombreEtudiants !== null ? String(nombreEtudiants) : "—",
        },
      ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-5 sm:py-12">
      <HeroAccueil suggestions={suggestions} stats={stats} />

      <SectionCategories
        categories={
          categories.length > 0
            ? categories.slice(0, 8)
            : // Repli : referentiel tant qu'aucun service n'est publie
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

      <SectionServices services={services} />

      <SectionMissions missions={missions} />

      <SectionAvantages />

      {/* Note de projet académique */}
      <p className="mt-10 text-center font-mono text-xs text-ink-soft/50">
        Kianja — projet étudiant de mise en relation freelance, développé en
        Licence 3 à l&apos;{" "}
        <Link
          href="https://emit.mg"
          target="_blank"
          rel="noreferrer"
          className="underline decoration-dotted hover:text-ocre-dark"
        >
          EMIT Fianarantsoa
        </Link>
        .
      </p>
    </div>
  );
}