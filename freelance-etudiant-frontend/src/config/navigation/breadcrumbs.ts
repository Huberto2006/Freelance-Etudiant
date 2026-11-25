import type { Role } from "@/types/utilisateurs";

export interface BreadcrumbItem {
  /** Libellé affiché dans le fil d'Ariane */
  label: string;
  /** Destination du lien (absent pour le dernier élément actif) */
  href?: string;
  /** Action personnalisée (utile pour les vues d'état dans une même page) */
  onClick?: () => void;
  /** Indique si le libellé a été résolu dynamiquement */
  dynamic?: boolean;
}

export interface RouteBreadcrumbNode {
  /** Titre par défaut (identifiant canonique traduit par useNavLabel) */
  label: string;
  /** URL de la page parente ou fonction résolvant le parent */
  parent?: string | ((role?: Role) => string | undefined);
  /** Libellé spécifique selon le rôle de l'utilisateur */
  roleLabels?: Partial<Record<Role, string>>;
  /** Parent spécifique selon le rôle de l'utilisateur */
  roleParents?: Partial<Record<Role, string>>;
  /** Indique que la page affiche un titre dynamique (titre de mission, de groupe, etc.) */
  dynamic?: boolean;
}

/**
 * Registre centralisé des routes de Kianja et de leurs relations hiérarchiques.
 * Adapté aux trois rôles (Étudiant, Client, Administrateur).
 */
export const BREADCRUMB_ROUTES: Record<string, RouteBreadcrumbNode> = {
  // ============================================================
  // RACINE & PAGES PUBLIQUES
  // ============================================================
  "/": {
    label: "Accueil",
  },
  "/missions": {
    label: "Missions",
    parent: "/",
  },
  "/missions/[id]": {
    label: "Détail de la mission",
    parent: "/missions",
    dynamic: true,
  },
  "/services": {
    label: "Services",
    parent: "/",
  },
  "/services/[id]": {
    label: "Détail du service",
    parent: "/services",
    dynamic: true,
  },
  "/freelances": {
    label: "Freelances",
    parent: "/",
  },
  "/etudiants/[id]": {
    label: "Profil freelance",
    parent: "/freelances",
    dynamic: true,
  },
  "/clients/[id]": {
    label: "Profil client",
    parent: "/missions",
    dynamic: true,
  },
  "/publications": {
    label: "Publications",
    parent: "/",
  },
  "/a-propos": {
    label: "À propos",
    parent: "/",
  },
  "/faq": {
    label: "FAQ",
    parent: "/",
  },
  "/contact": {
    label: "Contact",
    parent: "/",
  },

  // ============================================================
  // TABLEAU DE BORD (ESPACE CONNECTÉ)
  // ============================================================
  "/tableau-de-bord": {
    label: "Tableau de bord",
  },
  "/tableau-de-bord/notifications": {
    label: "Notifications",
    parent: "/tableau-de-bord",
  },
  "/tableau-de-bord/messages": {
    label: "Messages",
    parent: "/tableau-de-bord",
    dynamic: true,
  },
  "/tableau-de-bord/favoris": {
    label: "Favoris",
    parent: "/tableau-de-bord",
  },
  "/tableau-de-bord/profil": {
    label: "Mon profil",
    parent: "/tableau-de-bord",
  },

  // --- Publications & Activités ---
  "/tableau-de-bord/mes-publications": {
    label: "Mes publications",
    parent: "/tableau-de-bord",
  },
  "/tableau-de-bord/mes-missions": {
    label: "Mes missions",
    parent: "/tableau-de-bord/mes-publications",
  },
  "/tableau-de-bord/mes-services": {
    label: "Mes services",
    parent: "/tableau-de-bord/mes-publications",
  },
  "/tableau-de-bord/candidatures": {
    label: "Mes candidatures",
    roleLabels: {
      etudiant: "Mes candidatures",
      client: "Candidatures reçues",
    },
    parent: "/tableau-de-bord/mes-publications",
  },
  "/tableau-de-bord/demandes-service": {
    label: "Demandes de service",
    parent: "/tableau-de-bord/mes-publications",
  },
  "/tableau-de-bord/livraisons": {
    label: "Livraisons",
    parent: "/tableau-de-bord",
    dynamic: true,
  },

  // --- Communauté ---
  "/tableau-de-bord/groupes": {
    label: "Groupes",
    parent: "/tableau-de-bord",
  },
  "/tableau-de-bord/groupes/[id]": {
    label: "Détail du groupe",
    parent: "/tableau-de-bord/groupes",
    dynamic: true,
  },
  "/tableau-de-bord/groupes/invitations/[id]": {
    label: "Invitation",
    parent: "/tableau-de-bord/notifications",
    dynamic: true,
  },
  "/tableau-de-bord/amis": {
    label: "Amis",
    parent: "/tableau-de-bord",
  },

  // --- Finances ---
  "/tableau-de-bord/paiements": {
    label: "Paiements",
    parent: "/tableau-de-bord",
  },
  "/tableau-de-bord/factures": {
    label: "Factures",
    parent: "/tableau-de-bord",
  },
  "/tableau-de-bord/paiements/[id]/facture": {
    label: "Facture",
    parent: "/tableau-de-bord/factures",
    dynamic: true,
  },

  // --- Paramètres ---
  "/tableau-de-bord/parametres/compte-google": {
    label: "Compte Google",
    parent: "/tableau-de-bord",
  },
  "/tableau-de-bord/parametres/securite/sessions": {
    label: "Sessions actives",
    parent: "/tableau-de-bord",
  },
  "/tableau-de-bord/parametres/paiements": {
    label: "Moyens de paiement",
    parent: "/tableau-de-bord",
  },
  "/tableau-de-bord/parametres/moyens-paiement-client": {
    label: "Moyens de paiement",
    parent: "/tableau-de-bord",
  },

  // --- Administration ---
  "/tableau-de-bord/admin": {
    label: "Gestion",
    parent: "/tableau-de-bord",
  },
  "/tableau-de-bord/admin/signalements": {
    label: "Signalements",
    parent: "/tableau-de-bord/admin",
  },
  "/tableau-de-bord/admin/paiements": {
    label: "Paiements",
    parent: "/tableau-de-bord/admin",
  },
};

