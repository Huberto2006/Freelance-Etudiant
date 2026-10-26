import {
  AlertTriangle,
  ClipboardList,
  MessageCircle,
  Package,
  Plus,
  Wallet,
} from "lucide-react";

import type {
  Candidature,
  Livraison,
  NotificationItem,
  Transaction,
} from "./types";
import type { ActionUrgente, Traducteur } from "./dashboard";

const TROIS_JOURS_EN_MS = 3 * 24 * 60 * 60 * 1000;

/** Échéance de livraison déduite de la candidature (date + délai proposé). */
function echeanceLivraison(candidature: Candidature): Date | null {
  if (!candidature.delaiPropose) return null;
  const depart = new Date(candidature.dateCandidature).getTime();
  if (!Number.isFinite(depart)) return null;
  return new Date(depart + candidature.delaiPropose * 24 * 60 * 60 * 1000);
}

// ============================================================
// ÉTUDIANT — « À FAIRE MAINTENANT »
// ============================================================

/**
 * Construit les actions prioritaires de l'étudiant à partir de données
 * réelles : corrections demandées, livraisons à déposer, messages non
 * lus, candidatures acceptées. Rien n'est inventé.
 */
export function construireActionsEtudiant(params: {
  candidatures: Candidature[];
  livraisons: Livraison[];
  notifications: NotificationItem[];
  t: Traducteur;
  /** Date formatée selon la langue de l'interface. */
  formatDate: (date: string) => string;
}): ActionUrgente[] {
  const { candidatures, livraisons, notifications, t, formatDate } = params;
  const actions: ActionUrgente[] = [];
  const maintenant = Date.now();

  // 1. Corrections demandées par le client — priorité maximale.
  livraisons
    .filter((livraison) => livraison.statut === "correction_demandee")
    .slice(0, 2)
    .forEach((livraison) => {
      const titre =
        livraison.candidature?.mission?.titre ?? t("actions.yourMission");
      actions.push({
        id: `correction-${livraison.id}`,
        priorite: 10,
        icone: AlertTriangle,
        ton: "brique",
        titre: t("actions.correctionTitle"),
        description: t("actions.correctionDescription", { titre }),
        libelleAction: t("actions.correctionAction"),
        href: `/tableau-de-bord/livraisons?candidature=${encodeURIComponent(
          livraison.candidatureId,
        )}&role=etudiant`,
      });
    });

  // 2. Livraisons à déposer : candidatures acceptées sans livraison.
  const candidaturesLivrees = new Set(
    livraisons.map((livraison) => livraison.candidatureId),
  );
  let depotsAffiches = 0;
  for (const candidature of candidatures) {
    if (depotsAffiches >= 2) break;
    if (candidature.statut !== "acceptee") continue;
    if (candidaturesLivrees.has(candidature.id)) continue;
    const mission = candidature.mission;
    if (!mission) continue;

    const echeance = echeanceLivraison(candidature);
    const urgence =
      echeance !== null && echeance.getTime() - maintenant < TROIS_JOURS_EN_MS;

    depotsAffiches += 1;
    actions.push({
      id: `livraison-${candidature.id}`,
      priorite: urgence ? 20 : 30,
      icone: Package,
      ton: urgence ? "brique" : "ocre",
      titre: urgence ? t("actions.urgentDelivery") : t("actions.deliveryToSubmit"),
      description: echeance
        ? t("actions.deliveryDue", {
            titre: mission.titre,
            date: formatDate(echeance.toISOString()),
          })
        : t("actions.applicationAccepted", { titre: mission.titre }),
      libelleAction: candidature.livraison
        ? t("actions.viewDelivery")
        : t("actions.submitDelivery"),
      href: `/tableau-de-bord/livraisons?candidature=${encodeURIComponent(
        candidature.id,
      )}&role=etudiant`,
    });
  }

  // 3. Nouveau message non lu.
  const notifMessage = notifications.find(
    (notification) =>
      !notification.estLue && notification.type === "nouveau_message",
  );
  if (notifMessage) {
    actions.push({
      id: `message-${notifMessage.id}`,
      priorite: 35,
      icone: MessageCircle,
      ton: "rice",
      titre: t("actions.newMessage"),
      description: notifMessage.message,
      libelleAction: t("actions.reply"),
      href: notifMessage.lienUrl ?? "/tableau-de-bord/messages",
    });
  }

  // 4. Candidature acceptée récente : lancer la collaboration.
  const notifAcceptee = notifications.find(
    (notification) =>
      !notification.estLue && notification.type === "candidature_acceptee",
  );
  if (notifAcceptee) {
    actions.push({
      id: `acceptee-${notifAcceptee.id}`,
      priorite: 40,
      icone: MessageCircle,
      ton: "rice",
      titre: t("actions.applicationAcceptedTitle"),
      description: notifAcceptee.message,
      libelleAction: t("actions.openConversation"),
      href: notifAcceptee.lienUrl ?? "/tableau-de-bord/messages",
    });
  }

  // 5. Livraison en attente de validation client — suivi informatif.
  const enAttenteValidation = livraisons.find(
    (livraison) => livraison.statut === "en_attente",
  );
  if (enAttenteValidation) {
    actions.push({
      id: `suivi-${enAttenteValidation.id}`,
      priorite: 50,
      icone: Package,
      ton: "ink",
      titre: t("actions.deliveryAwaitingTitle"),
      description: t("actions.deliveryAwaitingDescription", {
        titre:
          enAttenteValidation.candidature?.mission?.titre ??
          t("actions.yourMission"),
      }),
      libelleAction: t("actions.trackDelivery"),
      href: `/tableau-de-bord/livraisons?candidature=${encodeURIComponent(
        enAttenteValidation.candidatureId,
      )}&role=etudiant`,
    });
  }

  return actions.sort((a, b) => a.priorite - b.priorite).slice(0, 4);
}

