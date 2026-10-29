"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { api, ApiError } from "@/lib/api";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { Candidature } from "@/types/candidatures";
import { useTranslations } from "next-intl";
import { useFormats } from "@/i18n/use-formats";
import { useLabels } from "@/i18n/use-labels";

import { Button } from "@/components/ui/Button";
import { BadgeStatut, ChargementPage, StampBadge } from "@/components/ui/Notice";
import { useToast } from "@/components/ui/Toast";

/* =========================================================
   CANDIDATURES D'UNE MISSION
   ========================================================= */

export function CandidaturesMission({
  missionId,
  onCandidatureAcceptee,
}: {
  missionId: string;
  onCandidatureAcceptee?: () => void | Promise<void>;
}) {
  const t = useTranslations("dashboardPages.myMissions.applications");
  const { argent: formatArgent } = useFormats();
  const { statutCandidature } = useLabels();
  const toast = useToast();
  const [candidatures, setCandidatures] = useState<Candidature[]>([]);

  // `chargement` ne vaut true que pour le tout premier chargement : un
  // rechargement après action garde la liste affichée (pas de clignotement).
  const [chargement, setChargement] = useState(true);
  // Erreur de CHARGEMENT uniquement. Un échec d'action est signalé par une
  // notification et ne fait jamais disparaître la liste.
  const [erreur, setErreur] = useState<string | null>(null);

  type ActionCandidature = "accepter" | "refuser";

  /**
   * Candidature dont une requête est réellement en cours, avec son action.
   * Protège contre le double-clic : tous les boutons sont désactivés pendant
   * l'appel, et seul le bouton concerné affiche son indicateur.
   */
  const [actionEnCours, setActionEnCours] = useState<{
    id: string;
    action: ActionCandidature;
  } | null>(null);

  /** Décision en attente de confirmation explicite. */
  const [aConfirmer, setAConfirmer] = useState<{
    candidature: Candidature;
    action: ActionCandidature;
  } | null>(null);

  /**
   * Recharge les candidatures.
   */
  const charger = useCallback(async () => {
    setErreur(null);

    try {
      const data = await api.get<Candidature[]>(
        `/missions/${missionId}/candidatures`,
      );

      setCandidatures(data);
    } catch (error) {
      console.error("Erreur lors du chargement des candidatures :", error);

      setErreur(
        error instanceof ApiError
          ? error.message
          : t("loadError"),
      );
    } finally {
      setChargement(false);
    }
  }, [missionId, t]);

  /**
   * Chargement initial.
   */
  useEffect(() => {
    let cancelled = false;

    const chargerInitial = async () => {
      try {
        const data = await api.get<Candidature[]>(
          `/missions/${missionId}/candidatures`,
        );

        if (!cancelled) {
          setCandidatures(data);
          setErreur(null);
        }
      } catch (error) {
        console.error(
          "Erreur lors du chargement initial des candidatures :",
          error,
        );

        if (!cancelled) {
          setErreur(
            error instanceof ApiError
              ? error.message
              : t("loadError"),
          );
        }
      } finally {
        if (!cancelled) {
          setChargement(false);
        }
      }
    };

    chargerInitial();

    return () => {
      cancelled = true;
    };
  }, [missionId, t]);

  /**
   * Accepte ou refuse une candidature. Le succès n'est annoncé qu'après la
   * réponse positive du backend ; en cas d'échec, son message est affiché
   * et la liste reste intacte.
   */
  async function executer(candidature: Candidature, action: ActionCandidature) {
    if (actionEnCours) return; // anti double-clic
    setActionEnCours({ id: candidature.id, action });
    try {
      await api.patch(`/candidatures/${candidature.id}/${action}`);

      toast.succes(t(action === "accepter" ? "acceptedToast" : "refusedToast"));
      await charger();

      if (action === "accepter") {
        // La mission passe a EN_COURS cote backend : on rafraichit la liste
        // des missions du parent pour que son statut affiche ne reste pas
        // "Ouverte" jusqu'au prochain rechargement de page.
        // Un échec de ce rafraîchissement ne doit jamais être présenté
        // comme un échec de l'acceptation, qui a bien eu lieu.
        try {
          await onCandidatureAcceptee?.();
        } catch (erreurRafraichissement) {
          console.error(
            "Rafraîchissement des missions impossible :",
            erreurRafraichissement,
          );
        }
      }
    } catch (error) {
      console.error(`Erreur lors de l'action « ${action} » :`, error);

      toast.erreur(
        t(action === "accepter" ? "acceptError" : "refuseError"),
        error instanceof ApiError ? error.message : undefined,
      );
    } finally {
      setActionEnCours(null);
      setAConfirmer(null);
    }
  }

  if (chargement) {
    return <ChargementPage />;
  }

  if (erreur && candidatures.length === 0) {
    return (
      <p role="alert" className="text-sm text-brique">
        {erreur}
      </p>
    );
  }

  if (candidatures.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        {t("none")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {candidatures.map((candidature) => {
        const etudiant = candidature.etudiant?.utilisateur;

        return (
          <div
            key={candidature.id}
            className="border border-ink/15 bg-paper/60 p-4"
          >
            {/* =================================================
                INFORMATIONS ÉTUDIANT
                ================================================= */}

            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {candidature.etudiant && (
                  <StampBadge
                    score={Number(candidature.etudiant.scoreReputation) || 0}
                    size={44}
                  />
                )}

                <div>
                  <p className="font-display flex items-center gap-1.5 font-medium">
                    {etudiant?.nom ?? t("studentFallback")}
                    {candidature.groupeId && (
                      <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[0.65rem] font-normal text-ink-soft">
                        {candidature.groupe?.nom
                          ? t("groupNamed", { nom: candidature.groupe.nom })
                          : t("group")}
                      </span>
                    )}
                  </p>

                  <p className="text-xs text-ink-soft/70">
                    {formatArgent(candidature.prixPropose)}
                    {" · "}
                    {t("days", { count: candidature.delaiPropose })}
                    {candidature.groupeId && candidature.groupe?.membres && (
                      <>
                        {" · "}
                        {t("members", { count: candidature.groupe.membres.length })}
                      </>
                    )}
                  </p>
                </div>
              </div>

              <BadgeStatut
                statut={candidature.statut}
                labels={{ [candidature.statut]: statutCandidature(candidature.statut) }}
              />
            </div>

            {/* =================================================
                MESSAGE DE CANDIDATURE
                ================================================= */}

            {candidature.message && (
              <p className="mt-3 text-sm text-ink-soft">
                {candidature.message}
              </p>
            )}

            {/* =================================================
                ACTIONS EN ATTENTE
                ================================================= */}

            {candidature.statut === "en_attente" && (
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  loading={
                    actionEnCours?.id === candidature.id &&
                    actionEnCours.action === "accepter"
                  }
                  disabled={actionEnCours !== null}
                  onClick={() =>
                    setAConfirmer({ candidature, action: "accepter" })
                  }
                >
                  {actionEnCours?.id === candidature.id &&
                  actionEnCours.action === "accepter"
                    ? t("accepting")
                    : t("accept")}
                </Button>

                <Button
                  size="sm"
                  variant="danger-ghost"
                  loading={
                    actionEnCours?.id === candidature.id &&
                    actionEnCours.action === "refuser"
                  }
                  disabled={actionEnCours !== null}
                  onClick={() =>
                    setAConfirmer({ candidature, action: "refuser" })
                  }
                >
                  {actionEnCours?.id === candidature.id &&
                  actionEnCours.action === "refuser"
                    ? t("refusing")
                    : t("refuse")}
                </Button>
              </div>
            )}

            {/* =================================================
                CANDIDATURE ACCEPTÉE
                ================================================= */}

            {candidature.statut === "acceptee" && (
              <div className="mt-4 border-t border-ink/10 pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  {/* -----------------------------------------
                      MESSAGERIE
                      ----------------------------------------- */}

                  {etudiant && (
                    <Link
                      href={`/tableau-de-bord/messages?contact=${encodeURIComponent(
                        etudiant.id,
                      )}&nom=${encodeURIComponent(etudiant.nom)}`}
                    >
                      <Button size="sm" variant="secondary">
                        {t("chatWithStudent")}
                      </Button>
                    </Link>
                  )}

                  {/* -----------------------------------------
                      LIVRAISON
                      ----------------------------------------- */}

                  <Link
                    href={`/tableau-de-bord/livraisons?candidature=${encodeURIComponent(
                      candidature.id,
                    )}&role=client`}
                  >
                    <Button size="sm" variant="ghost">
                      {t("trackDelivery")}
                    </Button>
                  </Link>
                </div>

                <p className="mt-2 text-xs text-ink-soft/70">
                  {t("deliveryHint")}
                </p>
              </div>
            )}
          </div>
        );
      })}

      {/* Décision engageante : confirmation explicite avant toute requête. */}
      <ConfirmDialog
        ouvert={aConfirmer !== null}
        titre={
          aConfirmer
            ? t(
                aConfirmer.action === "accepter"
                  ? "confirmAcceptTitle"
                  : "confirmRefuseTitle",
                {
                  nom:
                    aConfirmer.candidature.etudiant?.utilisateur?.nom ??
                    t("studentFallback"),
                },
              )
            : ""
        }
        description={
          aConfirmer
            ? aConfirmer.action === "accepter"
              ? t("confirmAcceptDescription", {
                  montant: formatArgent(aConfirmer.candidature.prixPropose),
                  delai: t("days", { count: aConfirmer.candidature.delaiPropose }),
                })
              : t("confirmRefuseDescription")
            : undefined
        }
        libelleConfirmer={
          aConfirmer?.action === "accepter"
            ? t("confirmAcceptAction")
            : t("confirmRefuseAction")
        }
        destructif={aConfirmer?.action === "refuser"}
        enCours={actionEnCours !== null}
        onConfirmer={() => {
          if (aConfirmer) void executer(aConfirmer.candidature, aConfirmer.action);
        }}
        onAnnuler={() => setAConfirmer(null)}
      />
    </div>
  );
}