/**
 * Motifs de routes dynamiques ordonnés du plus spécifique au plus général.
 */
const MOTIFS_DYNAMIQUES: Array<{ pattern: RegExp; routeKey: string }> = [
  {
    pattern: /^\/tableau-de-bord\/groupes\/invitations\/[^/]+$/,
    routeKey: "/tableau-de-bord/groupes/invitations/[id]",
  },
  {
    pattern: /^\/tableau-de-bord\/groupes\/[^/]+$/,
    routeKey: "/tableau-de-bord/groupes/[id]",
  },
  {
    pattern: /^\/tableau-de-bord\/paiements\/[^/]+\/facture$/,
    routeKey: "/tableau-de-bord/paiements/[id]/facture",
  },
  {
    pattern: /^\/missions\/[^/]+$/,
    routeKey: "/missions/[id]",
  },
  {
    pattern: /^\/services\/[^/]+$/,
    routeKey: "/services/[id]",
  },
  {
    pattern: /^\/etudiants\/[^/]+$/,
    routeKey: "/etudiants/[id]",
  },
  {
    pattern: /^\/clients\/[^/]+$/,
    routeKey: "/clients/[id]",
  },
];

/**
 * Résout la clé de route correspondante pour un chemin donné (statique ou dynamique).
 */
export function resoudreCleRoute(pathname: string): string | undefined {
  if (BREADCRUMB_ROUTES[pathname]) {
    return pathname;
  }
  for (const { pattern, routeKey } of MOTIFS_DYNAMIQUES) {
    if (pattern.test(pathname)) {
      return routeKey;
    }
  }
  return undefined;
}

/**
 * Construit la hiérarchie complète du fil d'Ariane de la racine jusqu'à la feuille.
 * Le dernier élément représente la page courante (sans href).
 */
export function construireFilAriane({
  pathname,
  role,
  dynamicTitle,
}: {
  pathname: string;
  role?: Role;
  dynamicTitle?: string | null;
}): BreadcrumbItem[] {
  // Routes sans fil d'Ariane nécessaire
  if (
    pathname === "/" ||
    pathname.startsWith("/connexion") ||
    pathname.startsWith("/inscription") ||
    pathname.startsWith("/mot-de-passe-oublie") ||
    pathname.startsWith("/reinitialiser-mot-de-passe") ||
    pathname.startsWith("/verification-email") ||
    pathname.startsWith("/choix-role") ||
    pathname.startsWith("/completer-profil")
  ) {
    return [];
  }

  const cleInitiale = resoudreCleRoute(pathname);
  if (!cleInitiale) {
    return [];
  }

  const itemsInverses: BreadcrumbItem[] = [];
  let cleCourante: string | undefined = cleInitiale;
  let estFeuille = true;

  // Remonte la chaîne parentale
  const visites = new Set<string>();

  while (cleCourante && !visites.has(cleCourante)) {
    visites.add(cleCourante);
    const config: RouteBreadcrumbNode | undefined = BREADCRUMB_ROUTES[cleCourante];
    if (!config) break;

    let label =
      (role && config.roleLabels?.[role]) || config.label;

    if (estFeuille && dynamicTitle && config.dynamic) {
      label = dynamicTitle;
    }

    if (estFeuille) {
      // La page courante n'est jamais cliquable
      itemsInverses.push({
        label,
        dynamic: config.dynamic,
      });
      estFeuille = false;
    } else {
      itemsInverses.push({
        label,
        href: cleCourante,
      });
    }

    // Détermine le parent suivant
    let parentKey: string | undefined;
    if (role && config.roleParents?.[role]) {
      parentKey = config.roleParents[role];
    } else if (typeof config.parent === "function") {
      parentKey = config.parent(role);
    } else {
      parentKey = config.parent;
    }

    cleCourante = parentKey;
  }

  return itemsInverses.reverse();
}
