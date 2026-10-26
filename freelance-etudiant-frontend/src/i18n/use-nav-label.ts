"use client";

import { useTranslations } from "next-intl";

/**
 * Les données de navigation (src/lib/nav-links.ts, navigation-publique.ts)
 * gardent leurs libellés français comme identifiants stables (la Sidebar
 * s'en sert pour classer les éléments). Ce hook traduit uniquement
 * l'AFFICHAGE : un libellé inconnu est renvoyé tel quel.
 */
const CLES: Record<string, string> = {
  "Tableau de bord": "dashboard",
  Dashboard: "dashboard",
  Missions: "missions",
  Services: "services",
  Publications: "publications",
  Explorer: "explore",
  "Mes publications": "myPublications",
  "Mes services": "myServices",
  "Mes missions": "myMissions",
  "Mes candidatures": "myApplications",
  Candidatures: "applications",
  Groupes: "groups",
  Amis: "friends",
  "Demandes de service": "serviceRequests",
  Livraisons: "deliveries",
  "Mes livraisons": "deliveries",
  Paiements: "payments",
  "Mes paiements": "payments",
  Factures: "invoices",
  Notifications: "notifications",
  Messages: "messages",
  Paramètres: "settings",
  "Moyens de paiement": "paymentMethods",
  "Compte Google": "googleAccount",
  Favoris: "favorites",
  Administration: "administration",
  Gestion: "management",
  Signalements: "reports",
  "Mon profil": "myProfile",
  Profil: "myProfile",
  Évaluations: "reviews",
  Evaluations: "reviews",
  "Mes évaluations": "reviews",
  Accueil: "home",
  "À propos": "about",
  "Toutes les publications": "allPublications",
  "Découvrir les freelances": "discoverFreelances",
  "Centre d'aide": "helpCenter",
  FAQ: "faq",
  "Contact et assistance": "contactSupport",
  Freelances: "freelances",
  Connexion: "login",
  "Rejoindre Kianja": "joinKianja",
};

const DESCRIPTIONS: Record<string, string> = {
  "Missions et services au même endroit": "allPublications",
  "Compétences et profils publics": "discoverFreelances",
  "Réponses aux questions fréquentes": "faq",
  "Besoin d'aide ? Contacte-nous": "contactSupport",
};

export function useNavLabel() {
  const t = useTranslations("navigation");
  const lire = (groupe: string, table: Record<string, string>) =>
    (texte: string) => {
      const cle = table[texte];
      if (!cle) return texte;
      const chemin = `${groupe}.${cle}`;
      return t.has(chemin as never) ? t(chemin as never) : texte;
    };
  return {
    label: lire("labels", CLES),
    description: lire("descriptions", DESCRIPTIONS),
  };
}
