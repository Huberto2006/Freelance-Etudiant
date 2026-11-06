"use client";

import { StaggerContainer } from "@/components/ui/motion/StaggerContainer";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { DataTable } from "@/components/ui/data-table";
import {
  NoticeCard,
  PageHeader,
} from "@/components/ui/Notice";
import { SousNavigation } from "@/components/ui/SousNavigation";
import { ActionsTransaction } from "@/features/paiements/components/ActionsTransaction";
import {
  FILTRES_FINANCIERS_VIDES,
  FiltresFinanciers,
  type ValeursFiltresFinanciers,
} from "@/features/paiements/components/FiltresFinanciers";
import { useColonnesTransaction } from "@/features/paiements/components/colonnes-transaction";
import { FormulairePaiement } from "@/features/paiements/components/FormulairePaiement";
import {
  filtrerFinancier,
  filtresFinanciersActifs,
} from "@/features/paiements/utils/filtrer-financier";

// ============================================================
// PAGE PRINCIPALE DES PAIEMENTS
// ============================================================

/** Relecture après retour de Papi : toutes les 5 s pendant 2 minutes. */
const RETOUR_INTERVALLE_MS = 5_000;
const RETOUR_ESSAIS_MAX = 24;

export default function PaiementsPage() {
  const { utilisateur } = useAuth();
  const t = useTranslations("payments.page");
  const tTableau = useTranslations("payments.table");
  const tc = useTranslations("common");
  const colonnesTransaction = useColonnesTransaction();
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
  const [erreurChargement, setErreurChargement] = useState<string | null>(null);

  // À payer / En attente / Confirmés / Historique
  const [ongletPaiements, setOngletPaiements] =
    useState("historique");
  const [filtres, setFiltres] = useState<ValeursFiltresFinanciers>({
    ...FILTRES_FINANCIERS_VIDES,
  });

  // ==========================================================
  // CHARGER LES DONNÉES
  // ==========================================================

  const charger = useCallback(async () => {
    if (!utilisateur) {
      return;
    }

    setErreurChargement(null);
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
            // Les transactions restent affichées, mais sans cet avertissement
            // un échec laisserait croire qu'il n'y a rien à payer.
            .catch(() => {
              setErreurChargement(tc("states.errLoadData"));
              return [] as Candidature[];
            }),
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
      setErreurChargement(tc("states.errLoadData"));
    } finally {
      setChargement(false);
    }
  }, [utilisateur, tc]);

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
  const minuteurRetour = useRef<ReturnType<typeof setTimeout> | null>(null);
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

    // MVola et Airtel attendent la validation du payeur sur son téléphone :
    // tant que le paiement est en attente, le backend est réinterrogé.
    async function verifierRetour(id: string, essai: number) {
      try {
        const maj = await api.post<Transaction>(
          `/paiements/${id}/verifier`,
        );
        if (maj.statut === "en_attente") {
          setMessageRetour(t("returnPending"));
          if (essai < RETOUR_ESSAIS_MAX) {
            minuteurRetour.current = setTimeout(
              () => void verifierRetour(id, essai + 1),
              RETOUR_INTERVALLE_MS,
            );
          }
          return;
        }
        setMessageRetour(
          maj.statut === "annulee"
            ? t("returnRefused")
            : t("returnConfirmed"),
        );
        void recharger();
      } catch {
        setMessageRetour(
          t("returnVerifyFailed"),
        );
      }
    }

    void verifierRetour(transaction.id, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chargement, transactions]);

  useEffect(
    () => () => {
      if (minuteurRetour.current) clearTimeout(minuteurRetour.current);
    },
    [],
  );

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

  const transactionsDeLOnglet =
    ongletPaiements === "en_attente"
      ? transactionsEnAttente
      : ongletPaiements === "confirmes"
        ? transactionsConfirmees
        : transactions;
  const transactionsFiltrees = useMemo(
    () =>
      filtrerFinancier(transactionsDeLOnglet, filtres, {
        statut: (transaction) => transaction.statut,
        methode: (transaction) => transaction.methode,
        date: (transaction) => transaction.dateCreation,
      }),
    [transactionsDeLOnglet, filtres],
  );

  // ==========================================================
  // AFFICHAGE
  // ==========================================================

  // Après tous les hooks : leur ordre ne doit jamais dépendre de la session.
  if (!utilisateur) {
    return null;
  }

  return (
    <div>
      <PageHeader
        icon={Wallet}
        eyebrow={t("eyebrow")}
        title={t("title")}
      />

      {erreurChargement && (
        <NoticeCard className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p role="alert" className="text-sm text-brique">
            {erreurChargement}
          </p>
          <Button variant="ghost" size="sm" onClick={() => void recharger()}>
            {tc("actions.retry")}
          </Button>
        </NoticeCard>
      )}

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
          <p className=" text-xs text-ink-soft font-medium">
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
              <StaggerContainer className="grid gap-3 sm:grid-cols-2">
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

                      <p className="tabular-nums text-sm text-ocre-dark">
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
              </StaggerContainer>
            )}
          </div>
        )}

      {/* ======================================================
          AUCUNE MISSION À PAYER
         ====================================================== */}

      {utilisateur.role === "client" &&
        ongletPaiements === "a_payer" &&
        !erreurChargement &&
        candidaturesAPayer.length === 0 && (
          <NoticeCard className="mb-6">
            <p className="text-sm text-ink-soft/85">
              {t("noMissionAwaiting")}
            </p>
          </NoticeCard>
        )}

      {/* ======================================================
          TRANSACTIONS
         ====================================================== */}

      {ongletPaiements !== "a_payer" &&
        !(erreurChargement && transactions.length === 0) && (
        <>
          <h2 className="mb-3 font-display text-lg font-semibold">
            {ongletPaiements === "en_attente"
              ? t("pending")
              : ongletPaiements === "confirmes"
                ? t("confirmed")
                : t("history")}
          </h2>

          <DataTable
            lignes={transactionsFiltrees}
            colonnes={[
              ...colonnesTransaction,
              {
                id: "actions",
                entete: tTableau("colActions"),
                cellule: (transaction) => (
                  <ActionsTransaction
                    transaction={transaction}
                    onVerifie={recharger}
                  />
                ),
              },
            ]}
            cleLigne={(transaction) => transaction.id}
            legende={t("title")}
            chargement={chargement}
            iconeVide={Wallet}
            messageVide={t("noneInCategory")}
            messageAucunResultat={tTableau("noResults")}
            placeholderRecherche={tTableau("searchPlaceholder")}
            libelleRecherche={tTableau("searchLabel")}
            filtres={
              <FiltresFinanciers valeur={filtres} onChange={setFiltres} />
            }
            filtresActifs={filtresFinanciersActifs(filtres)}
            onReinitialiserFiltres={() =>
              setFiltres({ ...FILTRES_FINANCIERS_VIDES })
            }
            cleFiltres={`${ongletPaiements}:${JSON.stringify(filtres)}`}
            triInitial={{ colonne: "date", direction: "desc" }}
          />
        </>
      )}
    </div>
  );
}
