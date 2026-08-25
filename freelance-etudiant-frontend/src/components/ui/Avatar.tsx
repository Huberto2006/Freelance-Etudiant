"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { User as UserIcon } from "lucide-react";
import { getFileUrl } from "@/lib/api";

/**
 * Avatar circulaire en lecture seule : affiche la photo de profil de
 * l'utilisateur si elle existe, sinon ses initiales. Utilisé partout où
 * un auteur (mission, service, message, commentaire…) doit être identifié
 * visuellement, à la manière d'un réseau social.
 */
export function Avatar({
  nom,
  photoUrl,
  size = 40,
  href,
  className,
}: {
  nom: string;
  photoUrl?: string | null;
  size?: number;
  href?: string;
  className?: string;
}) {
  const url = getFileUrl(photoUrl);
  const initiales = nom
    .split(" ")
    .map((mot) => mot[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const contenu = (
    <span
      className={clsx(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-rice bg-ocre/10 text-ocre-dark",
        className,
      )}
      style={{ width: size, height: size }}
      title={nom}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={nom} className="h-full w-full object-cover" />
      ) : initiales ? (
        <span
          className="font-display font-semibold leading-none"
          style={{ fontSize: Math.max(10, size * 0.38) }}
        >
          {initiales}
        </span>
      ) : (
        <UserIcon size={size * 0.5} />
      )}
    </span>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {contenu}
      </Link>
    );
  }

  return contenu;
}
