"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Wallet,
  X,
  Copy,
  Check,
  Smartphone,
  Building2,
} from "lucide-react";

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
import { BoutonRetour } from "@/components/ui/BoutonRetour";
import { SousNavigation } from "@/components/ui/SousNavigation";

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
// TYPES MOYENS DE PAIEMENT
// ============================================================

type TypeMoyenPaiement =
  | "MVOLA"
  | "ORANGE_MONEY"
  | "AIRTEL_MONEY"
  | "BANQUE";

type MoyenPaiement = {
  id: string;
  type: TypeMoyenPaiement;
  operateur: string | null;
  nomBanque: string | null;
  numero: string;
  nomTitulaire: string;
  principal: boolean;
  actif: boolean;
};

// ============================================================
// LIBELLES DES MOYENS DE PAIEMENT
// ============================================================

const typeMoyenPaiementLabel: Record<
  TypeMoyenPaiement,
  string
> = {
  MVOLA: "MVola",
  ORANGE_MONEY: "Orange Money",
  AIRTEL_MONEY: "Airtel Money",
  BANQUE: "Compte bancaire",
};

// ============================================================
// ICONE D'UN MOYEN DE PAIEMENT
// ============================================================

function IconeMoyenPaiement({
  type,
}: {
  type: TypeMoyenPaiement;
}) {
  if (type === "BANQUE") {
    return <Building2 size={18} />;
  }

  return <Smartphone size={18} />;
}

// ============================================================
// CARTE D'UNE TRANSACTION
// ============================================================

function CarteTransaction({
  transaction,
  onVerifie,
}: {
  transaction: Transaction;
  onVerifie?: () => void;
}) {
  const [verification, setVerification] =
    useState(false);

  const [messageVerification, setMessageVerification] =
    useState<string | null>(null);

  // Paiement MVola encore en attente :
  // le frontend demande au backend de vérifier le statut réel
  // auprès du fournisseur.
  const verifiable =
    transaction.provider === "mvola" &&
    transaction.statut === "en_attente" &&
    Boolean(onVerifie);

  async function verifier() {
    if (!onVerifie) return;

    setVerification(true);
    setMessageVerification(null);

    try {
      const maj = await api.post<Transaction>(
        `/paiements/${transaction.id}/verifier`,
      );

      setMessageVerification(
        maj.statut === "confirmee"
          ? "Paiement confirmé par MVola."
          : maj.statut === "annulee"
            ? "Paiement refusé par MVola."
            : "MVola n'a pas encore confirmé le paiement. Réessayez après avoir validé la demande USSD.",
      );

      onVerifie();
    } catch (err) {
      setMessageVerification(
        err instanceof ApiError
          ? err.message
          : "Vérification impossible pour le moment.",
      );
    } finally {
      setVerification(false);
    }
  }

  return (
    <NoticeCard className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display font-medium">
            {transaction.candidature?.mission?.titre ??
              "Mission"}
          </p>

          <p className="mt-0.5 font-mono text-xs text-ink-soft/70">
            {methodePaiementLabel[transaction.methode]} · réf.{" "}
            {transaction.reference}
            {transaction.provider === "mvola"
              ? " · en ligne"
              : ""}
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

      {verifiable && (
        <Button
          variant="secondary"
          className="self-start"
          disabled={verification}
          onClick={() => void verifier()}
        >
          {verification
            ? "Vérification…"
            : "Vérifier le statut auprès de MVola"}
        </Button>
      )}

      {messageVerification && (
        <p className="text-xs text-ink-soft">
          {messageVerification}
        </p>
      )}
    </NoticeCard>
  );
}

// ============================================================
// CARTE D'UN MOYEN DE PAIEMENT
// ============================================================

