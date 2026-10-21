import type { LucideIcon } from "lucide-react";
import {
  FolderKanban,
  LayoutDashboard,
  MessageCircle,
  Newspaper,
  Settings,
  ShieldCheck,
  UsersRound,
  Wallet,
} from "lucide-react";

import type { Role } from "./types";

export interface SousLienNav {
  href: string;
  label: string;
}

export interface GroupeNav {
  label: string;
  href?: string;
  icon?: LucideIcon;
  liens?: SousLienNav[];
}

export const navigationParRole: Record<Role, GroupeNav[]> = {
  // Compte Google avant le choix du rôle
  a_definir: [],

  // ==========================================================
  // ÉTUDIANT
  // ==========================================================

  etudiant: [
    {
      label: "Tableau de bord",
      href: "/tableau-de-bord",
      icon: LayoutDashboard,
    },

    {
      label: "Publications",
      icon: Newspaper,
      liens: [
        {
          href: "/missions",
          label: "Missions",
        },
        {
          href: "/services",
          label: "Services",
        },
      ],
    },

    {
      label: "Mon activité",
      icon: FolderKanban,
      liens: [
        {
          href: "/tableau-de-bord/mes-publications",
          label: "Mes publications",
        },
        {
          href: "/tableau-de-bord/mes-services",
          label: "Mes services",
        },
        {
          href: "/tableau-de-bord/candidatures",
          label: "Mes candidatures",
        },
        {
          href: "/tableau-de-bord/demandes-service",
          label: "Demandes de service",
        },
        {
          href: "/tableau-de-bord/livraisons",
          label: "Livraisons",
        },
      ],
    },

    {
      label: "Finances",
      icon: Wallet,
      liens: [
        {
          href: "/tableau-de-bord/paiements",
          label: "Paiements",
        },
        {
          href: "/tableau-de-bord/factures",
          label: "Factures",
        },
      ],
    },

    {
      label: "Communication",
      icon: MessageCircle,
      liens: [
        {
          href: "/tableau-de-bord/messages",
          label: "Messages",
        },
        {
          href: "/tableau-de-bord/notifications",
          label: "Notifications",
        },
      ],
    },

    {
      label: "Communauté",
      icon: UsersRound,
      liens: [
        {
          href: "/tableau-de-bord/groupes",
          label: "Groupes",
        },
        {
          href: "/tableau-de-bord/amis",
          label: "Amis",
        },
        {
          href: "/tableau-de-bord/favoris",
          label: "Favoris",
        },
      ],
    },

    {
      label: "Paramètres",
      icon: Settings,
      liens: [
        {
          href: "/tableau-de-bord/parametres/paiements",
          label: "Moyens de paiement",
        },
        {
          href: "/tableau-de-bord/parametres/compte-google",
          label: "Compte Google",
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
      icon: LayoutDashboard,
    },

    {
      label: "Publications",
      icon: Newspaper,
      liens: [
        {
          href: "/missions",
          label: "Missions",
        },
        {
          href: "/services",
          label: "Services",
        },
      ],
    },

    {
      label: "Mon activité",
      icon: FolderKanban,
      liens: [
        {
          href: "/tableau-de-bord/mes-publications",
          label: "Mes publications",
        },
        {
          href: "/tableau-de-bord/mes-missions",
          label: "Mes missions",
        },
        {
          href: "/tableau-de-bord/demandes-service",
          label: "Demandes de service",
        },
        {
          href: "/tableau-de-bord/livraisons",
          label: "Livraisons",
        },
      ],
    },

    {
      label: "Finances",
      icon: Wallet,
      liens: [
        {
          href: "/tableau-de-bord/paiements",
          label: "Paiements",
        },
        {
          href: "/tableau-de-bord/factures",
          label: "Factures",
        },
      ],
    },

    {
      label: "Communication",
      icon: MessageCircle,
      liens: [
        {
          href: "/tableau-de-bord/messages",
          label: "Messages",
        },
        {
          href: "/tableau-de-bord/notifications",
          label: "Notifications",
        },
      ],
    },

    {
      label: "Communauté",
      icon: UsersRound,
      liens: [
        {
          href: "/tableau-de-bord/favoris",
          label: "Favoris",
        },
      ],
    },

    {
      label: "Paramètres",
      icon: Settings,
      liens: [
        {
          href: "/tableau-de-bord/parametres/moyens-paiement-client",
          label: "Moyens de paiement",
        },
        {
          href: "/tableau-de-bord/parametres/compte-google",
          label: "Compte Google",
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
      icon: LayoutDashboard,
    },

    {
      label: "Administration",
      icon: ShieldCheck,
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
      label: "Communication",
      icon: MessageCircle,
      liens: [
        {
          href: "/tableau-de-bord/messages",
          label: "Messages",
        },
        {
          href: "/tableau-de-bord/notifications",
          label: "Notifications",
        },
      ],
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
