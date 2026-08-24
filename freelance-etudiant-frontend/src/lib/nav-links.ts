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
  Truck,
} from "lucide-react";

import type { Role } from "./types";

export interface LienNav {
  href: string;
  label: string;
  icon: LucideIcon;
}

/**
 * ============================================================
 * NAVIGATION PUBLIQUE
 * ============================================================
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
 * ============================================================
 * NAVIGATION PRINCIPALE
 * ============================================================
 *
 * Navigation volontairement courte.
 * La navigation complète est dans la sidebar du dashboard.
 */

export const liensNavbarParRole: Record<Role, LienNav[]> = {
  etudiant: [
    {
      href: "/missions",
      label: "Missions",
      icon: BriefcaseBusiness,
    },
    {
      href: "/tableau-de-bord/candidatures",
      label: "Candidatures",
      icon: ClipboardList,
    },
    {
      href: "/tableau-de-bord/livraisons",
      label: "Livraisons",
      icon: Truck,
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
    {
      href: "/tableau-de-bord/livraisons",
      label: "Livraisons",
      icon: Truck,
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
 * ============================================================
 * SIDEBAR DU TABLEAU DE BORD
 * ============================================================
 *
 * Ordre :
 *
 * 1. Vue d'ensemble
 * 2. Notifications
 * 3. Activité
 * 4. Livraisons
 * 5. Finance
 * 6. Communication
 * 7. Profil
 */

export const liensSidebarParRole: Record<Role, LienNav[]> = {
  // ==========================================================
  // ÉTUDIANT
  // ==========================================================

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

    // Activité
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
      label: "Mes candidatures",
      icon: ClipboardList,
    },

    // Livraison
    {
      href: "/tableau-de-bord/livraisons",
      label: "Livraisons",
      icon: Truck,
    },

    // Finance
    {
      href: "/tableau-de-bord/paiements",
      label: "Paiements",
      icon: Wallet,
    },

    // Communication
    {
      href: "/tableau-de-bord/messages",
      label: "Messages",
      icon: MessageCircle,
    },

    {
      href: "/tableau-de-bord/favoris",
      label: "Favoris",
      icon: Heart,
    },

    // Profil
    {
      href: "/tableau-de-bord/profil",
      label: "Mon profil",
      icon: User,
    },
  ],

  // ==========================================================
  // CLIENT
  // ==========================================================

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

    // Activité
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

    // Livraison
    {
      href: "/tableau-de-bord/livraisons",
      label: "Livraisons",
      icon: Truck,
    },

    // Finance
    {
      href: "/tableau-de-bord/paiements",
      label: "Paiements",
      icon: Wallet,
    },

    // Communication
    {
      href: "/tableau-de-bord/messages",
      label: "Messages",
      icon: MessageCircle,
    },

    {
      href: "/tableau-de-bord/favoris",
      label: "Favoris",
      icon: Heart,
    },

    // Profil
    {
      href: "/tableau-de-bord/profil",
      label: "Mon profil",
      icon: User,
    },
  ],

  // ==========================================================
  // ADMINISTRATEUR
  // ==========================================================

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

    // Administration
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