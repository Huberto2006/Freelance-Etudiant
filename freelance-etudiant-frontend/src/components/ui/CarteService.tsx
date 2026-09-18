"use client";

import Link from "next/link";
import { createElement } from "react";
import { Star, Timer } from "lucide-react";

import type { ServiceOffert } from "@/lib/types";
import { formatArgent } from "@/lib/format";
import { getFileUrl } from "@/lib/api";
import { iconePourCategorie, libelleCategorie } from "@/lib/categories";

import { Avatar } from "@/components/ui/Avatar";
import { FavoriBouton } from "@/components/ui/FavoriBouton";
import { Tag } from "@/components/ui/Notice";

/**
 * Visuel de couverture de repli quand un service n'a pas d'image :
 * degrade doux de la palette + icone representative de la categorie.
 * createElement evite de creer un composant a chaque rendu.
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
  const etudiant = service.etudiant;
  const auteur = etudiant?.utilisateur;

  const note = Number(etudiant?.noteMoyenne ?? 0);
  const image = getFileUrl(service.imagesUrls?.[0] ?? null);

  return (
    <article className="notice-card group relative flex flex-col">
      <span className="notice-pin z-10" aria-hidden="true" />

      {/* ---------------------------------------------- COUVERTURE */}
      <Link
        href={`/services/${service.id}`}
        className="relative block h-32 overflow-hidden rounded-t-[15px] border-b border-ink/10 sm:h-36"
        aria-label={service.titre}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-paper">
            <VisuelCategorie categorie={service.categorie} />
          </span>
        )}

        <span className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {afficherType && (
            <span className="inline-flex items-center gap-1 rounded-full border border-ocre/30 bg-ocre/90 px-2.5 py-0.5 text-[11px] font-mono font-semibold uppercase tracking-wide text-white shadow-xs backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" aria-hidden="true" />
              Service
            </span>
          )}
          <span className="inline-flex items-center rounded-full border border-ink/10 bg-paper-light/90 px-2.5 py-0.5 text-[11px] font-mono uppercase tracking-wide text-ink-soft backdrop-blur-sm">
            {libelleCategorie(service.categorie)}
          </span>
        </span>

        <span className="absolute right-3 top-3">
          <FavoriBouton cibleType="service" cibleId={service.id} />
        </span>
      </Link>

      {/* ---------------------------------------------- CONTENU */}
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        {/* Titre */}
        <h3 className="font-display text-base font-semibold leading-snug line-clamp-2 transition-colors group-hover:text-ocre-dark">
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
            <p className="font-mono text-sm font-semibold text-ocre-dark">
              {formatArgent(service.prix)}
            </p>
            <p className="inline-flex items-center gap-1 text-xs text-ink-soft/70">
              <Timer size={12} aria-hidden="true" />
              {service.delai} j
            </p>
          </div>

          <div className="mt-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar
                nom={auteur?.nom ?? "Étudiant"}
                photoUrl={auteur?.photoUrl}
                size={22}
                href={etudiant ? `/etudiants/${etudiant.utilisateurId}` : undefined}
              />
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-ink">
                  {auteur?.nom ?? "Étudiant"}
                </p>
                <div className="flex items-center gap-1 text-[11px] text-ink-soft">
                  <span>Étudiant</span>
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
              className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 font-mono text-xs font-semibold text-bleu-dark hover:bg-bleu/10 hover:text-bleu transition-colors"
            >
              Voir →
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}