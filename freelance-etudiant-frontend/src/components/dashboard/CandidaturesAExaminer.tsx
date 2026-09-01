"use client";

import Link from "next/link";
import { Star } from "lucide-react";

import type { Candidature } from "@/lib/types";
import { formatArgent, formatDateCourte } from "@/lib/format";
import { versNombre } from "@/lib/dashboard";
import type { EtatSection } from "@/lib/dashboard";
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
  if (etat.statut === "erreur") {
    return (
      <ErreurSection
        message="Impossible de charger les candidatures reçues."
        onReessayer={onReessayer}
      />
    );
  }

  const candidatures = etat.donnees;

  if (!candidatures) {
    return (
      <div
        role="status"
        aria-label="Chargement des candidatures"
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
          Aucune candidature en attente.
        </p>
        <p className="text-sm text-ink-soft">
          Les nouvelles candidatures reçues sur vos missions apparaîtront ici.
        </p>

        <Link href="/tableau-de-bord/mes-missions" aria-label="Voir mes missions">
          <Button size="sm" variant="ghost">
            Voir mes missions
          </Button>
        </Link>
      </NoticeCard>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {enAttente.map((candidature) => {
        const nom =
          candidature.etudiant?.utilisateur?.nom ?? "Candidat";
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
                    ? `${versNombre(note).toFixed(1)} / 5`
                    : "Pas encore noté"}
                  {tarif != null && versNombre(tarif) > 0 && (
                    <> · {formatArgent(tarif)} / h</>
                  )}
                </p>
              </div>

              <Tag tone="ocre">
                {formatDateCourte(candidature.dateCandidature)}
              </Tag>
            </div>

            <p className="text-sm text-ink-soft">
              Pour{" "}
              <span className="font-medium text-ink">
                {candidature.mission?.titre ?? "votre mission"}
              </span>{" "}
              · propose {formatArgent(candidature.prixPropose)} en{" "}
              {candidature.delaiPropose} jour(s)
            </p>

            {competences.length > 0 && (
              <ul
                className="flex flex-wrap gap-1.5"
                aria-label={`Compétences de ${nom}`}
              >
                {competences.slice(0, 3).map((competence) => (
                  <li key={competence}>
                    <Tag tone="rice">#{competence}</Tag>
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
              aria-label={`Examiner la candidature de ${nom}`}
            >
              <Button size="sm" variant="secondary">
                Examiner
              </Button>
            </Link>
          </NoticeCard>
        );
      })}
    </div>
  );
}
