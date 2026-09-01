"use client";

import type { ComponentType, ReactNode } from "react";
import type { LucideProps } from "lucide-react";
import { RefreshCw } from "lucide-react";
import { clsx } from "clsx";

import { Button } from "@/components/ui/Button";
import { NoticeCard } from "@/components/ui/Notice";

/**
 * Section standard du tableau de bord : titre avec médaillon, action
 * optionnelle à droite (ex. « Tout voir ») et contenu. L'espacement est
 * contrôlé par l'appelant via className.
 */
export function DashboardSection({
  titre,
  icone: Icone,
  action,
  children,
  className,
}: {
  titre: string;
  icone?: ComponentType<LucideProps>;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={clsx(className)} aria-label={titre}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
          {Icone && (
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ocre/10 text-ocre-dark"
              aria-hidden="true"
            >
              <Icone size={16} />
            </span>
          )}
          {titre}
        </h2>

        {action}
      </div>

      {children}
    </section>
  );
}

/**
 * Carte d'erreur de section : une panne d'un endpoint n'entraîne jamais
 * l'échec du tableau de bord entier, les autres sections continuent.
 */
export function ErreurSection({
  message = "Impossible de charger cette section.",
  onReessayer,
}: {
  message?: string;
  onReessayer?: () => void;
}) {
  return (
    <NoticeCard className="border-brique/40">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-brique">{message}</p>

        {onReessayer && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onReessayer}
            className="gap-2"
          >
            <RefreshCw size={14} aria-hidden="true" />
            Réessayer
          </Button>
        )}
      </div>
    </NoticeCard>
  );
}
