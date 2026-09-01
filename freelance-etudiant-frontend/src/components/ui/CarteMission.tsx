"use client";

import Link from "next/link";
import { createElement } from "react";
import { CalendarClock } from "lucide-react";

import type { Mission } from "@/lib/types";
import { formatArgent, formatDateCourte, statutMissionLabel } from "@/lib/format";
import { getFileUrl } from "@/lib/api";
import { iconePourCategorie, libelleCategorie } from "@/lib/categories";

import { Avatar } from "@/components/ui/Avatar";
import { FavoriBouton } from "@/components/ui/FavoriBouton";
import { Tag } from "@/components/ui/Notice";

/**
 * Visuel de couverture de repli quand une mission n'a pas d'image :
 * meme traitement que CarteService, pour une coherence visuelle totale
 * entre les deux places de marche (missions et services).
 */
function VisuelCategorie({ categorie }: { categorie: string }) {
  return createElement(iconePourCategorie(categorie), {
    size: 38,
    className:
      "text-ocre-dark/50 transition-transform duration-300 group-hover:scale-110",
    "aria-hidden": true,
  });
}

/**
 * Carte d'une mission publiee par un client : couverture (image ou repli
 * par categorie), statut, titre, apercu de la description, competences
 * recherchees, puis budget et date limite de candidature. Reutilisee sur
 * la page d'accueil et la liste des missions, avec le meme rythme visuel
 * que CarteService.
 */
export function CarteMission({ mission }: { mission: Mission }) {
  const client = mission.client;
  const auteur = client?.utilisateur;
  const image = getFileUrl(mission.imageUrl ?? null);

  return (
    <article className="notice-card group relative flex flex-col">
      <span className="notice-pin z-10" aria-hidden="true" />

      {/* ---------------------------------------------- COUVERTURE */}
      <Link
        href={`/missions/${mission.id}`}
        className="relative block h-32 overflow-hidden rounded-t-[15px] border-b border-ink/10 sm:h-36"
        aria-label={mission.titre}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-ocre/15 via-paper-light to-rice/10">
            <VisuelCategorie categorie={mission.categorie} />
          </span>
        )}

        <span className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center rounded-full border border-ink/10 bg-paper-light/90 px-2.5 py-0.5 text-[11px] font-mono uppercase tracking-wide text-ink-soft backdrop-blur-sm">
            {libelleCategorie(mission.categorie)}
          </span>
          <span className="inline-flex items-center rounded-full border border-ink/10 bg-paper-light/90 px-2.5 py-0.5 text-[11px] font-mono uppercase tracking-wide text-ink-soft backdrop-blur-sm">
            {statutMissionLabel[mission.statut] ?? mission.statut}
          </span>
        </span>

        <span className="absolute right-3 top-3">
          <FavoriBouton cibleType="mission" cibleId={mission.id} />
        </span>
      </Link>

      {/* ---------------------------------------------- CONTENU */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-lg font-semibold leading-snug line-clamp-2 transition-colors group-hover:text-ocre-dark">
          {mission.titre}
        </h3>

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
          <div className="flex items-center justify-between gap-2 pt-2">
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
      </div>
    </article>
  );
}