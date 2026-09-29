"use client";

import { createElement, useState } from "react";
import { iconePourCategorie } from "@/lib/categories";

/**
 * Image de couverture avec repli automatique par categorie.
 *
 * Sans ceci, une URL /uploads/... cassee (mauvais NEXT_PUBLIC_API_URL,
 * fichier supprime, proxy mal configure...) affichait l'icone "image
 * brisee" du navigateur au lieu du visuel de repli deja utilise quand
 * il n'y a simplement pas d'image.
 */
export function ImageAvecRepli({
  src,
  alt,
  categorie,
  className,
  tailleIcone = 38,
}: {
  src: string | null;
  alt: string;
  categorie: string;
  className?: string;
  tailleIcone?: number;
}) {
  const [enErreur, setEnErreur] = useState(false);

  if (!src || enErreur) {
    return (
      <span className="flex h-full w-full items-center justify-center bg-paper">
        {createElement(iconePourCategorie(categorie), {
          size: tailleIcone,
          className:
            "text-ocre-dark/50 transition-transform duration-300 group-hover:scale-110",
          "aria-hidden": true,
        })}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setEnErreur(true)}
    />
  );
}
