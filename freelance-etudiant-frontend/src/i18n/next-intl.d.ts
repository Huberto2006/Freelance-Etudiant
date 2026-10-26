import type { Locale } from "./config";

/**
 * Typage des clés de traduction : le français (messages/fr) est la référence.
 * `t("cle.inexistante")` ne compile pas, ce qui évite les clés manquantes.
 * Pour une clé construite dynamiquement, utiliser `t.has(cle)` puis un cast
 * explicite, voir docs/i18n.md.
 */
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: {
    common: typeof import("../../messages/fr/common.json");
    navigation: typeof import("../../messages/fr/navigation.json");
    home: typeof import("../../messages/fr/home.json");
    auth: typeof import("../../messages/fr/auth.json");
    dashboard: typeof import("../../messages/fr/dashboard.json");
    missions: typeof import("../../messages/fr/missions.json");
    services: typeof import("../../messages/fr/services.json");
    applications: typeof import("../../messages/fr/applications.json");
    deliveries: typeof import("../../messages/fr/deliveries.json");
    payments: typeof import("../../messages/fr/payments.json");
    reviews: typeof import("../../messages/fr/reviews.json");
    profile: typeof import("../../messages/fr/profile.json");
    settings: typeof import("../../messages/fr/settings.json");
    notifications: typeof import("../../messages/fr/notifications.json");
    forms: typeof import("../../messages/fr/forms.json");
    validation: typeof import("../../messages/fr/validation.json");
    errors: typeof import("../../messages/fr/errors.json");
    footer: typeof import("../../messages/fr/footer.json");
    catalog: typeof import("../../messages/fr/catalog.json");
    freelances: typeof import("../../messages/fr/freelances.json");
    publications: typeof import("../../messages/fr/publications.json");
    comments: typeof import("../../messages/fr/comments.json");
    friends: typeof import("../../messages/fr/friends.json");
    groups: typeof import("../../messages/fr/groups.json");
    messaging: typeof import("../../messages/fr/messaging.json");
    invoices: typeof import("../../messages/fr/invoices.json");
    admin: typeof import("../../messages/fr/admin.json");
    onboarding: typeof import("../../messages/fr/onboarding.json");
    about: typeof import("../../messages/fr/about.json");
    faq: typeof import("../../messages/fr/faq.json");
    contact: typeof import("../../messages/fr/contact.json");
    enums: typeof import("../../messages/fr/enums.json");
    metadata: typeof import("../../messages/fr/metadata.json");
    manage: typeof import("../../messages/fr/manage.json");
    chat: typeof import("../../messages/fr/chat.json");
    deliveriesPage: typeof import("../../messages/fr/deliveriesPage.json");
    profilePage: typeof import("../../messages/fr/profilePage.json");
    shell: typeof import("../../messages/fr/shell.json");
    dashboardPages: typeof import("../../messages/fr/dashboardPages.json");
    extras: typeof import("../../messages/fr/extras.json");
    };
  }
}

export {};
