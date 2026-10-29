import type { useTranslations } from "next-intl";

import type {
  ConversationGroupeResume,
  ConversationIndividuelle,
} from "@/features/messagerie/types";
import type { LigneConversation } from "@/features/messagerie/conversation.types";
import type { useChatHelpers } from "@/features/messagerie/hooks/use-chat-helpers";
import type { Utilisateur } from "@/types/utilisateurs";

type ChatHelpers = ReturnType<typeof useChatHelpers>;

export interface ParametresLignesConversations {
  conversationsIndividuelles: ConversationIndividuelle[];
  conversationsGroupes: ConversationGroupeResume[];
  utilisateur: Utilisateur | null;
  /** Contact ouvert depuis l'URL (?contactId=...), même sans message échangé. */
  contactDepuisUrl: { id: string; nom: string } | null;
  /** Groupe ouvert depuis l'URL (?groupeId=...). */
  groupeDepuisUrl: { id: string; nom: string; nombreMembres?: number } | null;
  apercuMessage: ChatHelpers["apercuMessage"];
  apercuMessageGroupe: ChatHelpers["apercuMessageGroupe"];
  t: ReturnType<typeof useTranslations<"chat">>;
}

/**
 * Construit les lignes de la liste des conversations (individuelles et de
 * groupe), triées de la plus récente à la plus ancienne. Fonction pure :
 * aucune requête, aucun état React.
 */
export function construireLignesConversations({
  conversationsIndividuelles,
  conversationsGroupes,
  utilisateur,
  contactDepuisUrl,
  groupeDepuisUrl,
  apercuMessage,
  apercuMessageGroupe,
  t,
}: ParametresLignesConversations): LigneConversation[] {
    if (!utilisateur) {
      return [];
    }

    const lignes: LigneConversation[] =
      [];

    /*
     * INDIVIDUELS
     */

    const contactsMap =
      new Map<
        string,
        LigneConversation
      >();

    for (
      const message of conversationsIndividuelles
    ) {
      const autre =
        message.expediteurId ===
        utilisateur.id
          ? message.destinataire
          : message.expediteur;

      if (!autre) {
        continue;
      }

      if (
        contactsMap.has(
          autre.id,
        )
      ) {
        continue;
      }

      contactsMap.set(
        autre.id,
        {
          cle: autre.id,
          type: "INDIVIDUEL",
          id: autre.id,
          nom:
            autre.nom?.trim() ||
            t("user"),
          photoUrl:
            autre.photoUrl ??
            null,
          role:
            autre.role ??
            null,
          dernierContenu:
            apercuMessage(
              message,
            ),
          dernierDate:
            message.dateEnvoi,
          dernierEstMoi:
            message.expediteurId ===
            utilisateur.id,
          conversationVide:
            !message.contenu?.trim() &&
            !message.estSupprime &&
            !message.pieceJointeUrl,
          nonLus: 0,
        },
      );
    }

    /*
     * Contact demandé via URL
     */

    if (
      contactDepuisUrl &&
      !contactsMap.has(
        contactDepuisUrl.id,
      )
    ) {
      contactsMap.set(
        contactDepuisUrl.id,
        {
          cle: contactDepuisUrl.id,
          type: "INDIVIDUEL",
          id: contactDepuisUrl.id,
          nom:
            contactDepuisUrl.nom,
          photoUrl: null,
          role: null,
          dernierContenu:
            t("newConversation"),
          dernierDate: null,
          dernierEstMoi: false,
          conversationVide: true,
          nonLus: 0,
        },
      );
    }

    /*
     * Messages individuels non lus
     */

    for (
      const message of conversationsIndividuelles
    ) {
      if (
        message.destinataireId ===
          utilisateur.id &&
        !message.estLu
      ) {
        const ligne =
          contactsMap.get(
            message.expediteurId,
          );

        if (ligne) {
          ligne.nonLus += 1;
        }
      }
    }

    lignes.push(
      ...contactsMap.values(),
    );

    /*
     * GROUPES
     */

    for (
      const groupe of conversationsGroupes
    ) {
      const dernier =
        groupe.dernierMessage;

      lignes.push({
        cle: `groupe-${groupe.groupeId}`,
        type: "GROUPE",
        id: groupe.groupeId,
        nom: groupe.nom,
        photoUrl: null,
        role: null,
        nombreMembres:
          typeof groupe.nombreMembres ===
          "number"
            ? groupe.nombreMembres
            : undefined,
        dernierContenu: dernier
          ? apercuMessageGroupe(
              dernier,
              utilisateur.id,
            )
          : t("noMessage"),
        dernierDate:
          dernier?.dateEnvoi ??
          null,
        dernierEstMoi:
          dernier?.expediteurId ===
          utilisateur.id,
        conversationVide:
          !dernier,
        nonLus:
          typeof groupe.nonLus ===
          "number"
            ? groupe.nonLus
            : 0,
      });
    }

    /*
     * Groupe demandé directement par URL
     */

    if (
      groupeDepuisUrl &&
      !lignes.some(
        (ligne) =>
          ligne.type ===
            "GROUPE" &&
          ligne.id ===
            groupeDepuisUrl.id,
      )
    ) {
      lignes.push({
        cle: `groupe-${groupeDepuisUrl.id}`,
        type: "GROUPE",
        id: groupeDepuisUrl.id,
        nom:
          groupeDepuisUrl.nom,
        photoUrl: null,
        role: null,
        nombreMembres:
          groupeDepuisUrl.nombreMembres,
        dernierContenu:
          t("noMessage"),
        dernierDate: null,
        dernierEstMoi: false,
        conversationVide: true,
        nonLus: 0,
      });
    }

    /*
     * Tri par dernier message
     */

    lignes.sort((a, b) => {
      if (
        !a.dernierDate &&
        !b.dernierDate
      ) {
        return 0;
      }

      if (!a.dernierDate) {
        return 1;
      }

      if (!b.dernierDate) {
        return -1;
      }

      return (
        new Date(
          b.dernierDate,
        ).getTime() -
        new Date(
          a.dernierDate,
        ).getTime()
      );
    });

    return lignes;
}
