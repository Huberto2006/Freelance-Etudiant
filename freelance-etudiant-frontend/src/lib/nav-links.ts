import type { LucideIcon } from "lucide-react";

import {
  Bell,
  Layers3,
  MessageCircle,
  Package,
  Settings,
  ShieldCheck,
  UsersRound,
  Wallet,
} from "lucide-react";

import type { Role } from "@/types/utilisateurs";

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
  a_definir: [],

  etudiant: [
    {
      label: "Tableau de bord",
      href: "/tableau-de-bord",
    },
    {
      label: "Mes publications",
      icon: Layers3,
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
      ],
    },
    {
      label: "Livraisons",
      href: "/tableau-de-bord/livraisons",
      icon: Package,
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
          href: "/tableau-de-bord/parametres/paiements",
          label: "Moyens de paiement",
        },
        {
          href: "/tableau-de-bord/parametres/compte-google",
          label: "Compte Google",
        },
        {
          href: "/tableau-de-bord/parametres/securite/sessions",
          label: "Sessions actives",
        },
        {
          href: "/tableau-de-bord/favoris",
          label: "Favoris",
        },
      ],
    },
  ],

  client: [
    {
      label: "Tableau de bord",
      href: "/tableau-de-bord",
    },
    {
      label: "Mes publications",
      icon: Layers3,
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
      ],
    },
    {
      label: "Livraisons",
      href: "/tableau-de-bord/livraisons",
      icon: Package,
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
        {
          href: "/tableau-de-bord/parametres/moyens-paiement-client",
          label: "Moyens de paiement",
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
          href: "/tableau-de-bord/parametres/compte-google",
          label: "Compte Google",
        },
        {
          href: "/tableau-de-bord/parametres/securite/sessions",
          label: "Sessions actives",
        },
        {
          href: "/tableau-de-bord/favoris",
          label: "Favoris",
        },
      ],
    },
  ],

  admin: [
    {
      label: "Tableau de bord",
      href: "/tableau-de-bord",
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
        {
          href: "/tableau-de-bord/parametres/securite/sessions",
          label: "Sessions actives",
        },
      ],
    },
  ],
};

export const profilEnPiedParRole: Record<Role, boolean> = {
  a_definir: false,
  etudiant: true,
  client: true,
  admin: false,
};
