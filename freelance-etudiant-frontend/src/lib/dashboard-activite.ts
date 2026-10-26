import type {
  Candidature,
  Livraison,
  Mission,
  NotificationItem,
  Signalement,
  Transaction,
} from "./types";
import { versNombre } from "./dashboard";
import type {
  EvenementActivite,
  ProjetActif,
  Ton,
  Traducteur,
} from "./dashboard";

// ============================================================
// ACTIVITÉ — ISSUE DES NOTIFICATIONS (journal réel des événements)
// ============================================================

const LIBELLES_PAR_TYPE: Record<NotificationItem["type"], { ton: Ton }> = {
  nouvelle_invitation_groupe: { ton: "ocre" },
  nouvelle_candidature: { ton: "ocre" },
  candidature_acceptee: { ton: "rice" },
  candidature_refusee: { ton: "brique" },
  nouveau_message: { ton: "ink" },
  livraison_deposee: { ton: "ocre" },
  livraison_validee: { ton: "rice" },
  correction_demandee: { ton: "brique" },
  nouvelle_evaluation: { ton: "ocre" },
  nouveau_commentaire: { ton: "ink" },
  paiement_initie: { ton: "ink" },
  paiement_confirme: { ton: "rice" },
  paiement_libere: { ton: "rice" },
  paiement_echoue: { ton: "brique" },
  nouvelle_reaction: { ton: "ink" },
  mention: { ton: "ocre" },
  mission_expiree: { ton: "brique" },
};

/**
 * Transforme les notifications réelles de l'utilisateur en timeline
 * d'activité (candidature acceptée/refusée, livraison validée,
 * paiement reçu, évaluation reçue, message…).
 */
export function activiteDepuisNotifications(
  notifications: NotificationItem[],
  t: Traducteur,
  max = 8,
): EvenementActivite[] {
  return notifications
    .slice()
    .sort(
      (a, b) =>
        new Date(b.dateCreation).getTime() -
        new Date(a.dateCreation).getTime(),
    )
    .slice(0, max)
    .map((notification) => ({
      id: notification.id,
      ton: LIBELLES_PAR_TYPE[notification.type]?.ton ?? "ink",
      titre: LIBELLES_PAR_TYPE[notification.type]
        ? t(`activity.type.${notification.type}`)
        : notification.titre,
      detail: notification.message,
      date: notification.dateCreation,
      href: notification.lienUrl ?? undefined,
    }));
}

// ============================================================
// ADMIN — ACTIVITÉ PLATEFORME (signalements + paiements réels)
// ============================================================

export function activitePlateformeAdmin(params: {
  signalements: Signalement[];
  paiements: Transaction[];
  t: Traducteur;
  /** Libellé traduit du statut d'une transaction. */
  libelleStatutTransaction: (statut: string) => string;
  /** Nombre formaté selon la langue de l'interface. */
  formatNombre: (valeur: number) => string;
  max?: number;
}): EvenementActivite[] {
  const {
    signalements,
    paiements,
    t,
    libelleStatutTransaction,
    formatNombre,
    max = 8,
  } = params;

  const evenementsSignalements: EvenementActivite[] = signalements.map(
    (signalement) => ({
      id: `signalement-${signalement.id}`,
      ton: signalement.statut === "traite" ? "rice" : "brique",
      titre:
        signalement.statut === "traite"
          ? t("activity.reportHandled")
          : t("activity.reportNew"),
      detail: signalement.motif,
      date: signalement.dateSignalement,
      href: "/tableau-de-bord/admin/signalements",
    }),
  );

  const evenementsPaiements: EvenementActivite[] = paiements.map(
    (paiement) => ({
      id: `paiement-${paiement.id}`,
      ton: paiement.statut === "annulee" ? "brique" : "rice",
      titre: libelleStatutTransaction(paiement.statut),
      detail: `${formatNombre(versNombre(paiement.montant))} Ar · ${
        paiement.candidature?.mission?.titre ?? t("activity.missionFallback")
      }`,
      date: paiement.dateCreation,
      href: "/tableau-de-bord/admin/paiements",
    }),
  );

  return [...evenementsSignalements, ...evenementsPaiements]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, max);
}

// ============================================================
// PROJETS ACTIFS
// ============================================================

/** Projets en cours côté étudiant : candidatures acceptées actives. */
export function construireProjetsEtudiant(params: {
  candidatures: Candidature[];
  livraisons: Livraison[];
  t: Traducteur;
}): ProjetActif[] {
  const { candidatures, livraisons, t } = params;
  const livraisonParCandidature = new Map(
    livraisons.map((livraison) => [livraison.candidatureId, livraison]),
  );

  return candidatures
    .filter((candidature) => candidature.statut === "acceptee")
    .filter((candidature) => candidature.mission?.statut !== "terminee")
    .map((candidature) => {
      const mission = candidature.mission;
      const livraison = livraisonParCandidature.get(candidature.id);

      const statutLabel = livraison
        ? livraison.statut === "en_attente"
          ? t("projects.awaitingValidation")
          : livraison.statut === "correction_demandee"
            ? t("projects.correctionRequested")
            : t("projects.validated")
        : t("projects.toDeliver");
      const statutTon: Ton = livraison
        ? livraison.statut === "en_attente"
          ? "ocre"
          : livraison.statut === "correction_demandee"
            ? "brique"
            : "rice"
        : "brique";

      return {
        id: candidature.id,
        titre: mission?.titre ?? t("projects.missionFallback"),
        interlocuteur:
          mission?.client?.utilisateur?.nom ??
          mission?.client?.nomEntreprise ??
          undefined,
        statutLabel,
        statutTon,
        detail: livraison
          ? undefined
          : t("projects.submitHint"),
        href: `/tableau-de-bord/livraisons?candidature=${encodeURIComponent(
          candidature.id,
        )}&role=etudiant`,
      };
    });
}

/** Projets en cours côté client : missions au statut « en_cours ». */
export function construireProjetsClient(params: {
  missions: Mission[];
  candidatures: Candidature[];
  livraisons: Livraison[];
  t: Traducteur;
}): ProjetActif[] {
  const { missions, candidatures, livraisons, t } = params;

  const candidatureAccepteeParMission = new Map<string, Candidature>();
  for (const candidature of candidatures) {
    if (candidature.statut === "acceptee") {
      candidatureAccepteeParMission.set(candidature.missionId, candidature);
    }
  }

  const livraisonParCandidature = new Map(
    livraisons.map((livraison) => [livraison.candidatureId, livraison]),
  );

  return missions
    .filter((mission) => mission.statut === "en_cours")
    .map((mission) => {
      const candidature = candidatureAccepteeParMission.get(mission.id);
      const livraison = candidature
        ? livraisonParCandidature.get(candidature.id)
        : undefined;

      const statutLabel = livraison
        ? livraison.statut === "en_attente"
          ? t("projects.deliveryToValidate")
          : livraison.statut === "correction_demandee"
            ? t("projects.correctionRequested")
            : t("projects.validated")
        : t("projects.awaitingDelivery");
      const statutTon: Ton = livraison
        ? livraison.statut === "en_attente"
          ? "ocre"
          : livraison.statut === "correction_demandee"
            ? "brique"
            : "rice"
        : "ink";

      return {
        id: mission.id,
        titre: mission.titre,
        interlocuteur: candidature?.etudiant?.utilisateur?.nom ?? undefined,
        statutLabel,
        statutTon,
        detail: undefined,
        href: "/tableau-de-bord/mes-missions",
      };
    });
}
