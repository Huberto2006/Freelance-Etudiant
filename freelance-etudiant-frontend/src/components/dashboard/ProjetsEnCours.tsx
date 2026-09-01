"use client";

import Link from "next/link";

import type { ProjetActif } from "@/lib/dashboard";
import { Button } from "@/components/ui/Button";
import { NoticeCard, Tag } from "@/components/ui/Notice";

/**
 * « Mes projets en cours » : cartes des collaborations actives (côté
 * étudiant : candidatures acceptées ; côté client : missions en cours).
 * Utilise les statuts existants du projet, rien n'est inventé.
 */
export function ProjetsEnCours({
  projets,
  libelleInterlocuteur = "Client",
  libelleAction = "Voir le projet",
  videTitre = "Aucune mission en cours.",
  videDescription = "Explorez les missions ouvertes pour démarrer un nouveau projet.",
  videHref = "/missions",
  videLibelle = "Explorer les missions",
}: {
  projets: ProjetActif[];
  /** Étiquette de l'interlocuteur affiché (« Client », « Étudiant »…). */
  libelleInterlocuteur?: string;
  libelleAction?: string;
  videTitre?: string;
  videDescription?: string;
  videHref?: string;
  videLibelle?: string;
}) {
  if (projets.length === 0) {
    return (
      <NoticeCard className="flex flex-col items-start gap-3">
        <p className="font-display font-medium">{videTitre}</p>
        <p className="text-sm text-ink-soft">{videDescription}</p>

        <Link href={videHref} aria-label={videLibelle}>
          <Button size="sm">{videLibelle}</Button>
        </Link>
      </NoticeCard>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {projets.map((projet) => (
        <NoticeCard key={projet.id} className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link
              href={projet.href}
              className="min-w-0 font-display font-semibold transition-colors hover:text-ocre-dark"
              aria-label={`${libelleAction} : ${projet.titre}`}
            >
              {projet.titre}
            </Link>

            <Tag tone={projet.statutTon}>{projet.statutLabel}</Tag>
          </div>

          {projet.interlocuteur && (
            <p className="text-sm text-ink-soft">
              {libelleInterlocuteur} : {projet.interlocuteur}
            </p>
          )}

          {projet.detail && (
            <p className="text-xs text-ink-soft/70">{projet.detail}</p>
          )}

          <Link
            href={projet.href}
            className="mt-auto self-start"
            aria-label={`${libelleAction} : ${projet.titre}`}
          >
            <Button size="sm" variant="ghost">
              {libelleAction}
            </Button>
          </Link>
        </NoticeCard>
      ))}
    </div>
  );
}
