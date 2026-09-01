import {
  AlertTriangle,
  ClipboardList,
  MessageCircle,
  Package,
  Plus,
  Wallet,
} from "lucide-react";

import { formatDate } from "./format";
import type {
  Candidature,
  Livraison,
  NotificationItem,
  Transaction,
} from "./types";
import type { ActionUrgente } from "./dashboard";

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
}): ActionUrgente[] {
  const { candidatures, livraisons, notifications } = params;
  const actions: ActionUrgente[] = [];
  const maintenant = Date.now();

  // 1. Corrections demandées par le client — priorité maximale.
  livraisons
    .filter((livraison) => livraison.statut === "correction_demandee")
    .slice(0, 2)
    .forEach((livraison) => {
      const titre =
        livraison.candidature?.mission?.titre ?? "votre mission";
      actions.push({
        id: `correction-${livraison.id}`,
        priorite: 10,
        icone: AlertTriangle,
        ton: "brique",
        titre: "Correction demandée",
        description: `Le client attend une nouvelle version de votre livraison pour « ${titre} ».`,
        libelleAction: "Corriger ma livraison",
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
      titre: urgence ? "Livraison urgente" : "Livraison à déposer",
      description: echeance
        ? `Mission « ${mission.titre} » — échéance : ${formatDate(
            echeance.toISOString(),
          )}.`
        : `Votre candidature pour « ${mission.titre} » a été acceptée.`,
      libelleAction: candidature.livraison
        ? "Voir la livraison"
        : "Déposer ma livraison",
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
      titre: "Nouveau message",
      description: notifMessage.message,
      libelleAction: "Répondre",
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
      titre: "Candidature acceptée 🎉",
      description: notifAcceptee.message,
      libelleAction: "Ouvrir la conversation",
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
      titre: "Livraison en attente de validation",
      description: `Votre travail pour « ${
        enAttenteValidation.candidature?.mission?.titre ?? "votre mission"
      } » est entre les mains du client.`,
      libelleAction: "Suivre ma livraison",
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
export function construireActionsRapidesClient(): ActionUrgente[] {
  return [
    {
      id: "publier-mission",
      priorite: 1,
      icone: Plus,
      ton: "ocre",
      titre: "Publier une mission",
      description: "Décrivez votre besoin et recevez des candidatures.",
      libelleAction: "Publier",
      href: "/tableau-de-bord/mes-missions",
    },
    {
      id: "voir-candidatures",
      priorite: 2,
      icone: ClipboardList,
      ton: "rice",
      titre: "Voir les candidatures",
      description: "Répondez aux étudiants qui postulent.",
      libelleAction: "Consulter",
      href: "/tableau-de-bord/mes-missions",
    },
    {
      id: "voir-livraisons",
      priorite: 3,
      icone: Package,
      ton: "ink",
      titre: "Voir les livraisons",
      description: "Validez ou demandez des corrections.",
      libelleAction: "Ouvrir",
      href: "/tableau-de-bord/livraisons",
    },
    {
      id: "gerer-paiements",
      priorite: 4,
      icone: Wallet,
      ton: "brique",
      titre: "Gérer les paiements",
      description: "Déclarez et suivez vos paiements.",
      libelleAction: "Ouvrir",
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
}): ActionUrgente[] {
  const { candidatures, livraisons, paiements } = params;
  const actions: ActionUrgente[] = [];

  // 1. Livraisons en attente de validation.
  livraisons
    .filter((livraison) => livraison.statut === "en_attente")
    .slice(0, 2)
    .forEach((livraison) => {
      const etudiant =
        livraison.candidature?.etudiant?.utilisateur?.nom ?? "l'étudiant";
      actions.push({
        id: `examen-livraison-${livraison.id}`,
        priorite: 10,
        icone: Package,
        ton: "brique",
        titre: "Livraison à examiner",
        description: `${etudiant} a déposé son travail pour « ${
          livraison.candidature?.mission?.titre ?? "votre mission"
        } ».`,
        libelleAction: "Examiner",
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
        titre: "Paiement à déclarer",
        description: `La mission « ${
          candidature.mission?.titre ?? "en cours"
        } » attend le paiement de l'étudiant.`,
        libelleAction: "Déclarer le paiement",
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
      titre: "Candidatures à examiner",
      description: `${enAttente.length} candidature(s) attendent votre réponse.`,
      libelleAction: "Voir les candidatures",
      href: "/tableau-de-bord/mes-missions",
    });
  }

  return actions.sort((a, b) => a.priorite - b.priorite).slice(0, 4);
}
