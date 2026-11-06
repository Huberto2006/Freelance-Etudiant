"use client";

import { clsx } from "clsx";

import { Avatar } from "@/components/ui/Avatar";
import { Tag } from "@/components/ui/Notice";
import { useTranslations } from "next-intl";
import { useLabels } from "@/i18n/use-labels";
import type { Utilisateur } from "@/types/utilisateurs";

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
  const t = useTranslations("dashboardPages.dashboardHeader");
  const { role } = useLabels();
  const prenom = utilisateur.nom.split(" ")[0] || utilisateur.nom;
  // Rendu côté client uniquement (session requise) : l'heure est celle de la personne.
  const heure = new Date().getHours();

  return (
    <header className={clsx("mb-7 flex items-center gap-4", className)}>
      <Avatar
        nom={utilisateur.nom}
        photoUrl={utilisateur.photoUrl}
        size={56}
        href="/tableau-de-bord/profil"
      />

      <div className="min-w-0 flex-1">

        <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
          {t(heure >= 18 ? "greetingEvening" : "greeting", { prenom })}
        </h1>

        <p className="mt-1 text-sm text-ink-soft">{sousTitre}</p>
      </div>

      <div className="hidden shrink-0 sm:block">
        <Tag tone="ink">{role(utilisateur.role)}</Tag>
      </div>
    </header>
  );
}
