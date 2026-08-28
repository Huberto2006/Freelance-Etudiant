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
 * Reutilisee sur la page d'accueil et la liste des services.
 */
export function CarteService({ service }: { service: ServiceOffert }) {
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
          <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-ocre/15 via-paper-light to-rice/10">
            <VisuelCategorie categorie={service.categorie} />
          </span>
        )}

        <span className="absolute left-3 top-3">
          <span className="inline-flex items-center rounded-full border border-ink/10 bg-paper-light/90 px-2.5 py-0.5 text-[11px] font-mono uppercase tracking-wide text-ink-soft backdrop-blur-sm">
            {libelleCategorie(service.categorie)}
          </span>
        </span>
      </Link>

      {/* ---------------------------------------------- CONTENU */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* Auteur + note */}
        <div className="flex items-center gap-2">
          <Avatar
            nom={auteur?.nom ?? "Étudiant"}
            photoUrl={auteur?.photoUrl}
            size={26}
            href={etudiant ? `/etudiants/${etudiant.utilisateurId}` : undefined}
          />
          <p className="min-w-0 flex-1 truncate text-xs text-ink-soft">
            {auteur?.nom ?? "Étudiant"}
          </p>
          {note > 0 && (
            <p
              className="flex shrink-0 items-center gap-1 text-xs font-medium text-ocre-dark"
              title="Note moyenne du prestataire"
            >
              <Star size={12} className="fill-ocre-dark text-ocre-dark" />
              {note.toFixed(1)}
            </p>
          )}
          <FavoriBouton cibleType="service" cibleId={service.id} />
        </div>

        {/* Titre */}
        <Link href={`/services/${service.id}`} className="block">
          <h3 className="font-display text-base font-semibold leading-snug line-clamp-2 transition-colors group-hover:text-ocre-dark">
            {service.titre}
          </h3>
        </Link>

        {/* Pied : prix + delai */}
        <div className="mt-auto flex items-center justify-between border-t border-ink/10 pt-3">
          <p className="font-mono text-sm font-semibold text-ocre-dark">
            {formatArgent(service.prix)}
          </p>
          <p className="inline-flex items-center gap-1 text-xs text-ink-soft/70">
            <Timer size={12} aria-hidden="true" />
            {service.delai} j
          </p>
        </div>
      </div>
    </article>
  );
}