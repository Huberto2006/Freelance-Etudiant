"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Wallet,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

import type { Candidature } from "@/types/candidatures";
import type { Transaction } from "@/types/paiements";

import { useTranslations } from "next-intl";
import { useFormats } from "@/i18n/use-formats";

import { Button } from "@/components/ui/Button";
import {
  NoticeCard,
  PageHeader,
} from "@/components/ui/Notice";
import { BoutonRetour } from "@/components/ui/BoutonRetour";
import { SousNavigation } from "@/components/ui/SousNavigation";
import { CarteTransaction } from "@/features/paiements/components/CarteTransaction";
import { FormulairePaiement } from "@/features/paiements/components/FormulairePaiement";

// ============================================================
// PAGE PRINCIPALE DES PAIEMENTS
// ============================================================

export default function PaiementsPage() {
  const { utilisateur } = useAuth();
  const t = useTranslations("payments.page");
  const { argent: formatArgent } = useFormats();

  const [transactions, setTransactions] = useState<
    Transaction[]
  >([]);

  const [
    candidaturesAPayer,
    setCandidaturesAPayer,
  ] = useState<Candidature[]>([]);

  const [
    candidatureActive,
    setCandidatureActive,
  ] = useState<Candidature | null>(null);

  const [chargement, setChargement] = useState(true);

  // À payer / En attente / Confirmés / Historique
  const [ongletPaiements, setOngletPaiements] =
    useState("historique");

  // ==========================================================
  // CHARGER LES DONNÉES
  // ==========================================================

  const charger = useCallback(async () => {
    if (!utilisateur) {
      return;
    }

    try {
      if (utilisateur.role === "client") {
        const [
          mesTransactions,
          mesCandidatures,
        ] = await Promise.all([
          api.get<Transaction[]>("/paiements/me"),

          api
            .get<Candidature[]>(
              "/candidatures/client",
            )
            .catch(() => [] as Candidature[]),
        ]);

        // Une candidature ayant un paiement non annulé
        // ne doit plus apparaître dans "À payer".
        const idsAvecPaiementActif = new Set(
          mesTransactions
            .filter(
              (transaction) =>
                transaction.statut !== "annulee",
            )
            .map(
              (transaction) =>
                transaction.candidatureId,
            ),
        );

        setTransactions(mesTransactions);

        // Modèle séquestre : une candidature est payable dès son
        // acceptation — plus besoin d'attendre la validation de la
        // livraison. Les fonds restent séquestrés (statut CONFIRMEE)
        // jusqu'à cette validation, qui déclenche leur libération
        // automatique côté backend.
        setCandidaturesAPayer(
          mesCandidatures.filter(
            (candidature) =>
              candidature.statut === "acceptee" &&
              !idsAvecPaiementActif.has(
                candidature.id,
              ),
          ),
        );
      }

      if (utilisateur.role === "etudiant") {
        const recus = await api.get<Transaction[]>(
          "/paiements/recus",
        );

        setTransactions(recus);
      }
    } catch (err) {
      console.error(
        "Erreur lors du chargement des paiements :",
        err,
      );
    } finally {
      setChargement(false);
    }
  }, [utilisateur]);

  // ==========================================================
  // CHARGEMENT INITIAL
  // ==========================================================

  useEffect(() => {
    if (!utilisateur) {
      return;
    }

    void Promise.resolve().then(async () => {
      setChargement(true);
      await charger();
    });
  }, [utilisateur, charger]);

  // ==========================================================
  // RECHARGER
  // ==========================================================

  const recharger = async () => {
    setChargement(true);
    await charger();
  };

  // ==========================================================
  // RETOUR DE LA PAGE DE PAIEMENT PAPI (?retour=papi&ref=KIANJA-…)
  // Le retour du navigateur n'est PAS une preuve de paiement : on
  // demande au backend de relire le statut réel auprès de Papi.
  // ==========================================================

  const retourTraite = useRef(false);
  const [messageRetour, setMessageRetour] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (retourTraite.current || chargement) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get("retour") !== "papi") return;

    retourTraite.current = true;
    const ref = params.get("ref");
    window.history.replaceState(null, "", window.location.pathname);

    const transaction = transactions.find(
      (t) => t.reference === ref && t.provider === "papi",
    );
    if (!transaction) return;

    async function verifierRetour(id: string) {
      try {
        const maj = await api.post<Transaction>(
          `/paiements/${id}/verifier`,
        );
        setMessageRetour(
          maj.statut === "confirmee" || maj.statut === "liberee"
            ? t("returnConfirmed")
            : maj.statut === "annulee"
              ? t("returnRefused")
              : t("returnPending"),
        );
        void recharger();
      } catch {
        setMessageRetour(
          t("returnVerifyFailed"),
        );
      }
    }

    void verifierRetour(transaction.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chargement, transactions]);

  // ==========================================================
  // PROTECTION
  // ==========================================================

  if (!utilisateur) {
    return null;
  }

  // ==========================================================
  // TOTAL REÇU PAR L'ÉTUDIANT
  // ==========================================================

  const totalRecu = transactions
    .filter(
      (transaction) =>
        transaction.statut === "liberee",
    )
    .reduce(
      (somme, transaction) =>
        somme + Number(transaction.montant),
      0,
    );

  // ==========================================================
  // TRANSACTIONS PAR STATUT
  // ==========================================================

  const transactionsEnAttente =
    transactions.filter(
      (t) => t.statut === "en_attente",
    );

  const transactionsConfirmees =
    transactions.filter(
      (t) =>
        t.statut === "confirmee" ||
        t.statut === "liberee",
    );

  // ==========================================================
  // AFFICHAGE
  // ==========================================================

  return (
    <div>
      <div className="mb-4">
        <BoutonRetour
          repli="/tableau-de-bord"
          forcer
        />
      </div>

      <PageHeader
        icon={Wallet}
        eyebrow={t("eyebrow")}
        title={t("title")}
      />

      {messageRetour && (
        <NoticeCard className="mb-4">
          <p role="status" className="text-sm text-ink">
            {messageRetour}
          </p>
        </NoticeCard>
      )}

      {/* ======================================================
          TOTAL ÉTUDIANT
         ====================================================== */}

      {utilisateur.role === "etudiant" && (
        <NoticeCard className="mb-6">
          <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">
            {t("totalReceived")}
          </p>

          <p className="mt-1 font-display text-3xl">
            {formatArgent(totalRecu)}
          </p>
        </NoticeCard>
      )}

      {/* ======================================================
          SOUS-MENU
         ====================================================== */}

      <SousNavigation
        onglets={[
          ...(utilisateur.role === "client"
            ? [
                {
                  valeur: "a_payer",
                  label: t("toPay"),
                  compte:
                    candidaturesAPayer.length,
                },
              ]
            : []),

          {
            valeur: "en_attente",
            label: t("pending"),
            compte:
              transactionsEnAttente.length,
          },

          {
            valeur: "confirmes",
            label: t("confirmed"),
            compte:
              transactionsConfirmees.length,
          },

          {
            valeur: "historique",
            label: t("history"),
            compte: transactions.length,
          },
        ]}
        actif={ongletPaiements}
        onChanger={setOngletPaiements}
      />

      {/* ======================================================
          MISSIONS À PAYER
         ====================================================== */}

      {utilisateur.role === "client" &&
        ongletPaiements === "a_payer" &&
        candidaturesAPayer.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-3 font-display text-lg font-semibold">
              {t("missionsAwaitingPayment")}
            </h2>

            {candidatureActive ? (
              <FormulairePaiement
                candidature={candidatureActive}
                onFermer={() =>
                  setCandidatureActive(null)
                }
                onEnvoye={() => {
                  setCandidatureActive(null);
                  void recharger();
                }}
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {candidaturesAPayer.map(
                  (candidature) => (
                    <NoticeCard
                      key={candidature.id}
                      className="flex flex-col gap-2"
                    >
                      <p className="font-display font-medium">
                        {candidature.mission?.titre ??
                          t("mission")}
                      </p>

                      <p className="font-mono text-sm text-ocre-dark">
                        {formatArgent(
                          candidature.prixPropose,
                        )}
                      </p>

                      <Button
                        variant="secondary"
                        className="mt-1 self-start"
                        onClick={() =>
                          setCandidatureActive(
                            candidature,
                          )
                        }
                      >
                        {t("declareThePayment")}
                      </Button>
                    </NoticeCard>
                  ),
                )}
              </div>
            )}
          </div>
        )}

      {/* ======================================================
          AUCUNE MISSION À PAYER
         ====================================================== */}

      {utilisateur.role === "client" &&
        ongletPaiements === "a_payer" &&
        candidaturesAPayer.length === 0 && (
          <NoticeCard className="mb-6">
            <p className="text-sm text-ink-soft/70">
              {t("noMissionAwaiting")}
            </p>
          </NoticeCard>
        )}

      {/* ======================================================
          TRANSACTIONS
         ====================================================== */}

      {ongletPaiements !== "a_payer" && (
        <>
          <h2 className="mb-3 font-display text-lg font-semibold">
            {ongletPaiements === "en_attente"
              ? t("pending")
              : ongletPaiements === "confirmes"
                ? t("confirmed")
                : t("history")}
          </h2>

          {(() => {
            const transactionsAffichees =
              ongletPaiements === "en_attente"
                ? transactionsEnAttente
                : ongletPaiements === "confirmes"
                  ? transactionsConfirmees
                  : transactions;

            if (chargement) {
              return (
                <p className="text-sm text-ink-soft">
                  {t("loading")}
                </p>
              );
            }

            if (
              transactionsAffichees.length === 0
            ) {
              return (
                <NoticeCard>
                  <p className="text-sm text-ink-soft/70">
                    {t("noneInCategory")}
                  </p>
                </NoticeCard>
              );
            }

            return (
              <div className="grid gap-3 sm:grid-cols-2">
                {transactionsAffichees.map(
                  (transaction) => (
                    <CarteTransaction
                      key={transaction.id}
                      transaction={transaction}
                      onVerifie={recharger}
                    />
                  ),
                )}
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
