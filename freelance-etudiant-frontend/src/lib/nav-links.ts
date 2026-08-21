import type { LucideIcon } from "lucide-react";
import {
  Bell,
  BriefcaseBusiness,
  ClipboardList,
  Flag,
  Heart,
  LayoutDashboard,
  MessageCircle,
  ShieldCheck,
  User,
  Wallet,
  Wrench,
} from "lucide-react";

import type { Role } from "./types";

export interface LienNav {
  href: string;
  label: string;
  icon: LucideIcon;
}

/**
 * Liens affichés dans la navbar principale
 * une fois l'utilisateur authentifié.
 */
export const liensNavbarParRole: Record<Role, LienNav[]> = {
  etudiant: [
    {
      href: "/missions",
      label: "Missions",
      icon: BriefcaseBusiness,
    },
    {
      href: "/tableau-de-bord/mes-services",
      label: "Mes services",
      icon: Wrench,
    },
    {
      href: "/tableau-de-bord/candidatures",
      label: "Candidatures",
      icon: ClipboardList,
    },
  ],

  client: [
    {
      href: "/services",
      label: "Services",
      icon: Wrench,
    },
    {
      href: "/tableau-de-bord/mes-missions",
      label: "Mes missions",
      icon: BriefcaseBusiness,
    },
  ],

  admin: [
    {
      href: "/tableau-de-bord/admin",
      label: "Administration",
      icon: ShieldCheck,
    },
  ],
};

/**
 * Liens affichés quand personne n'est connecté.
 */
export const liensNavbarPublics: LienNav[] = [
  {
    href: "/missions",
    label: "Missions",
    icon: BriefcaseBusiness,
  },
  {
    href: "/services",
    label: "Services",
    icon: Wrench,
  },
];

/**
 * Navigation complète de la sidebar du tableau de bord,
 * par rôle.
 */
export const liensSidebarParRole: Record<Role, LienNav[]> = {
  etudiant: [
    {
      href: "/tableau-de-bord",
      label: "Vue d'ensemble",
      icon: LayoutDashboard,
    },
    {
      href: "/tableau-de-bord/notifications",
      label: "Notifications",
      icon: Bell,
    },
    {
      href: "/tableau-de-bord/profil",
      label: "Mon profil",
      icon: User,
    },
    {
      href: "/tableau-de-bord/mes-services",
      label: "Mes services",
      icon: Wrench,
    },
    {
      href: "/tableau-de-bord/candidatures",
      label: "Mes candidatures",
      icon: ClipboardList,
    },
    {
      href: "/tableau-de-bord/messages",
      label: "Messages",
      icon: MessageCircle,
    },
    {
      href: "/tableau-de-bord/paiements",
      label: "Paiements",
      icon: Wallet,
    },
    {
      href: "/tableau-de-bord/favoris",
      label: "Favoris",
      icon: Heart,
    },
  ],

  client: [
    {
      href: "/tableau-de-bord",
      label: "Vue d'ensemble",
      icon: LayoutDashboard,
    },
    {
      href: "/tableau-de-bord/notifications",
      label: "Notifications",
      icon: Bell,
    },
    {
      href: "/tableau-de-bord/profil",
      label: "Mon profil",
      icon: User,
    },
    {
      href: "/tableau-de-bord/mes-missions",
      label: "Mes missions",
      icon: BriefcaseBusiness,
    },
    {
      href: "/tableau-de-bord/messages",
      label: "Messages",
      icon: MessageCircle,
    },
    {
      href: "/tableau-de-bord/paiements",
      label: "Paiements",
      icon: Wallet,
    },
    {
      href: "/tableau-de-bord/favoris",
      label: "Favoris",
      icon: Heart,
    },
  ],

  admin: [
    {
      href: "/tableau-de-bord",
      label: "Vue d'ensemble",
      icon: LayoutDashboard,
    },
    {
      href: "/tableau-de-bord/notifications",
      label: "Notifications",
      icon: Bell,
    },
    {
      href: "/tableau-de-bord/admin",
      label: "Administration",
      icon: ShieldCheck,
    },
    {
      href: "/tableau-de-bord/admin/signalements",
      label: "Signalements",
      icon: Flag,
    },
    {
      href: "/tableau-de-bord/admin/paiements",
      label: "Paiements",
      icon: Wallet,
    },
  ],
};
