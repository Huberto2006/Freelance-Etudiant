"use client";

import Link from "next/link";
import { CalendarClock } from "lucide-react";

import type { Mission } from "@/lib/types";
import { formatArgent, formatDateCourte, statutMissionLabel } from "@/lib/format";

import { Avatar } from "@/components/ui/Avatar";
import { FavoriBouton } from "@/components/ui/FavoriBouton";
import { Tag } from "@/components/ui/Notice";

/**
 * Carte d'une mission publiee par un client : categorie, statut, titre,
 * apercu de la description, competences recherchees, puis budget et date
 * limite de candidature. Reutilisee sur la page d'accueil et la liste des
 * missions, avec le meme rythme visuel que CarteService.
 */
export function CarteMission({ mission }: { mission: Mission }) {
  const client = mission.client;
  const auteur = client?.utilisateur;

  return (
    <article className="notice-card group relative flex flex-col p-5">
      <span className="notice-pin" aria-hidden="true" />

      {/* ---------------------------------------------- EN-TETE */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Tag tone="ocre">{mission.categorie}</Tag>
          <Tag tone="ink">{statutMissionLabel[mission.statut] ?? mission.statut}</Tag>
        </div>

        <FavoriBouton cibleType="mission" cibleId={mission.id} />
      </div>

      {/* ---------------------------------------------- TITRE + APERCU */}
      <Link href={`/missions/${mission.id}`} className="mt-3 block">
        <h3 className="font-display text-lg font-semibold leading-snug line-clamp-2 transition-colors group-hover:text-ocre-dark">
          {mission.titre}
        </h3>
      </Link>

      <p className="mt-1.5 text-sm text-ink-soft line-clamp-2">
        {mission.description}
      </p>

      {/* ---------------------------------------------- COMPETENCES */}
      {mission.competencesRequises.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {mission.competencesRequises.slice(0, 3).map((competence) => (
            <Tag key={competence} tone="rice">
              #{competence}
            </Tag>
          ))}
          {mission.competencesRequises.length > 3 && (
            <Tag tone="ink">+{mission.competencesRequises.length - 3}</Tag>
          )}
        </div>
      )}

      {/* ---------------------------------------------- PIED */}
      <div className="mt-auto border-t border-ink/10 pt-3">
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-sm font-semibold text-ocre-dark">
            {formatArgent(mission.budget)}
          </p>

          <p className="inline-flex items-center gap-1 text-xs text-ink-soft/70">
            <CalendarClock size={12} aria-hidden="true" />
            avant le {formatDateCourte(mission.dateLimite)}
          </p>
        </div>

        {client && (
          <div className="mt-2.5 flex items-center gap-2">
            <Avatar
              nom={auteur?.nom ?? "Client"}
              photoUrl={auteur?.photoUrl}
              size={22}
              href={`/clients/${client.utilisateurId}`}
            />
            <p className="min-w-0 truncate text-xs text-ink-soft/70">
              {auteur?.nom ?? "Client"}
            </p>
          </div>
        )}
      </div>
    </article>
  );
}