// ============================================================
// CLIENT — « ACTIONS RAPIDES »
// ============================================================

/** Raccourcis de navigation propres au pilotage côté client. */
export function construireActionsRapidesClient(t: Traducteur): ActionUrgente[] {
  return [
    {
      id: "publier-mission",
      priorite: 1,
      icone: Plus,
      ton: "ocre",
      titre: t("quick.publishTitle"),
      description: t("quick.publishDescription"),
      libelleAction: t("quick.publishAction"),
      href: "/tableau-de-bord/mes-missions",
    },
    {
      id: "voir-candidatures",
      priorite: 2,
      icone: ClipboardList,
      ton: "rice",
      titre: t("quick.applicationsTitle"),
      description: t("quick.applicationsDescription"),
      libelleAction: t("quick.applicationsAction"),
      href: "/tableau-de-bord/mes-missions",
    },
    {
      id: "voir-livraisons",
      priorite: 3,
      icone: Package,
      ton: "ink",
      titre: t("quick.deliveriesTitle"),
      description: t("quick.deliveriesDescription"),
      libelleAction: t("quick.open"),
      href: "/tableau-de-bord/livraisons",
    },
    {
      id: "gerer-paiements",
      priorite: 4,
      icone: Wallet,
      ton: "brique",
      titre: t("quick.paymentsTitle"),
      description: t("quick.paymentsDescription"),
      libelleAction: t("quick.open"),
      href: "/tableau-de-bord/paiements",
    },
  ];
}

// ============================================================
// CLIENT — « À FAIRE MAINTENANT »
// ============================================================

/**
 * Actions prioritaires côté client : livraisons à examiner, paiements à
 * déclarer pour les candidatures acceptées, candidatures en attente.
 */
export function construireActionsClient(params: {
  candidatures: Candidature[];
  livraisons: Livraison[];
  paiements: Transaction[];
  t: Traducteur;
}): ActionUrgente[] {
  const { candidatures, livraisons, paiements, t } = params;
  const actions: ActionUrgente[] = [];

  // 1. Livraisons en attente de validation.
  livraisons
    .filter((livraison) => livraison.statut === "en_attente")
    .slice(0, 2)
    .forEach((livraison) => {
      const etudiant =
        livraison.candidature?.etudiant?.utilisateur?.nom ??
        t("actions.theStudent");
      actions.push({
        id: `examen-livraison-${livraison.id}`,
        priorite: 10,
        icone: Package,
        ton: "brique",
        titre: t("actions.reviewTitle"),
        description: t("actions.reviewDescription", {
          etudiant,
          titre:
            livraison.candidature?.mission?.titre ?? t("actions.yourMission"),
        }),
        libelleAction: t("actions.review"),
        href: `/tableau-de-bord/livraisons?candidature=${encodeURIComponent(
          livraison.candidatureId,
        )}&role=client`,
      });
    });

  // 2. Paiements à déclarer : candidatures acceptées sans transaction.
  const candidaturesPayees = new Set(
    paiements.map((paiement) => paiement.candidatureId),
  );
  candidatures
    .filter(
      (candidature) =>
        candidature.statut === "acceptee" &&
        !candidaturesPayees.has(candidature.id),
    )
    .slice(0, 2)
    .forEach((candidature) => {
      actions.push({
        id: `paiement-${candidature.id}`,
        priorite: 20,
        icone: Wallet,
        ton: "ocre",
        titre: t("actions.paymentTitle"),
        description: t("actions.paymentDescription", {
          titre: candidature.mission?.titre ?? t("actions.ongoing"),
        }),
        libelleAction: t("actions.declarePayment"),
        href: "/tableau-de-bord/paiements",
      });
    });

  // 3. Candidatures en attente d'examen.
  const enAttente = candidatures.filter(
    (candidature) => candidature.statut === "en_attente",
  );
  if (enAttente.length > 0) {
    actions.push({
      id: "candidatures-a-examiner",
      priorite: 30,
      icone: ClipboardList,
      ton: "rice",
      titre: t("actions.applicationsTitle"),
      description: t("actions.applicationsDescription", {
        count: enAttente.length,
      }),
      libelleAction: t("actions.viewApplications"),
      href: "/tableau-de-bord/mes-missions",
    });
  }

  return actions.sort((a, b) => a.priorite - b.priorite).slice(0, 4);
}
