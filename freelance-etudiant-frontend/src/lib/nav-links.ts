import type { LucideIcon } from "lucide-react";
import {
  Bell,
  MessageCircle,
  Settings,
} from "lucide-react";

import type { Role } from "./types";

export interface SousLienNav {
  href: string;
  label: string;
}

export interface GroupeNav {
  label: string;
  href?: string;

  // Icône uniquement pour les éléments globaux
  icon?: LucideIcon;

  // Sous-liens pour les menus déroulants
  liens?: SousLienNav[];
}

export const navigationParRole: Record<Role, GroupeNav[]> = {
  // ==========================================================
  // ÉTUDIANT
  // ==========================================================
  etudiant: [
    {
      label: "Tableau de bord",
      href: "/tableau-de-bord",
    },
    {
      label: "Missions",
      href: "/missions",
    },
    {
      label: "Services",
      href: "/services",
    },
    {
      label: "Livraisons",
      href: "/tableau-de-bord/livraisons",
    },
    {
      label: "Notifications",
      href: "/tableau-de-bord/notifications",
      icon: Bell,
    },
    {
      label: "Messages",
      href: "/tableau-de-bord/messages",
      icon: MessageCircle,
    },
    {
      label: "Paramètres",
      icon: Settings,
      liens: [
        {
          href: "/tableau-de-bord/paiements",
          label: "Paiements",
        },
        {
          href: "/tableau-de-bord/favoris",
          label: "Favoris",
        },
      ],
    },
  ],

  // ==========================================================
  // CLIENT
  // ==========================================================
  client: [
    {
      label: "Tableau de bord",
      href: "/tableau-de-bord",
    },
    {
      label: "Missions",
      href: "/missions",
    },
    {
      label: "Services",
      href: "/services",
    },
    {
      label: "Livraisons",
      href: "/tableau-de-bord/livraisons",
    },
    {
      label: "Notifications",
      href: "/tableau-de-bord/notifications",
      icon: Bell,
    },
    {
      label: "Messages",
      href: "/tableau-de-bord/messages",
      icon: MessageCircle,
    },
    {
      label: "Paramètres",
      icon: Settings,
      liens: [
        {
          href: "/tableau-de-bord/paiements",
          label: "Paiements",
        },
        {
          href: "/tableau-de-bord/favoris",
          label: "Favoris",
        },
      ],
    },
  ],

  // ==========================================================
  // ADMINISTRATEUR
  // ==========================================================
  admin: [
    {
      label: "Tableau de bord",
      href: "/tableau-de-bord",
    },
    {
      label: "Administration",
      liens: [
        {
          href: "/tableau-de-bord/admin",
          label: "Gestion",
        },
        {
          href: "/tableau-de-bord/admin/signalements",
          label: "Signalements",
        },
        {
          href: "/tableau-de-bord/admin/paiements",
          label: "Paiements",
        },
      ],
    },
    {
      label: "Notifications",
      href: "/tableau-de-bord/notifications",
      icon: Bell,
    },
    {
      label: "Messages",
      href: "/tableau-de-bord/messages",
      icon: MessageCircle,
    },
    {
      label: "Paramètres",
      icon: Settings,
      liens: [
        {
          href: "/tableau-de-bord/profil",
          label: "Mon profil",
        },
      ],
    },
  ],
};