function CarteMoyenPaiement({
  moyen,
  selectionne,
  onSelectionner,
}: {
  moyen: MoyenPaiement;
  selectionne: boolean;
  onSelectionner: () => void;
}) {
  const [copie, setCopie] = useState(false);

  async function copierNumero(e: React.MouseEvent) {
    e.stopPropagation();

    try {
      await navigator.clipboard.writeText(moyen.numero);

      setCopie(true);

      window.setTimeout(() => {
        setCopie(false);
      }, 1800);
    } catch {
      setCopie(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onSelectionner}
      className={`
        w-full rounded-xl border p-4 text-left
        transition-all
        ${
          selectionne
            ? "border-ocre bg-ocre/10 ring-1 ring-ocre/30"
            : "border-ink/10 bg-paper-light hover:border-ink/20 hover:bg-paper"
        }
      `}
    >
      <div className="flex items-start gap-3">
        <div
          className={`
            flex h-9 w-9 shrink-0 items-center justify-center
            rounded-lg
            ${
              selectionne
                ? "bg-ocre text-paper-light"
                : "bg-ink/5 text-ink-soft"
            }
          `}
        >
          <IconeMoyenPaiement type={moyen.type} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display font-medium">
                {typeMoyenPaiementLabel[moyen.type]}
              </p>

              {moyen.type === "BANQUE" &&
                moyen.nomBanque && (
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {moyen.nomBanque}
                  </p>
                )}

              {moyen.type !== "BANQUE" &&
                moyen.operateur && (
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {moyen.operateur}
                  </p>
                )}
            </div>

            {moyen.principal && (
              <Tag tone="ocre">Principal</Tag>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-sm font-medium">
                {moyen.numero}
              </p>

              <p className="mt-0.5 text-xs text-ink-soft">
                Titulaire : {moyen.nomTitulaire}
              </p>
            </div>

            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                void copierNumero(e);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();

                  void navigator.clipboard
                    .writeText(moyen.numero)
                    .then(() => {
                      setCopie(true);

                      window.setTimeout(() => {
                        setCopie(false);
                      }, 1800);
                    })
                    .catch(() => {
                      setCopie(false);
                    });
                }
              }}
              className="
                inline-flex shrink-0 items-center gap-1.5
                rounded-lg border border-ink/10
                px-2.5 py-1.5
                text-xs text-ink-soft
                transition-colors
                hover:bg-ink/5 hover:text-ink
              "
              aria-label={`Copier le numéro ${moyen.numero}`}
            >
              {copie ? (
                <>
                  <Check size={14} />
                  Copié
                </>
              ) : (
                <>
                  <Copy size={14} />
                  Copier
                </>
              )}
            </span>
          </div>
        </div>
      </div>
    </button>
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
  // Le montant n'est PAS modifiable.
  // prixPropose reste la source de vérité côté backend.
  const montant = String(candidature.prixPropose);

  const [methode, setMethode] =
    useState<MethodePaiement>("mvola");

  const [telephone, setTelephone] = useState("");
  const [reference, setReference] = useState("");

  const [
    moyensPaiement,
    setMoyensPaiement,
  ] = useState<MoyenPaiement[]>([]);

  const [
    moyenPaiementId,
    setMoyenPaiementId,
  ] = useState("");

  const [chargementMoyens, setChargementMoyens] =
    useState(true);

  const [
    erreurMoyens,
    setErreurMoyens,
  ] = useState<string | null>(null);

  const [envoi, setEnvoi] = useState(false);

  const [erreur, setErreur] =
    useState<string | null>(null);

  // ==========================================================
  // CHARGER LES MOYENS DE PAIEMENT
  // ==========================================================

  useEffect(() => {
    let actif = true;

    async function chargerMoyens() {
      setChargementMoyens(true);
      setErreurMoyens(null);
      setMoyensPaiement([]);
      setMoyenPaiementId("");

      try {
        const moyens = await api.get<MoyenPaiement[]>(
          `/candidatures/${candidature.id}/moyens-paiement`,
        );

        if (!actif) return;

        const moyensActifs = moyens.filter(
          (moyen) => moyen.actif,
        );

        setMoyensPaiement(moyensActifs);

        // Le principal est sélectionné automatiquement.
        const principal =
          moyensActifs.find(
            (moyen) => moyen.principal,
          ) ?? moyensActifs[0];

        if (principal) {
          setMoyenPaiementId(principal.id);
        }
      } catch (err) {
        if (!actif) return;

        setErreurMoyens(
          err instanceof ApiError
            ? err.message
            : "Impossible de charger les moyens de paiement de l'étudiant.",
        );
      } finally {
        if (actif) {
          setChargementMoyens(false);
        }
      }
    }

    void chargerMoyens();

    return () => {
      actif = false;
    };
  }, [candidature.id]);

  // ==========================================================
  // MOYEN SÉLECTIONNÉ
  // ==========================================================

  const moyenSelectionne =
    moyensPaiement.find(
      (moyen) => moyen.id === moyenPaiementId,
    ) ?? null;

  // ==========================================================
  // MÉTHODE DE PAIEMENT
  // ==========================================================

  const paiementMvola = methode === "mvola";

  // ==========================================================
  // SOUMISSION
  // ==========================================================

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    setErreur(null);

    if (!moyenPaiementId) {
      setErreur(
        "Sélectionnez le moyen de paiement de l'étudiant.",
      );
      return;
    }

    if (!moyenSelectionne) {
      setErreur(
        "Le moyen de paiement sélectionné n'est plus disponible.",
      );
      return;
    }

    setEnvoi(true);

    try {
      await api.post(
        `/candidatures/${candidature.id}/paiement`,
        paiementMvola
          ? {
              montant: Number(montant),
              methode,
              telephoneDebite: telephone,
              moyenPaiementId,
            }
          : {
              montant: Number(montant),
              methode,
              reference,
              moyenPaiementId,
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

  // ==========================================================
  // AFFICHAGE
  // ==========================================================

  return (
    <NoticeCard className="mb-4">
      {/* ------------------------------------------------------
          EN-TÊTE
         ------------------------------------------------------ */}

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

      {/* ------------------------------------------------------
          MOYENS DE PAIEMENT DE L'ÉTUDIANT
         ------------------------------------------------------ */}

      <div className="mb-5">
        <div className="mb-2">
          <p className="font-display text-base font-medium">
            Où effectuer le paiement ?
          </p>

          <p className="mt-0.5 text-xs text-ink-soft">
            Sélectionnez le compte ou numéro de paiement
            de l'étudiant.
          </p>
        </div>

        {chargementMoyens && (
          <div className="rounded-xl border border-ink/10 bg-paper-light p-4">
            <p className="text-sm text-ink-soft">
              Chargement des moyens de paiement…
            </p>
          </div>
        )}

        {!chargementMoyens &&
          erreurMoyens && (
            <div className="rounded-xl border border-brique/20 bg-brique/5 p-4">
              <p className="text-sm text-brique">
                {erreurMoyens}
              </p>
            </div>
          )}

        {!chargementMoyens &&
          !erreurMoyens &&
          moyensPaiement.length === 0 && (
            <div className="rounded-xl border border-ocre/20 bg-ocre/5 p-4">
              <p className="text-sm text-ink-soft">
                Aucun moyen de paiement actif n'est
                actuellement configuré par l'étudiant.
              </p>

              <p className="mt-1 text-xs text-ink-soft/70">
                Le paiement ne peut pas être lancé tant
                qu'un moyen de paiement n'est pas
                disponible.
              </p>
            </div>
          )}

        {!chargementMoyens &&
          !erreurMoyens &&
          moyensPaiement.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {moyensPaiement.map((moyen) => (
                <CarteMoyenPaiement
                  key={moyen.id}
                  moyen={moyen}
                  selectionne={
                    moyen.id === moyenPaiementId
                  }
                  onSelectionner={() =>
                    setMoyenPaiementId(moyen.id)
                  }
                />
              ))}
            </div>
          )}
      </div>

      {/* ------------------------------------------------------
          EXPLICATION
         ------------------------------------------------------ */}

      <p className="mb-4 text-sm text-ink-soft">
        {paiementMvola ? (
          <>
            Vous serez débité depuis votre numéro MVola.
            Une demande de confirmation sera envoyée sur
            votre téléphone. Le paiement sera ensuite
            vérifié par la plateforme auprès de MVola.
          </>
        ) : (
          <>
            Effectuez le virement vers le compte bancaire
            sélectionné ci-dessus, puis renseignez la
            référence du transfert pour permettre sa
            vérification par un administrateur.
          </>
        )}
      </p>

      {/* ------------------------------------------------------
          FORMULAIRE
         ------------------------------------------------------ */}

      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          {/* MONTANT */}

          <div className="w-full sm:w-40">
            <Field
              label="Montant convenu (Ar)"
              htmlFor="montant"
            >
              <Input
                id="montant"
                type="number"
                min={1}
                required
                readOnly
                value={montant}
              />
            </Field>
          </div>

          {/* MÉTHODE */}

          <div className="w-full sm:w-48">
            <Field
              label="Méthode"
              htmlFor="methode"
            >
              <Select
                id="methode"
                value={methode}
                onChange={(e) =>
                  setMethode(
                    e.target.value as MethodePaiement,
                  )
                }
              >
                <option value="mvola">
                  MVola (paiement en ligne)
                </option>

                <option value="virement">
                  Virement bancaire
                </option>

                <option
                  value="orange_money"
                  disabled
                >
                  Orange Money (indisponible)
                </option>

                <option
                  value="airtel_money"
                  disabled
                >
                  Airtel Money (indisponible)
                </option>
              </Select>
            </Field>
          </div>

          {/* NUMÉRO MVOLA DU CLIENT */}

          {paiementMvola ? (
            <div className="w-full sm:w-56">
              <Field
                label="Votre numéro MVola"
                htmlFor="telephone"
              >
                <Input
                  id="telephone"
                  required
                  value={telephone}
                  onChange={(e) =>
                    setTelephone(e.target.value)
                  }
                  placeholder="0341234567"
                />
              </Field>
            </div>
          ) : (
            /* RÉFÉRENCE DU VIREMENT */

            <div className="w-full sm:w-56">
              <Field
                label="Référence du virement"
                htmlFor="reference"
              >
                <Input
                  id="reference"
                  required
                  value={reference}
                  onChange={(e) =>
                    setReference(e.target.value)
                  }
                  placeholder="REF-123456"
                />
              </Field>
            </div>
          )}
        </div>

        {/* ----------------------------------------------------
            RÉCAPITULATIF DU DESTINATAIRE
           ---------------------------------------------------- */}

        {moyenSelectionne && (
          <div className="rounded-xl border border-ink/10 bg-ink/[0.025] p-4">
            <p className="font-mono text-[11px] uppercase tracking-wider text-ink-soft/70">
              Destinataire du paiement
            </p>

            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div>
                <p className="font-display font-medium">
                  {typeMoyenPaiementLabel[
                    moyenSelectionne.type
                  ]}
                  {moyenSelectionne.type ===
                    "BANQUE" &&
                  moyenSelectionne.nomBanque
                    ? ` · ${moyenSelectionne.nomBanque}`
                    : moyenSelectionne.operateur
                      ? ` · ${moyenSelectionne.operateur}`
                      : ""}
                </p>

                <p className="font-mono text-sm text-ink">
                  {moyenSelectionne.numero}
                </p>

                <p className="text-xs text-ink-soft">
                  Titulaire :{" "}
                  {moyenSelectionne.nomTitulaire}
                </p>
              </div>

              <p className="font-mono text-sm font-medium text-ocre-dark">
                {formatArgent(montant)}
              </p>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------
            ACTION
           ---------------------------------------------------- */}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            disabled={
              envoi ||
              chargementMoyens ||
              moyensPaiement.length === 0 ||
              !moyenPaiementId
            }
          >
            {envoi
              ? "Envoi…"
              : paiementMvola
                ? "Payer avec MVola"
                : "Déclarer le paiement"}
          </Button>

          {moyensPaiement.length === 0 &&
            !chargementMoyens && (
              <p className="text-xs text-ink-soft">
                Configurez un moyen de paiement avant de
                poursuivre.
              </p>
            )}
        </div>
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

        // Une candidature est payable uniquement après
        // validation de la livraison par le client.
        setCandidaturesAPayer(
          mesCandidatures.filter(
            (candidature) =>
              candidature.statut === "acceptee" &&
              candidature.livraison?.statut ===
                "validee" &&
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
        eyebrow="Suivi financier"
        title="Paiements"
      />

      {/* ======================================================
          TOTAL ÉTUDIANT
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
          SOUS-MENU
         ====================================================== */}

      <SousNavigation
        onglets={[
          ...(utilisateur.role === "client"
            ? [
                {
                  valeur: "a_payer",
                  label: "À payer",
                  compte:
                    candidaturesAPayer.length,
                },
              ]
            : []),

          {
            valeur: "en_attente",
            label: "En attente",
            compte:
              transactionsEnAttente.length,
          },

          {
            valeur: "confirmes",
            label: "Confirmés",
            compte:
              transactionsConfirmees.length,
          },

          {
            valeur: "historique",
            label: "Historique",
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
          AUCUNE MISSION À PAYER
         ====================================================== */}

      {utilisateur.role === "client" &&
        ongletPaiements === "a_payer" &&
        candidaturesAPayer.length === 0 && (
          <NoticeCard className="mb-6">
            <p className="text-sm text-ink-soft/70">
              Aucune mission en attente de paiement
              pour le moment.
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
              ? "En attente"
              : ongletPaiements === "confirmes"
                ? "Confirmés"
                : "Historique"}
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
                  Chargement…
                </p>
              );
            }

            if (
              transactionsAffichees.length === 0
            ) {
              return (
                <NoticeCard>
                  <p className="text-sm text-ink-soft/70">
                    Aucun paiement dans cette
                    catégorie.
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