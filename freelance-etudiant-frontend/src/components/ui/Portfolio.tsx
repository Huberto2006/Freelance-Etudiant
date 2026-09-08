"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Globe, X } from "lucide-react";
import { clsx } from "clsx";
import { getFileUrl } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { NoticeCard } from "@/components/ui/Notice";

const EXTENSIONS_IMAGE = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".avif",
  ".svg",
];

/**
 * Détermine si une URL de portfolio pointe vers une image, d'après
 * l'extension de son chemin (les paramètres d'URL sont ignorés).
 * Gère aussi bien les liens absolus (https://…) que les chemins
 * relatifs produits par l'upload de fichiers (/uploads/…).
 */
export function estImageUrl(url: string): boolean {
  try {
    const chemin = new URL(url, "http://kianja.local").pathname.toLowerCase();
    return EXTENSIONS_IMAGE.some((ext) => chemin.endsWith(ext));
  } catch {
    return false;
  }
}

/**
 * Libellé lisible déduit d'une URL de portfolio : nom de fichier sans
 * extension pour une image, nom de domaine pour un lien externe.
 * (portfolioUrls ne transporte que des URLs, sans titre ni description.)
 */
export function libellePortfolioUrl(url: string): string {
  if (estImageUrl(url)) {
    try {
      const chemin = new URL(url, "http://kianja.local").pathname;
      const nom = decodeURIComponent(chemin.split("/").pop() ?? "");
      return nom.replace(/\.[a-z0-9]+$/i, "") || "Image du portfolio";
    } catch {
      return "Image du portfolio";
    }
  }
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Aperçu plein écran d'une image du portfolio.
 * Fermeture : touche Échap, clic sur le fond ou bouton croix.
 */
function VisionneuseImage({
  url,
  legende,
  onFermer,
}: {
  url: string;
  legende: string;
  onFermer: () => void;
}) {
  const boutonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function onTouche(e: KeyboardEvent) {
      if (e.key === "Escape") onFermer();
    }
    window.addEventListener("keydown", onTouche);
    document.body.style.overflow = "hidden";
    boutonRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onTouche);
      document.body.style.overflow = "";
    };
  }, [onFermer]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Aperçu : ${legende}`}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 sm:p-8"
      onClick={onFermer}
    >
      <figure
        className="flex max-h-full max-w-full flex-col items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={legende}
          className="max-h-[80vh] max-w-full rounded-lg object-contain shadow-2xl"
        />
        <figcaption className="max-w-full truncate text-xs text-white/75">
          {legende}
        </figcaption>
      </figure>
      <button
        ref={boutonRef}
        type="button"
        onClick={onFermer}
        aria-label="Fermer l'aperçu"
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-paper-light text-ink shadow-lg transition-colors hover:bg-ocre hover:text-paper-light"
      >
        <X size={18} />
      </button>
    </div>
  );
}

/**
 * Galerie de portfolio : affiche les URLs d'un EtudiantProfile.portfolioUrls.
 * - URLs d'images → grille responsive d'aperçus, cliquables (visionneuse).
 * - Autres URLs   → cartes lien avec bouton « Voir le projet » (nouvel onglet).
 *
 * Les URLs vides sont ignorées ; l'état « portfolio vide » est géré par les
 * pages appelantes (section masquée en public, message sur le tableau de bord).
 */
export function PortfolioGalerie({
  urls,
  className,
}: {
  urls: string[];
  className?: string;
}) {
  const [apercu, setApercu] = useState<{ url: string; legende: string } | null>(
    null,
  );

  const valides = urls.filter(Boolean);
  const images = valides.filter(estImageUrl);
  const liens = valides.filter((url) => !estImageUrl(url));

  if (valides.length === 0) return null;

  return (
    <div className={clsx("flex flex-col gap-4", className)}>
      {images.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          {images.map((url, index) => {
            const src = getFileUrl(url);
            if (!src) return null;
            const legende = libellePortfolioUrl(url);
            return (
              <li key={`${url}-${index}`}>
                <button
                  type="button"
                  onClick={() => setApercu({ url: src, legende })}
                  title="Agrandir l'image"
                  className="group block w-full overflow-hidden rounded-lg border border-ink/15 bg-ink/[0.03] text-left transition-shadow hover:shadow-md"
                >
                  <span className="block aspect-[4/3] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={legende}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                    />
                  </span>
                  <span className="block truncate border-t border-ink/10 px-2.5 py-1.5 text-xs text-ink-soft">
                    {legende}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {liens.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {liens.map((url, index) => {
            const libelle = libellePortfolioUrl(url);
            return (
              <li key={`${url}-${index}`}>
                <NoticeCard className="flex h-full flex-col gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink/[0.06] text-ink-soft"
                      aria-hidden="true"
                    >
                      <Globe size={16} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-display font-medium">
                        {libelle}
                      </p>
                      <p className="truncate font-mono text-xs text-ink-soft/70">
                        {url}
                      </p>
                    </div>
                  </div>
                  <Button
                    href={url}
                    target="_blank"
                    variant="ghost"
                    size="sm"
                    className="mt-auto w-fit gap-1.5"
                  >
                    Voir le projet
                    <ExternalLink size={14} />
                  </Button>
                </NoticeCard>
              </li>
            );
          })}
        </ul>
      )}

      {apercu && (
        <VisionneuseImage
          url={apercu.url}
          legende={apercu.legende}
          onFermer={() => setApercu(null)}
        />
      )}
    </div>
  );
}