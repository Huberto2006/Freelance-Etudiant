import type {
  Candidature,
  Livraison,
  Mission,
  NotificationItem,
  Signalement,
  Transaction,
} from "./types";
import { statutTransactionLabel } from "./format";
import { versNombre } from "./dashboard";
import type {
  EvenementActivite,
  ProjetActif,
  Ton,
} from "./dashboard";

// ============================================================
// ACTIVITÉ — ISSUE DES NOTIFICATIONS (journal réel des événements)
// ============================================================

const LIBELLES_PAR_TYPE: Record<
  NotificationItem["type"],
  { label: string; ton: Ton }
> = {
  nouvelle_candidature: { label: "Nouvelle candidature", ton: "ocre" },
  candidature_acceptee: { label: "Candidature acceptée", ton: "rice" },
  candidature_refusee: { label: "Candidature refusée", ton: "brique" },
  nouveau_message: { label: "Nouveau message", ton: "ink" },
  livraison_deposee: { label: "Livraison déposée", ton: "ocre" },
  livraison_validee: { label: "Livraison validée", ton: "rice" },
  correction_demandee: { label: "Correction demandée", ton: "brique" },
  nouvelle_evaluation: { label: "Nouvelle évaluation", ton: "ocre" },
  nouveau_commentaire: { label: "Nouveau commentaire", ton: "ink" },
  paiement_initie: { label: "Paiement déclaré", ton: "ink" },
  paiement_confirme: { label: "Paiement confirmé", ton: "rice" },
  paiement_libere: { label: "Paiement libéré", ton: "rice" },
  nouvelle_reaction: { label: "Nouvelle réaction", ton: "ink" },
};

/**
 * Transforme les notifications réelles de l'utilisateur en timeline
 * d'activité (candidature acceptée/refusée, livraison validée,
 * paiement reçu, évaluation reçue, message…).
 */
export function activiteDepuisNotifications(
  notifications: NotificationItem[],
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
      titre: LIBELLES_PAR_TYPE[notification.type]?.label ?? notification.titre,
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
  max?: number;
}): EvenementActivite[] {
  const { signalements, paiements, max = 8 } = params;

  const evenementsSignalements: EvenementActivite[] = signalements.map(
    (signalement) => ({
      id: `signalement-${signalement.id}`,
      ton: signalement.statut === "traite" ? "rice" : "brique",
      titre:
        signalement.statut === "traite"
          ? "Signalement traité"
          : "Nouveau signalement",
      detail: signalement.motif,
      date: signalement.dateSignalement,
      href: "/tableau-de-bord/admin/signalements",
    }),
  );

  const evenementsPaiements: EvenementActivite[] = paiements.map(
    (paiement) => ({
      id: `paiement-${paiement.id}`,
      ton: paiement.statut === "annulee" ? "brique" : "rice",
      titre: statutTransactionLabel[paiement.statut],
      detail: `${new Intl.NumberFormat("fr-FR").format(
        versNombre(paiement.montant),
      )} Ar · ${paiement.candidature?.mission?.titre ?? "mission"}`,
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
}): ProjetActif[] {
  const { candidatures, livraisons } = params;
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
          ? "En attente de validation"
          : livraison.statut === "correction_demandee"
            ? "Correction demandée"
            : "Validée"
        : "À livrer";
      const statutTon: Ton = livraison
        ? livraison.statut === "en_attente"
          ? "ocre"
          : livraison.statut === "correction_demandee"
            ? "brique"
            : "rice"
        : "brique";

      return {
        id: candidature.id,
        titre: mission?.titre ?? "Mission",
        interlocuteur:
          mission?.client?.utilisateur?.nom ??
          mission?.client?.nomEntreprise ??
          undefined,
        statutLabel,
        statutTon,
        detail: livraison
          ? undefined
          : "Déposez votre travail pour démarrer la validation.",
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
}): ProjetActif[] {
  const { missions, candidatures, livraisons } = params;

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
          ? "Livraison à valider"
          : livraison.statut === "correction_demandee"
            ? "Correction demandée"
            : "Validée"
        : "En attente de livraison";
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
