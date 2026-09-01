"use client";

import Link from "next/link";
import { clsx } from "clsx";

import { formatDateRelative } from "@/lib/dashboard";
import type { EvenementActivite, Ton } from "@/lib/dashboard";
import { NoticeCard } from "@/components/ui/Notice";

const POINTS: Record<Ton, string> = {
  ocre: "bg-ocre",
  rice: "bg-rice",
  brique: "bg-brique",
  ink: "bg-ink-soft",
};

/**
 * Timeline « Activité récente » : chaque événement provient de données
 * réelles (notifications, paiements, signalements). Aucune activité
 * fictive n'est générée.
 */
export function ActiviteRecente({
  evenements,
  videTitre = "Aucune activité pour le moment.",
  videDescription = "Vos candidatures, livraisons, paiements et messages apparaîtront ici.",
}: {
  evenements: EvenementActivite[];
  videTitre?: string;
  videDescription?: string;
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

            {evenement.href && (
              <Link
                href={evenement.href}
                className="mt-1 inline-block text-xs font-medium text-ocre-dark hover:underline"
                aria-label={`Consulter : ${evenement.titre}`}
              >
                Consulter →
              </Link>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
