"use client";

import Link from "next/link";
import { Star } from "lucide-react";

import type { Candidature } from "@/types/candidatures";
import { useTranslations } from "next-intl";
import { useFormats } from "@/i18n/use-formats";
import { versNombre } from "@/features/tableau-de-bord/utils/dashboard";
import type { EtatSection } from "@/features/tableau-de-bord/utils/dashboard";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { NoticeCard, Tag } from "@/components/ui/Notice";
import { SkeletonCarte } from "@/components/ui/Skeleton";
import { ErreurSection } from "./DashboardSection";

/**
 * « Candidatures à examiner » (vue client) : candidatures en attente de
 * réponse avec le profil réel du candidat (nom, note, tarif, compétences).
 * Les données proviennent de GET /candidatures/client.
 */
export function CandidaturesAExaminer({
  etat,
  max = 4,
  onReessayer,
}: {
  etat: EtatSection<Candidature[]>;
  max?: number;
  onReessayer: () => void;
}) {
  const t = useTranslations("dashboardPages.applicationsToReview");
  const {
    argent: formatArgent,
    dateCourte: formatDateCourte,
    nombre,
  } = useFormats();
  if (etat.statut === "erreur") {
    return (
      <ErreurSection
        message={t("loadError")}
        onReessayer={onReessayer}
      />
    );
  }

  const candidatures = etat.donnees;

  if (!candidatures) {
    return (
      <div
        role="status"
        aria-label={t("loading")}
        className="grid gap-3 sm:grid-cols-2"
      >
        <SkeletonCarte />
        <SkeletonCarte className="hidden sm:flex" />
      </div>
    );
  }

  const enAttente = candidatures
    .filter((candidature) => candidature.statut === "en_attente")
    .slice(0, max);

  if (enAttente.length === 0) {
    return (
      <NoticeCard className="flex flex-col items-start gap-3">
        <p className="font-display font-medium">
          {t("emptyTitle")}
        </p>
        <p className="text-sm text-ink-soft">
          {t("emptyDescription")}
        </p>

        <Link href="/tableau-de-bord/mes-missions" aria-label={t("viewMissions")}>
          <Button size="sm" variant="ghost">
            {t("viewMissions")}
          </Button>
        </Link>
      </NoticeCard>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {enAttente.map((candidature) => {
        const nom =
          candidature.etudiant?.utilisateur?.nom ?? t("candidateFallback");
        const note = candidature.etudiant?.noteMoyenne;
        const tarif = candidature.etudiant?.tarifHoraire;
        const competences = candidature.etudiant?.competences ?? [];

        return (
          <NoticeCard key={candidature.id} className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Avatar
                nom={nom}
                photoUrl={candidature.etudiant?.utilisateur?.photoUrl}
                size={40}
              />

              <div className="min-w-0 flex-1">
                <p className="truncate font-display font-medium">{nom}</p>
                <p className="inline-flex flex-wrap items-center gap-1 text-xs text-ink-soft">
                  <Star size={12} className="text-ocre" aria-hidden="true" />
                  {note != null
                    ? t("rating", {
                        note: nombre(versNombre(note), {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        }),
                      })
                    : t("notRated")}
                  {tarif != null && versNombre(tarif) > 0 && (
                    <> · {t("hourlyRate", { montant: formatArgent(tarif) })}</>
                  )}
                </p>
              </div>

              <Tag tone="ocre">
                {formatDateCourte(candidature.dateCandidature)}
              </Tag>
            </div>

            <p className="text-sm text-ink-soft">
              {t.rich("proposal", {
                titre: candidature.mission?.titre ?? t("yourMission"),
                prix: formatArgent(candidature.prixPropose),
                count: candidature.delaiPropose,
                mission: (chunks) => (
                  <span className="font-medium text-ink">{chunks}</span>
                ),
              })}
            </p>

            {competences.length > 0 && (
              <ul
                className="flex flex-wrap gap-1.5"
                aria-label={t("skillsOf", { nom })}
              >
                {competences.slice(0, 3).map((competence) => (
                  <li key={competence}>
                    <Tag>#{competence}</Tag>
                  </li>
                ))}

                {competences.length > 3 && (
                  <li>
                    <Tag tone="ink">+{competences.length - 3}</Tag>
                  </li>
                )}
              </ul>
            )}

            <Link
              href="/tableau-de-bord/mes-missions"
              className="mt-auto self-start"
              aria-label={t("reviewApplicationOf", { nom })}
            >
              <Button size="sm" variant="secondary">
                {t("review")}
              </Button>
            </Link>
          </NoticeCard>
        );
      })}
    </div>
  );
}
