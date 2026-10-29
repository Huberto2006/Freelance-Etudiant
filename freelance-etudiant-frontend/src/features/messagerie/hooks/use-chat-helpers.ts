"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";

import { etiquetteIntl, normaliserLocale } from "@/i18n/config";
import { useLabels } from "@/i18n/use-labels";
import type { MessageAvecUtilisateurs } from "@/features/messagerie/types";
import type { Role } from "@/types/utilisateurs";

/**
 * Aides d'affichage de la messagerie liées à la langue courante :
 * heures, dates de liste, séparateurs de jour, aperçus de messages, rôles.
 * Le contenu des messages écrits par les utilisateurs n'est jamais traduit.
 */
export function useChatHelpers() {
  const t = useTranslations("chat");
  const locale = normaliserLocale(useLocale());
  const { role: libelleRole } = useLabels();

  return useMemo(() => {
    const etiquette = etiquetteIntl(locale);

    function formaterHeure(date: string): string {
      try {
        return new Intl.DateTimeFormat(etiquette, {
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(date));
      } catch {
        return "";
      }
    }

    function formaterDateListe(date: string): string {
      const jour = new Date(date);
      if (Number.isNaN(jour.getTime())) return "";

      const aujourdhui = new Date();
      if (jour.toDateString() === aujourdhui.toDateString()) {
        return formaterHeure(date);
      }

      const hier = new Date(aujourdhui);
      hier.setDate(aujourdhui.getDate() - 1);
      if (jour.toDateString() === hier.toDateString()) {
        return t("yesterday");
      }

      const memeAnnee = jour.getFullYear() === aujourdhui.getFullYear();
      try {
        return new Intl.DateTimeFormat(etiquette, {
          day: "numeric",
          month: "short",
          ...(memeAnnee ? {} : { year: "numeric" }),
        }).format(jour);
      } catch {
        return "";
      }
    }

    function formaterJourSeparateur(date: string): string {
      const jour = new Date(date);
      if (Number.isNaN(jour.getTime())) return "";

      const memeAnnee = jour.getFullYear() === new Date().getFullYear();
      try {
        return new Intl.DateTimeFormat(etiquette, {
          weekday: "long",
          day: "numeric",
          month: "long",
          ...(memeAnnee ? {} : { year: "numeric" }),
        }).format(jour);
      } catch {
        return "";
      }
    }

    function apercuMessage(message: MessageAvecUtilisateurs): string {
      if (message.estSupprime) return t("deletedMessage");
      if (message.contenu?.trim()) return message.contenu.trim();
      if (message.pieceJointeUrl) return t("attachment");
      return t("newConversation");
    }

    function apercuMessageGroupe(
      message: MessageAvecUtilisateurs,
      utilisateurId: string,
    ): string {
      const apercu = apercuMessage(message);
      if (message.expediteurId === utilisateurId) return apercu;
      const auteur = message.expediteur?.nom ?? t("member");
      return t("groupPreview", { auteur, apercu });
    }

    function afficherRole(role?: Role | null): string {
      if (!role) return t("kianjaUser");
      return libelleRole(role);
    }

    return {
      formaterHeure,
      formaterDateListe,
      formaterJourSeparateur,
      apercuMessage,
      apercuMessageGroupe,
      afficherRole,
    };
  }, [locale, t, libelleRole]);
}
