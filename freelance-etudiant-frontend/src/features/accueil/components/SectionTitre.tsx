import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import type { ComponentType, ReactNode } from "react";
import type { LucideProps } from "lucide-react";

/**
 * En-tête de section pour la page d'accueil : rubrique (petite icône +
 * intitulé), titre display et lien « voir tout » optionnel aligné à
 * droite. Même grammaire visuelle que PageHeader pour rester cohérent
 * avec le reste de l'interface.
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
        "reveal mb-7 flex flex-wrap items-end justify-between gap-4",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.08em] text-ink-soft">
          <Icon size={14} className="text-ocre-dark" aria-hidden="true" />
          {eyebrow}
        </p>
        <h2 className="font-display text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
          {titre}
        </h2>
        {sousTitre && (
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-soft">
            {sousTitre}
          </p>
        )}
      </div>

      {lienHref && lienLabel && (
        <Link
          href={lienHref}
          className="group inline-flex items-center gap-1 text-sm font-medium text-bleu-dark transition-colors hover:text-bleu"
        >
          {lienLabel}
          <ChevronRight
            size={14}
            aria-hidden="true"
            className="transition-transform duration-150 ease-out-soft group-hover:translate-x-0.5"
          />
        </Link>
      )}
    </div>
  );
}