"use client";

import Link from "next/link";
import { Star, Timer } from "lucide-react";
import { useTranslations } from "next-intl";

import type { ServiceOffert } from "@/types/services";
import { getFileUrl } from "@/lib/api";
import { useFormats } from "@/i18n/use-formats";
import { useOptionLabels } from "@/i18n/use-option-labels";

import { Avatar } from "@/components/ui/Avatar";
import { FavoriBouton } from "@/features/favoris/components/FavoriBouton";
import { Tag } from "@/components/ui/Notice";
import { ImageAvecRepli } from "@/components/ui/ImageAvecRepli";

/**
 * Carte catalogue d'un service propose par un etudiant, a la maniere des
 * places de marche : visuel de couverture (image du service ou visuel
 * generique de categorie), auteur, note, titre, puis prix et delai.
 * Reutilisee sur la page d'accueil, la liste des services et le catalogue publications.
 */
export function CarteService({
  service,
  afficherType = false,
}: {
  service: ServiceOffert;
  afficherType?: boolean;
}) {
  const t = useTranslations("common");
  const { argent } = useFormats();
  const { categorie } = useOptionLabels();
  const etudiant = service.etudiant;
  const auteur = etudiant?.utilisateur;

  const note = Number(etudiant?.noteMoyenne ?? 0);
  const image = getFileUrl(service.imagesUrls?.[0] ?? null);

  return (
    <article className="notice-card card-link group relative flex flex-col overflow-hidden">
      {/* ---------------------------------------------- COUVERTURE
          Le lien couvre l'image ; le bouton « favori » est un FRÈRE du
          lien (jamais son enfant) : un contrôle interactif ne doit pas
          être imbriqué dans un <a>. */}
      <div className="relative h-32 border-b border-ink/10 sm:h-36">
        <Link
          href={`/services/${service.id}`}
          className="absolute inset-0 block overflow-hidden"
          aria-label={service.titre}
        >
          <ImageAvecRepli
            src={image}
            alt=""
            categorie={service.categorie}
            className="h-full w-full object-cover transition-transform duration-300 ease-out-soft group-hover:scale-[1.02]"
          />
        </Link>

        <span className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1.5">
          {afficherType && (
            <span className="inline-flex items-center rounded-md bg-ink px-2 py-0.5 text-xs font-medium text-paper-light">
              {t("card.service")}
            </span>
          )}
          <span className="inline-flex items-center rounded-md border border-ink/10 bg-paper-light px-2 py-0.5 text-xs font-medium text-ink-soft">
            {categorie(service.categorie)}
          </span>
        </span>

        <span className="absolute right-3 top-3">
          <FavoriBouton cibleType="service" cibleId={service.id} />
        </span>
      </div>

      {/* ---------------------------------------------- CONTENU */}
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        {/* Titre */}
        <h3 className="font-display text-base font-semibold leading-snug line-clamp-2 transition-colors">
          <Link href={`/services/${service.id}`} className="hover:underline">
            {service.titre}
          </Link>
        </h3>

        {/* Description / extrait */}
        {service.description && (
          <p className="text-xs text-ink-soft line-clamp-2 leading-relaxed">
            {service.description}
          </p>
        )}

        {/* Competences / tags */}
        {service.competences && service.competences.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {service.competences.slice(0, 3).map((competence) => (
              <Tag key={competence}>#{competence}</Tag>
            ))}
            {service.competences.length > 3 && (
              <Tag tone="ink">+{service.competences.length - 3}</Tag>
            )}
          </div>
        )}

        {/* Pied : prix + delai + auteur */}
        <div className="mt-auto border-t border-ink/10 pt-3">
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-sm font-semibold tabular-nums text-ocre-dark">
              {argent(service.prix)}
            </p>
            <p className="inline-flex items-center gap-1 text-xs text-ink-soft/70">
              <Timer size={12} aria-hidden="true" />
              {t("card.days", { count: service.delai })}
            </p>
          </div>

          <div className="mt-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar
                nom={auteur?.nom ?? t("card.student")}
                photoUrl={auteur?.photoUrl}
                size={22}
                href={etudiant ? `/etudiants/${etudiant.utilisateurId}` : undefined}
              />
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-ink">
                  {auteur?.nom ?? t("card.student")}
                </p>
                <div className="flex items-center gap-1 text-[0.6875rem] text-ink-soft">
                  <span>{t("card.student")}</span>
                  {note > 0 && (
                    <span className="inline-flex items-center gap-0.5 font-medium text-ocre-dark">
                      · <Star size={10} className="fill-ocre-dark text-ocre-dark" />
                      {note.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <Link
              href={`/services/${service.id}`}
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