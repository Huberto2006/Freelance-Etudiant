"use client";

import { clsx } from "clsx";

import { Avatar } from "@/components/ui/Avatar";
import { Tag } from "@/components/ui/Notice";
import { roleLabel } from "@/lib/auth-context";
import type { Utilisateur } from "@/lib/types";

/**
 * En-tête du tableau de bord : photo de profil (ou initiales), salutation
 * personnalisée avec le vrai nom de l'utilisateur connecté, sous-titre
 * contextuel et badge de rôle.
 */
export function DashboardHeader({
  utilisateur,
  sousTitre,
  className,
}: {
  utilisateur: Utilisateur;
  sousTitre: string;
  className?: string;
}) {
  const prenom = utilisateur.nom.split(" ")[0] || utilisateur.nom;

  return (
    <header className={clsx("mb-8 flex items-center gap-4", className)}>
      <Avatar
        nom={utilisateur.nom}
        photoUrl={utilisateur.photoUrl}
        size={56}
        href="/tableau-de-bord/profil"
      />

      <div className="min-w-0 flex-1">
        <p className="mb-1 font-mono text-xs uppercase tracking-[0.2em] text-ocre-dark">
          Tableau de bord
        </p>

        <h1 className="font-display text-3xl font-semibold leading-tight">
          Bonjour, {prenom} 👋
        </h1>

        <p className="mt-1 text-sm text-ink-soft">{sousTitre}</p>
      </div>

      <div className="hidden shrink-0 sm:block">
        <Tag tone="ink">{roleLabel(utilisateur.role)}</Tag>
      </div>
    </header>
  );
}
