"use client";

import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { useTranslations } from "next-intl";

import type { Mission } from "@/lib/types";
import { getFileUrl } from "@/lib/api";
import { useFormats } from "@/i18n/use-formats";
import { useLabels } from "@/i18n/use-labels";
import { useOptionLabels } from "@/i18n/use-option-labels";

import { Avatar } from "@/components/ui/Avatar";
import { FavoriBouton } from "@/components/ui/FavoriBouton";
import { Tag, toneStatut } from "@/components/ui/Notice";
import { ImageAvecRepli } from "@/components/ui/ImageAvecRepli";

/**
 * Carte d'une mission publiee par un client : couverture (image ou repli
 * par categorie), statut, titre, apercu de la description, competences
 * recherchees, puis budget et date limite de candidature. Reutilisee sur
 * la page d'accueil, la liste des missions et le catalogue publications.
 */
export function CarteMission({
  mission,
  afficherType = false,
}: {
  mission: Mission;
  afficherType?: boolean;
}) {
  const t = useTranslations("common");
  const { argent, dateCourte } = useFormats();
  const { statutMission } = useLabels();
  const { categorie } = useOptionLabels();
  const client = mission.client;
  const auteur = client?.utilisateur;
  const image = getFileUrl(mission.imageUrl ?? null);

  return (
    <article className="notice-card card-link group relative flex flex-col overflow-hidden">
      {/* ---------------------------------------------- COUVERTURE
          Le lien couvre l'image ; le bouton « favori » est un FRÈRE du
          lien (jamais son enfant) : un contrôle interactif ne doit pas
          être imbriqué dans un <a>. */}
      <div className="relative h-32 border-b border-ink/10 sm:h-36">
        <Link
          href={`/missions/${mission.id}`}
          className="absolute inset-0 block overflow-hidden"
          aria-label={mission.titre}
        >
          <ImageAvecRepli
            src={image}
            alt=""
            categorie={mission.categorie}
            className="h-full w-full object-cover transition-transform duration-300 ease-out-soft group-hover:scale-[1.02]"
          />
        </Link>

        <span className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1.5">
          {afficherType && (
            <span className="inline-flex items-center rounded-md bg-ink px-2 py-0.5 text-xs font-medium text-paper-light">
              {t("card.mission")}
            </span>
          )}
          <span className="inline-flex items-center rounded-md border border-ink/10 bg-paper-light px-2 py-0.5 text-xs font-medium text-ink-soft">
            {categorie(mission.categorie)}
          </span>
          <span className="rounded-md bg-paper-light">
            <Tag tone={toneStatut(mission.statut)}>
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-current"
                aria-hidden="true"
              />
              {statutMission(mission.statut)}
            </Tag>
          </span>
        </span>

        <span className="absolute right-3 top-3">
          <FavoriBouton cibleType="mission" cibleId={mission.id} />
        </span>
      </div>

      {/* ---------------------------------------------- CONTENU */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-lg font-semibold leading-snug line-clamp-2 transition-colors">
          <Link href={`/missions/${mission.id}`} className="hover:underline">
            {mission.titre}
          </Link>
        </h3>

        <p className="mt-1.5 text-sm text-ink-soft line-clamp-2">
          {mission.description}
        </p>

        {/* ---------------------------------------------- COMPETENCES */}
        {mission.competencesRequises.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {mission.competencesRequises.slice(0, 3).map((competence) => (
              <Tag key={competence}>
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
            <p className="font-mono text-sm font-semibold tabular-nums text-ocre-dark">
              {argent(mission.budget)}
            </p>

            <p className="inline-flex items-center gap-1 text-xs text-ink-soft/70">
              <CalendarClock size={12} aria-hidden="true" />
              {t("card.before", { date: dateCourte(mission.dateLimite) })}
            </p>
          </div>

          <div className="mt-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar
                nom={auteur?.nom ?? t("card.client")}
                photoUrl={auteur?.photoUrl}
                size={22}
                href={client ? `/clients/${client.utilisateurId}` : undefined}
              />
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-ink">
                  {auteur?.nom ?? t("card.client")}
                </p>
                <p className="text-[0.6875rem] text-ink-soft">{t("card.client")}</p>
              </div>
            </div>

            <Link
              href={`/missions/${mission.id}`}
              className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-bleu-dark transition-colors hover:bg-bleu/10 hover:text-bleu"
            >
              {t("card.view")}
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}