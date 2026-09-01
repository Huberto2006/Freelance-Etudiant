"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock } from "lucide-react";

import { api, ApiError } from "@/lib/api";
import type { Mission } from "@/lib/types";
import {
  formatArgent,
  formatDateCourte,
} from "@/lib/format";
import { libelleCategorie } from "@/lib/categories";
import { Button } from "@/components/ui/Button";
import { NoticeCard, Tag } from "@/components/ui/Notice";
import { SkeletonMission } from "@/components/ui/Skeleton";
import { ErreurSection } from "./DashboardSection";

interface MissionRecommandee {
  mission: Mission;
  scoreCompatibilite: number;
}

/**
 * « Missions recommandées pour vous » : réutilise le système de matching
 * déjà présent dans le backend (GET /matching/missions-recommandees,
 * score de compatibilité compétences / disponibilité / tarif). Le
 * composant gère son propre chargement, squelettes, erreur (réessai) et
 * état vide : une panne ici n'affecte pas le reste du tableau de bord.
 */
export function RecommendedMissions({
  missionsExcluesIds = [],
}: {
  /** Identifiants de missions déjà ciblées par une candidature. */
  missionsExcluesIds?: string[];
}) {
  const [recommandations, setRecommandations] = useState<
    MissionRecommandee[] | null
  >(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [profilManquant, setProfilManquant] = useState(false);
  const [tentative, setTentative] = useState(0);
  /** Instant du chargement, capturé hors rendu pour rester pur. */
  const [dateChargement, setDateChargement] = useState(0);

  useEffect(() => {
    let actif = true;

    (async () => {
      setChargement(true);
      setErreur(null);
      setProfilManquant(false);

      try {
        const data = await api.get<MissionRecommandee[]>(
          "/matching/missions-recommandees",
        );
        if (!actif) return;
        setDateChargement(Date.now());
        setRecommandations(data);
      } catch (error) {
        console.error(
          "Erreur lors du chargement des recommandations :",
          error,
        );
        if (!actif) return;

        if (error instanceof ApiError && error.status === 404) {
          setProfilManquant(true);
          setErreur(
            "Complétez votre profil étudiant pour recevoir des recommandations personnalisées.",
          );
        } else {
          setErreur("Impossible de charger les recommandations.");
        }
      } finally {
        if (actif) setChargement(false);
      }
    })();

    return () => {
      actif = false;
    };
  }, [tentative]);

  if (chargement) {
    return (
      <div
        role="status"
        aria-label="Chargement des missions recommandées"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <SkeletonMission />
        <SkeletonMission className="hidden sm:flex" />
        <SkeletonMission className="hidden lg:flex" />
      </div>
    );
  }

  if (erreur) {
    return (
      <ErreurSection
        message={erreur}
        onReessayer={
          profilManquant ? undefined : () => setTentative((t) => t + 1)
        }
      />
    );
  }

  return (
    <CorpsRecommandations
      recommandations={recommandations ?? []}
      missionsExcluesIds={missionsExcluesIds}
      maintenant={dateChargement}
    />
  );
}

/**
 * Corps de la section : filtre les missions réellement ouvertes (statut
 * « ouverte », date limite non dépassée, pas déjà ciblée par une
 * candidature) puis affiche les trois meilleures correspondances.
 */
function CorpsRecommandations({
  recommandations,
  missionsExcluesIds,
  maintenant,
}: {
  recommandations: MissionRecommandee[];
  missionsExcluesIds: string[];
  /** Instant capturé au chargement (évite un appel impur au rendu). */
  maintenant: number;
}) {
  const exclues = new Set(missionsExcluesIds);

  const liste = recommandations
    .filter(
      ({ mission }) =>
        mission.statut === "ouverte" &&
        !exclues.has(mission.id) &&
        new Date(mission.dateLimite).getTime() >= maintenant,
    )
    .slice(0, 3);

  if (liste.length === 0) {
    return (
      <NoticeCard className="flex flex-col items-start gap-3">
        <p className="text-sm text-ink-soft">
          Aucune mission recommandée pour le moment. Ajoutez des compétences à
          votre profil pour recevoir des missions adaptées, ou explorez les
          missions ouvertes.
        </p>

        <div className="flex flex-wrap gap-2">
          <Link href="/missions" aria-label="Explorer les missions">
            <Button size="sm">Explorer les missions</Button>
          </Link>

          <Link
            href="/tableau-de-bord/profil"
            aria-label="Compléter mon profil"
          >
            <Button size="sm" variant="ghost">
              Compléter mon profil
            </Button>
          </Link>
        </div>
      </NoticeCard>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {liste.map(({ mission, scoreCompatibilite }) => (
        <NoticeCard key={mission.id} className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Tag tone="ocre">{libelleCategorie(mission.categorie)}</Tag>

            <span
              className="font-mono text-xs font-semibold text-rice"
              title="Score de correspondance calculé par le système de matching"
            >
              {scoreCompatibilite} % de correspondance
            </span>
          </div>

          <p className="font-display text-lg font-semibold leading-snug">
            {mission.titre}
          </p>

          <p className="text-sm text-ink-soft line-clamp-2">
            {mission.description}
          </p>

          <div className="mt-auto flex flex-col gap-2.5">
            {mission.competencesRequises.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {mission.competencesRequises.slice(0, 3).map((competence) => (
                  <Tag key={competence} tone="rice">
                    #{competence}
                  </Tag>
                ))}

                {mission.competencesRequises.length > 3 && (
                  <Tag tone="ink">
                    +{mission.competencesRequises.length - 3}
                  </Tag>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink/10 pt-3">
              <p className="font-mono text-sm font-semibold text-ocre-dark">
                {formatArgent(mission.budget)}
              </p>

              <p className="inline-flex items-center gap-1 text-xs text-ink-soft/70">
                <CalendarClock size={12} aria-hidden="true" />
                avant le {formatDateCourte(mission.dateLimite)}
              </p>
            </div>

            <Link
              href={`/missions/${mission.id}`}
              className="self-start"
              aria-label={`Voir la mission ${mission.titre}`}
            >
              <Button size="sm" variant="secondary">
                Voir la mission
              </Button>
            </Link>
          </div>
        </NoticeCard>
      ))}
    </div>
  );
}