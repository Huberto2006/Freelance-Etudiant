"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock } from "lucide-react";

import { useTranslations } from "next-intl";
import { useFormats } from "@/i18n/use-formats";
import { useOptionLabels } from "@/i18n/use-option-labels";
import { api, ApiError } from "@/lib/api";
import type { Mission } from "@/types/missions";

import { getFileUrl } from "@/lib/api";
import { ImageAvecRepli } from "@/components/ui/ImageAvecRepli";
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
  const t = useTranslations("dashboardPages.recommendedMissions");
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
          setErreur(t("profileMissing"));
        } else {
          setErreur(t("loadError"));
        }
      } finally {
        if (actif) setChargement(false);
      }
    })();

    return () => {
      actif = false;
    };
  }, [tentative, t]);

  if (chargement) {
    return (
      <div
        role="status"
        aria-label={t("loading")}
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
          profilManquant ? undefined : () => setTentative((n) => n + 1)
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
  const t = useTranslations("dashboardPages.recommendedMissions");
  const { argent: formatArgent, dateCourte: formatDateCourte } = useFormats();
  const { categorie: libelleCategorie } = useOptionLabels();
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
          {t("emptyDescription")}
        </p>

        <div className="flex flex-wrap gap-2">
          <Link href="/missions" aria-label={t("explore")}>
            <Button size="sm">{t("explore")}</Button>
          </Link>

          <Link
            href="/tableau-de-bord/profil"
            aria-label={t("completeProfile")}
          >
            <Button size="sm" variant="ghost">
              {t("completeProfile")}
            </Button>
          </Link>
        </div>
      </NoticeCard>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {liste.map(({ mission, scoreCompatibilite }) => (
        <NoticeCard key={mission.id} className="flex flex-col gap-2.5 overflow-hidden">
          {/* Marges negatives : l'image occupe toute la largeur de la
              carte malgre le padding par defaut de NoticeCard (p-5). */}
          <div className="-mx-5 -mt-5 h-28 w-[calc(100%+2.5rem)] overflow-hidden">
            <ImageAvecRepli
              src={getFileUrl(mission.imageUrl ?? null)}
              alt=""
              categorie={mission.categorie}
              className="h-full w-full object-cover"
              tailleIcone={30}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Tag tone="ocre">{libelleCategorie(mission.categorie)}</Tag>

            <span
              className="font-mono text-xs font-semibold text-ocre-dark"
              title={t("scoreTitle")}
            >
              {t("match", { score: scoreCompatibilite })}
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
                  <Tag key={competence}>
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
                {t("before", { date: formatDateCourte(mission.dateLimite) })}
              </p>
            </div>

            <Link
              href={`/missions/${mission.id}`}
              className="self-start"
              aria-label={t("viewMissionLabel", { titre: mission.titre })}
            >
              <Button size="sm" variant="secondary">
                {t("viewMission")}
              </Button>
            </Link>
          </div>
        </NoticeCard>
      ))}
    </div>
  );
}