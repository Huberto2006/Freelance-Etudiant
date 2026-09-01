"use client";

import { useCallback, useEffect, useState } from "react";
import { Wallet, X } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";

import type {
  Candidature,
  MethodePaiement,
  Transaction,
} from "@/lib/types";

import {
  formatArgent,
  formatDateCourte,
  methodePaiementLabel,
  statutTransactionLabel,
} from "@/lib/format";

import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import {
  NoticeCard,
  PageHeader,
  Tag,
} from "@/components/ui/Notice";

// ============================================================
// CONFIGURATION DES COULEURS DES STATUTS
// ============================================================

const toneParStatut: Record<
  string,
  "ocre" | "rice" | "brique" | "ink"
> = {
  en_attente: "ocre",
  confirmee: "rice",
  liberee: "rice",
  annulee: "brique",
};

// ============================================================
// CARTE D'UNE TRANSACTION
// ============================================================

function CarteTransaction({
  transaction,
}: {
  transaction: Transaction;
}) {
  return (
    <NoticeCard className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display font-medium">
            {transaction.candidature?.mission?.titre ?? "Mission"}
          </p>

          <p className="mt-0.5 font-mono text-xs text-ink-soft/70">
            {methodePaiementLabel[transaction.methode]} · réf.{" "}
            {transaction.reference}
          </p>
        </div>

        <Tag tone={toneParStatut[transaction.statut]}>
          {statutTransactionLabel[transaction.statut]}
        </Tag>
      </div>

      <div className="flex items-center justify-between">
        <p className="font-mono text-sm text-ocre-dark">
          {formatArgent(transaction.montant)}
        </p>

        <p className="text-xs text-ink-soft/60">
          {formatDateCourte(transaction.dateCreation)}
        </p>
      </div>
    </NoticeCard>
  );
}

// ============================================================
// FORMULAIRE DE DÉCLARATION D'UN PAIEMENT
// ============================================================

function FormulairePaiement({
  candidature,
  onEnvoye,
  onFermer,
}: {
  candidature: Candidature;
  onEnvoye: () => void;
  onFermer: () => void;
}) {
  const [montant, setMontant] = useState(
    String(candidature.prixPropose),
  );

  const [methode, setMethode] =
    useState<MethodePaiement>("mvola");

  const [reference, setReference] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(
    null,
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    setEnvoi(true);
    setErreur(null);

    try {
      await api.post(
        `/candidatures/${candidature.id}/paiement`,
        {
          montant: Number(montant),
          methode,
          reference,
        },
      );

      onEnvoye();
    } catch (err) {
      setErreur(
        err instanceof ApiError
          ? err.message
          : "Erreur lors de l'envoi du paiement.",
      );
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <NoticeCard className="mb-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-display text-lg font-medium">
          Déclarer un paiement —{" "}
          {candidature.mission?.titre ?? "Mission"}
        </p>

        <button
          type="button"
          onClick={onFermer}
          aria-label="Fermer le formulaire"
          className="text-ink-soft transition-colors hover:text-ink"
        >
          <X size={18} />
        </button>
      </div>

      <p className="mb-4 text-sm text-ink-soft">
        Effectuez le transfert via mobile money vers le compte de la
        plateforme, puis renseignez la référence ci-dessous pour
        vérification par un administrateur.
      </p>

      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end"
      >
        <div className="w-full sm:w-40">
          <Field label="Montant (Ar)" htmlFor="montant">
            <Input
              id="montant"
              type="number"
              min={0}
              required
              value={montant}
              onChange={(e) =>
                setMontant(e.target.value)
              }
            />
          </Field>
        </div>

        <div className="w-full sm:w-48">
          <Field label="Méthode" htmlFor="methode">
            <Select
              id="methode"
              value={methode}
              onChange={(e) =>
                setMethode(
                  e.target.value as MethodePaiement,
                )
              }
            >
              <option value="mvola">Mvola</option>
              <option value="orange_money">
                Orange Money
              </option>
              <option value="airtel_money">
                Airtel Money
              </option>
              <option value="virement">
                Virement bancaire
              </option>
            </Select>
          </Field>
        </div>

        <div className="w-full sm:w-56">
          <Field
            label="Référence du transfert"
            htmlFor="reference"
          >
            <Input
              id="reference"
              required
              value={reference}
              onChange={(e) =>
                setReference(e.target.value)
              }
              placeholder="MV240815.1234.A56789"
            />
          </Field>
        </div>

        <Button type="submit" disabled={envoi}>
          {envoi
            ? "Envoi…"
            : "Déclarer le paiement"}
        </Button>
      </form>

      {erreur && (
        <p className="mt-3 text-sm text-brique">
          {erreur}
        </p>
      )}
    </NoticeCard>
  );
}

// ============================================================
// PAGE PRINCIPALE DES PAIEMENTS
// ============================================================

export default function PaiementsPage() {
  const { utilisateur } = useAuth();

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

        const idsAvecPaiement = new Set(
          mesTransactions.map(
            (transaction) =>
              transaction.candidatureId,
          ),
        );

        setTransactions(mesTransactions);

        setCandidaturesAPayer(
          mesCandidatures.filter(
            (candidature) =>
              candidature.statut === "acceptee" &&
              !idsAvecPaiement.has(
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
  //
  // Promise.resolve().then() permet de ne pas déclencher
  // directement une mise à jour d'état dans le corps du useEffect.
  //

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
  // RECHARGER APRÈS UNE ACTION UTILISATEUR
  // ==========================================================

  const recharger = async () => {
    setChargement(true);
    await charger();
  };

  // ==========================================================
  // PROTECTION
  // ==========================================================

  if (!utilisateur) {
    return null;
  }

  // ==========================================================
  // CALCUL DU TOTAL REÇU PAR L'ÉTUDIANT
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
  // AFFICHAGE
  // ==========================================================

  return (
    <div>
      <PageHeader
        icon={Wallet}
        eyebrow="Suivi financier"
        title="Paiements"
      />

      {/* ======================================================
          TOTAL POUR L'ÉTUDIANT
         ====================================================== */}

      {utilisateur.role === "etudiant" && (
        <NoticeCard className="mb-6">
          <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">
            Total reçu (fonds libérés)
          </p>

          <p className="mt-1 font-display text-3xl">
            {formatArgent(totalRecu)}
          </p>
        </NoticeCard>
      )}

      {/* ======================================================
          MISSIONS À PAYER POUR LE CLIENT
         ====================================================== */}

      {utilisateur.role === "client" &&
        candidaturesAPayer.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-3 font-display text-lg font-semibold">
              Missions en attente de paiement
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
                          "Mission"}
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
                        Déclarer le paiement
                      </Button>
                    </NoticeCard>
                  ),
                )}
              </div>
            )}
          </div>
        )}

      {/* ======================================================
          HISTORIQUE DES TRANSACTIONS
         ====================================================== */}

      <h2 className="mb-3 font-display text-lg font-semibold">
        Historique
      </h2>

      {chargement ? (
        <p className="text-sm text-ink-soft">
          Chargement…
        </p>
      ) : transactions.length === 0 ? (
        <NoticeCard>
          <p className="text-sm text-ink-soft/70">
            Aucun paiement pour le moment.
          </p>
        </NoticeCard>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {transactions.map((transaction) => (
            <CarteTransaction
              key={transaction.id}
              transaction={transaction}
            />
          ))}
        </div>
      )}
    </div>
  );
}