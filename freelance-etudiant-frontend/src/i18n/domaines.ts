/**
 * Domaines fonctionnels des messages. Chaque domaine correspond à un fichier
 * messages/<langue>/<domaine>.json ; les trois langues doivent avoir les
 * mêmes fichiers et les mêmes clés (vérifié par `npm run i18n:check`).
 */
export const DOMAINES = [
  "common",
  "navigation",
  "home",
  "auth",
  "dashboard",
  "missions",
  "services",
  "applications",
  "deliveries",
  "payments",
  "reviews",
  "profile",
  "settings",
  "notifications",
  "forms",
  "validation",
  "errors",
  "footer",
  "catalog",
  "freelances",
  "publications",
  "comments",
  "friends",
  "groups",
  "messaging",
  "invoices",
  "admin",
  "onboarding",
  "about",
  "faq",
  "contact",
  "enums",
  "metadata",
  "manage",
  "chat",
  "deliveriesPage",
  "profilePage",
  "shell",
  "dashboardPages",
  "extras",
] as const;

export type Domaine = (typeof DOMAINES)[number];
