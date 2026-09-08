"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { Trash2 } from "lucide-react";

import { formatDateRelative } from "@/lib/dashboard";
import type { EvenementActivite, Ton } from "@/lib/dashboard";
import { NoticeCard } from "@/components/ui/Notice";

const POINTS: Record<Ton, string> = {
  ocre: "bg-ocre",
  rice: "bg-ink-soft",
  brique: "bg-brique",
  ink: "bg-ink-soft",
};

/**
 * Timeline « Activité récente » : chaque événement provient de données
 * réelles (notifications, paiements, signalements). Aucune activité
 * fictive n'est générée.
 *
 * Suppression : les activités issues des NOTIFICATIONS de l'utilisateur
 * peuvent être supprimées individuellement (suppression de la notification
 * correspondante côté backend — permissions vérifiées serveur). Les
 * activités d'administration (signalements, paiements plateforme) ne
 * fournissent pas de handler et n'affichent donc pas de bouton.
 */
export function ActiviteRecente({
  evenements,
  videTitre = "Aucune activité pour le moment.",
  videDescription = "Vos candidatures, livraisons, paiements et messages apparaîtront ici.",
  onSupprimer,
  suppressionEnCoursId,
  onToutEffacer,
  effacementEnCours,
}: {
  evenements: EvenementActivite[];
  videTitre?: string;
  videDescription?: string;
  /** Handler optionnel : supprime la notification à l'origine de l'activité. */
  onSupprimer?: (idEvenement: string) => void;
  /** Identifiant de l'activité en cours de suppression (état de chargement). */
  suppressionEnCoursId?: string | null;
  /** Handler optionnel : « Tout effacer » (notifications de l'utilisateur). */
  onToutEffacer?: () => void;
  /** État de chargement du « Tout effacer ». */
  effacementEnCours?: boolean;
}) {
  if (evenements.length === 0) {
    return (
      <NoticeCard>
        <p className="font-display font-medium">{videTitre}</p>
        <p className="mt-0.5 text-sm text-ink-soft">{videDescription}</p>
      </NoticeCard>
    );
  }

  return (
    <div>
      {onToutEffacer && (
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={onToutEffacer}
            disabled={effacementEnCours}
            className="
              inline-flex cursor-pointer items-center gap-1.5 rounded-lg
              border border-ink/15 px-3 py-1.5 font-mono text-xs
              uppercase tracking-wider text-ink-soft transition-colors
              hover:border-brique/50 hover:text-brique
              disabled:cursor-not-allowed disabled:opacity-50
            "
          >
            <Trash2 size={13} aria-hidden="true" />
            {effacementEnCours ? "Suppression…" : "Tout effacer"}
          </button>
        </div>
      )}

      <ol className="flex flex-col">
        {evenements.map((evenement, index) => (
          <li
            key={evenement.id}
            className="relative flex gap-4 pb-6 last:pb-0"
          >
            {index < evenements.length - 1 && (
              <span
                className="absolute left-[5px] top-4 h-full w-px bg-ink/15"
                aria-hidden="true"
              />
            )}

            <span
              className={clsx(
                "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full",
                POINTS[evenement.ton],
              )}
              aria-hidden="true"
            />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className="font-medium">{evenement.titre}</p>

                <time
                  dateTime={evenement.date}
                  className="font-mono text-xs text-ink-soft/60"
                >
                  {formatDateRelative(evenement.date)}
                </time>
              </div>

              {evenement.detail && (
                <p className="mt-0.5 text-sm text-ink-soft">
                  {evenement.detail}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                {evenement.href && (
                  <Link
                    href={evenement.href}
                    className="mt-1 inline-block text-xs font-medium text-ocre-dark hover:underline"
                    aria-label={`Consulter : ${evenement.titre}`}
                  >
                    Consulter →
                  </Link>
                )}

                {onSupprimer && (
                  <button
                    type="button"
                    onClick={() => onSupprimer(evenement.id)}
                    disabled={suppressionEnCoursId === evenement.id}
                    aria-label={`Supprimer l'activité : ${evenement.titre}`}
                    className="
                      mt-1 inline-flex cursor-pointer items-center gap-1
                      text-xs text-ink-soft/50 transition-colors
                      hover:text-brique disabled:cursor-wait
                      disabled:opacity-50
                    "
                  >
                    <Trash2 size={11} aria-hidden="true" />
                    {suppressionEnCoursId === evenement.id
                      ? "Suppression…"
                      : "Supprimer"}
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
