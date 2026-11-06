"use client";

import { clsx } from "clsx";

import { SkeletonShimmer } from "./motion/SkeletonShimmer";

/**
 * Squelettes de chargement — placeholder visuels pendant la récupération
 * des données, en cohérence avec la palette papier/encre de Kianja.
 */
export function Skeleton({
  className,
  rond = false,
}: {
  className?: string;
  rond?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={clsx(
        "skeleton block bg-ink/10",
        rond ? "rounded-full" : "rounded-md",
        className,
      )}
    />
  );
}

/** Imitation d'une carte de statistique (StatCard). */
export function SkeletonCarte({ className }: { className?: string }) {
  return (
    <SkeletonShimmer
      className={clsx("notice-card flex flex-col gap-3 p-5", className)}
    >
      <div className="flex items-center gap-2.5">
        <Skeleton rond className="h-9 w-9" />
        <Skeleton className="h-3 w-28" />
      </div>
      <Skeleton className="mt-1 h-8 w-24" />
      <Skeleton className="h-2.5 w-32" />
    </SkeletonShimmer>
  );
}

/** Imitation d'une liste de cartes (activité, actions, projets…). */
export function SkeletonListe({
  nombre = 3,
  className,
}: {
  nombre?: number;
  className?: string;
}) {
  return (
    <div aria-hidden="true" className={clsx("flex flex-col gap-3", className)}>
      {Array.from({ length: nombre }).map((_, index) => (
        <SkeletonShimmer key={index} className="notice-card flex items-start gap-3 p-5">
          <Skeleton rond className="h-9 w-9 shrink-0" />
          <div className="w-full">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-2 h-3 w-full" />
            <Skeleton className="mt-1.5 h-3 w-2/3" />
          </div>
        </SkeletonShimmer>
      ))}
    </div>
  );
}

/** Imitation d'une carte de mission recommandée. */
export function SkeletonMission({ className }: { className?: string }) {
  return (
    <SkeletonShimmer
      className={clsx("notice-card flex flex-col gap-3 p-5", className)}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-24 !rounded-full" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <div className="mt-2 flex items-center justify-between border-t border-ink/10 pt-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3 w-24" />
      </div>
    </SkeletonShimmer>
  );
}
