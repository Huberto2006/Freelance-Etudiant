"use client";

import type { ReactNode } from "react";

import { useAuth } from "@/lib/auth-context";

type ThemeConditionProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

/**
 * Affiche les controles de theme uniquement pour l'administrateur.
 */
export function ThemeCondition({
  children,
  fallback = null,
}: ThemeConditionProps) {
  const { utilisateur, chargement } = useAuth();

  if (chargement || utilisateur?.role !== "admin") {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
