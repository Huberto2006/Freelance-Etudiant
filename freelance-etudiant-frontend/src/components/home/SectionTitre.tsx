import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import type { ComponentType, ReactNode } from "react";
import type { LucideProps } from "lucide-react";

/**
 * En-tete de section pour la page d'accueil : medaillon-icone + eyebrow
 * mono + titre display, avec un lien "voir tout" optionnel aligne a
 * droite. Reprend exactement le rythme visuel de PageHeader pour rester
 * coherent avec le reste de l'interface.
 */
export function SectionTitre({
  icon: Icon,
  eyebrow,
  titre,
  sousTitre,
  lienHref,
  lienLabel,
  className,
}: {
  icon: ComponentType<LucideProps>;
  eyebrow: string;
  titre: ReactNode;
  sousTitre?: ReactNode;
  lienHref?: string;
  lienLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "mb-8 flex flex-wrap items-end justify-between gap-4",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ocre/10 text-ocre-dark"
          aria-hidden="true"
        >
          <Icon size={20} />
        </span>

        <div>
          <p className="mb-1 font-mono text-xs uppercase tracking-[0.2em] text-ocre-dark">
            {eyebrow}
          </p>
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">
            {titre}
          </h2>
          {sousTitre && (
            <p className="mt-1 max-w-xl text-sm text-ink-soft">{sousTitre}</p>
          )}
        </div>
      </div>

      {lienHref && lienLabel && (
        <Link
          href={lienHref}
          className="inline-flex items-center gap-1 text-sm font-medium text-rice transition-colors hover:text-rice-light"
        >
          {lienLabel}
          <ChevronRight size={15} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}