import type { Role } from "./types";

export interface LienNav {
  href: string;
  label: string;
}

/**
 * Liens affiches dans la navbar principale une fois l'utilisateur
 * authentifie. Volontairement courts (2-3 liens cles) : la navigation
 * exhaustive de chaque espace vit dans la sidebar du tableau de bord
 * (voir liensSidebarParRole plus bas).
 */
export const liensNavbarParRole: Record<Role, LienNav[]> = {
  etudiant: [
    { href: "/missions", label: "Missions" },
    { href: "/tableau-de-bord/mes-services", label: "Mes services" },
    { href: "/tableau-de-bord/candidatures", label: "Candidatures" },
  ],
  client: [
    { href: "/services", label: "Services" },
    { href: "/tableau-de-bord/mes-missions", label: "Mes missions" },
  ],
  admin: [
    { href: "/tableau-de-bord/admin", label: "Administration" },
  ],
};

/** Liens affiches quand personne n'est connecte. */
export const liensNavbarPublics: LienNav[] = [
  { href: "/missions", label: "Missions" },
  { href: "/services", label: "Services" },
];

/**
 * Navigation complete de la sidebar du tableau de bord, par role.
 * Reutilise par src/app/tableau-de-bord/layout.tsx.
 */
export const liensSidebarParRole: Record<Role, LienNav[]> = {
  etudiant: [
    { href: "/tableau-de-bord", label: "Vue d'ensemble" },
    { href: "/tableau-de-bord/profil", label: "Mon profil" },
    { href: "/tableau-de-bord/mes-services", label: "Mes services" },
    { href: "/tableau-de-bord/candidatures", label: "Mes candidatures" },
    { href: "/tableau-de-bord/messages", label: "Messages" },
  ],
  client: [
    { href: "/tableau-de-bord", label: "Vue d'ensemble" },
    { href: "/tableau-de-bord/profil", label: "Mon profil" },
    { href: "/tableau-de-bord/mes-missions", label: "Mes missions" },
    { href: "/tableau-de-bord/messages", label: "Messages" },
  ],
  admin: [
    { href: "/tableau-de-bord", label: "Vue d'ensemble" },
    { href: "/tableau-de-bord/admin", label: "Administration" },
  ],
};
