"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

import { useTranslations } from "next-intl";
import { useFormats } from "@/i18n/use-formats";
import { useLabels } from "@/i18n/use-labels";

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
};

type ReponseMoyensPaiementCandidature = {
  candidatureId: string;
  missionTitre: string;
  montant: number;
  moyensPaiement: MoyenPaiement[];
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

/** Moyen de paiement du CLIENT (RG-PAY-012) : numéro à débiter. */
type MoyenPaiementClient = {
  id: string;
  type: "MVOLA" | "ORANGE_MONEY" | "AIRTEL_MONEY";
  numero: string;
  nomTitulaire: string;
  principal: boolean;
  actif: boolean;
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

/**
 * Lien de paiement fourni par le backend : n'est utilisé que s'il s'agit
 * d'un URL https valide (ou http vers localhost en développement).
 */
function lienPaiementSur(lien?: string | null): string | null {
  if (!lien) return null;
  try {
    const url = new URL(lien);
    const local =
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1");
    return url.protocol === "https:" || local ? url.toString() : null;
  } catch {
    return null;
  }
}

function CarteTransaction({
  transaction,
  onVerifie,
}: {
  transaction: Transaction;
  onVerifie?: () => void;
}) {
  const t = useTranslations("payments.page");
  const { argent: formatArgent, dateCourte: formatDateCourte } = useFormats();
  const { methodePaiement: libelleMethode, statutTransaction: libelleStatut } =
    useLabels();
  const [verification, setVerification] =
    useState(false);

  const [messageVerification, setMessageVerification] =
    useState<string | null>(null);

  // Paiement MVola encore en attente :
  // le frontend demande au backend de vérifier le statut réel
  // auprès du fournisseur.
  const enLigne =
    transaction.provider === "mvola" ||
    transaction.provider === "papi";
  const fournisseur =
    transaction.provider === "papi" ? "Papi" : "MVola";

  const verifiable =
    enLigne &&
    transaction.statut === "en_attente" &&
    Boolean(onVerifie);

  // Lien Papi : seulement s'il est bien en https (jamais de lien
  // arbitraire dans l'interface).
  const lienReprise =
    transaction.provider === "papi" &&
    transaction.statut === "en_attente"
      ? lienPaiementSur(transaction.lienPaiement)
      : null;

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
          ? t("confirmedBy", { fournisseur })
          : maj.statut === "annulee"
            ? t("refusedBy", { fournisseur })
            : transaction.provider === "papi"
              ? t("papiNotConfirmed")
              : t("mvolaNotConfirmed"),
      );

      onVerifie();
    } catch (err) {
      setMessageVerification(
        err instanceof ApiError
          ? err.message
          : t("verifyUnavailable"),
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
              t("mission")}
          </p>

          <p className="mt-0.5 font-mono text-xs text-ink-soft/70">
            {libelleMethode(transaction.methode)} · {t("ref")}{" "}
            {transaction.reference}
            {enLigne ? ` · ${t("online")}` : ""}
          </p>
        </div>

        <Tag tone={toneParStatut[transaction.statut]}>
          {libelleStatut(transaction.statut)}
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

      {(transaction.statut === "confirmee" ||
        transaction.statut === "liberee") && (
        <a
          href={`/tableau-de-bord/paiements/${transaction.id}/facture`}
          className="self-start text-sm text-ink-soft underline underline-offset-4 hover:text-ink"
        >
          {t("viewInvoice")}
        </a>
      )}

      {(verifiable || lienReprise) && (
        <div className="flex flex-wrap items-center gap-3">
          {lienReprise && (
            <a
              href={lienReprise}
              className="inline-flex min-h-10 items-center rounded-lg bg-ink px-4 text-sm font-medium text-paper-light"
            >
              {t("resumePayment")}
            </a>
          )}

          {verifiable && (
            <Button
              variant="secondary"
              disabled={verification}
              onClick={() => void verifier()}
            >
              {verification
                ? t("verifying")
                : t("verifyStatus", { fournisseur })}
            </Button>
          )}
        </div>
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
  const t = useTranslations("payments.page");
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
        w-full rounded-lg border p-4 text-left
        transition-colors duration-150
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
                {moyen.type === "BANQUE" ? t("bankAccount") : typeMoyenPaiementLabel[moyen.type]}
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
              <Tag tone="ocre">{t("primary")}</Tag>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-sm font-medium">
                {moyen.numero}
              </p>

              <p className="mt-0.5 text-xs text-ink-soft">
                {t("holder", { nom: moyen.nomTitulaire })}
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
              aria-label={t("copyNumber", { numero: moyen.numero })}
            >
              {copie ? (
                <>
                  <Check size={14} />
                  {t("copied")}
                </>
              ) : (
                <>
                  <Copy size={14} />
                  {t("copy")}
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
  const t = useTranslations("payments.page");
  const { argent: formatArgent } = useFormats();
  // Le montant n'est PAS modifiable.
  // prixPropose reste la source de vérité côté backend.
  const montant = String(candidature.prixPropose);

  const [methode, setMethode] =
    useState<MethodePaiement>("papi");

  const [telephone, setTelephone] = useState("");
  const [reference, setReference] = useState("");

  // RG-PAY-012 : moyens de paiement du CLIENT (numéros enregistrés),
  // pour ne pas avoir à retaper son numéro MVola à chaque paiement.
  const [moyensClient, setMoyensClient] = useState<MoyenPaiementClient[]>([]);
  const [moyenClientId, setMoyenClientId] = useState("");
  const [saisieLibre, setSaisieLibre] = useState(false);

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
        const reponse = await api.get<ReponseMoyensPaiementCandidature>(
          `/candidatures/${candidature.id}/moyens-paiement`,
        );

        if (!actif) return;

        setMoyensPaiement(reponse.moyensPaiement);

        // Le principal est sélectionné automatiquement.
        const principal =
          reponse.moyensPaiement.find(
            (moyen) => moyen.principal,
          ) ?? reponse.moyensPaiement[0];

        if (principal) {
          setMoyenPaiementId(principal.id);
        }
      } catch (err) {
        if (!actif) return;

        setErreurMoyens(
          err instanceof ApiError
            ? err.message
            : t("errLoadMethods"),
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
  }, [candidature.id, t]);

  // RG-PAY-012 : charge mes propres moyens de paiement une seule fois
  // (indépendant de la candidature) et présélectionne le principal —
  // même logique que côté bénéficiaire.
  useEffect(() => {
    let actif = true;

    api
      .get<MoyenPaiementClient[]>("/moyens-paiement-client")
      .then((moyens) => {
        if (!actif) return;
        const actifs = moyens.filter((m) => m.actif);
        setMoyensClient(actifs);
        const principal = actifs.find((m) => m.principal) ?? actifs[0];
        if (principal) {
          setMoyenClientId(principal.id);
        } else {
          setSaisieLibre(true);
        }
      })
      .catch(() => {
        // Non bloquant : le client peut toujours saisir son numéro
        // directement si ses moyens enregistrés ne chargent pas.
        if (actif) setSaisieLibre(true);
      });

    return () => {
      actif = false;
    };
  }, []);

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
  const paiementPapi = methode === "papi";

  // ==========================================================
  // SOUMISSION
  // ==========================================================

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    setErreur(null);

    if (!moyenPaiementId) {
      setErreur(t("errSelectMethod"));
      return;
    }

    if (!moyenSelectionne) {
      setErreur(t("errMethodUnavailable"));
      return;
    }

    if (paiementMvola && !saisieLibre && !moyenClientId) {
      setErreur(t("errSelectMvola"));
      return;
    }
    if (paiementMvola && saisieLibre && !telephone.trim()) {
      setErreur(t("errEnterMvola"));
      return;
    }

    setEnvoi(true);

    try {
      const creee = await api.post<Transaction>(
        `/candidatures/${candidature.id}/paiement`,
        paiementPapi
          ? {
              montant: Number(montant),
              methode,
              moyenPaiementId,
            }
          : paiementMvola
          ? {
              montant: Number(montant),
              methode,
              ...(saisieLibre
                ? { telephoneDebite: telephone.trim() }
                : { moyenPaiementClientId: moyenClientId }),
              moyenPaiementId,
            }
          : {
              montant: Number(montant),
              methode,
              reference,
              moyenPaiementId,
            },
      );

      // Papi : le client termine son paiement sur la page sécurisée de
      // la passerelle ; il revient ensuite sur cette page (retour=papi).
      const lien = paiementPapi
        ? lienPaiementSur(creee?.lienPaiement)
        : null;
      if (lien) {
        window.location.assign(lien);
        return;
      }

      onEnvoye();
    } catch (err) {
      setErreur(
        err instanceof ApiError
          ? err.message
          : t("errSendPayment"),
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
          {t("declarePaymentTitle", {
            titre: candidature.mission?.titre ?? t("mission"),
          })}
        </p>

        <button
          type="button"
          onClick={onFermer}
          aria-label={t("closeForm")}
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
            {t("whereToPay")}
          </p>

          <p className="mt-0.5 text-xs text-ink-soft">
            {t("selectAccount")}
          </p>
        </div>

        {chargementMoyens && (
          <div className="rounded-xl border border-ink/10 bg-paper-light p-4">
            <p className="text-sm text-ink-soft">
              {t("loadingMethods")}
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
                {t("noActiveMethod")}
              </p>

              <p className="mt-1 text-xs text-ink-soft/70">
                {t("cannotStart")}
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
        {paiementPapi ? (
          <>
            {t("explainPapi")}
          </>
        ) : paiementMvola ? (
          <>
            {t("explainMvola")}
          </>
        ) : (
          <>
            {t("explainTransfer")}
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
              label={t("agreedAmount")}
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
              label={t("method")}
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
                <option value="papi">
                  {t("optPapi")}
                </option>

                <option value="mvola">
                  {t("optMvola")}
                </option>

                <option value="virement">
                  {t("optTransfer")}
                </option>

                <option
                  value="orange_money"
                  disabled
                >
                  {t("optOrange")}
                </option>

                <option
                  value="airtel_money"
                  disabled
                >
                  {t("optAirtel")}
                </option>
              </Select>
            </Field>
          </div>

          {/* NUMÉRO MVOLA DU CLIENT */}

          {paiementPapi ? null : paiementMvola ? (
            <div className="w-full sm:w-56">
              <Field label={t("yourMvola")} htmlFor="telephone">
                {!saisieLibre && moyensClient.length > 0 ? (
                  <>
                    <Select
                      id="telephone"
                      value={moyenClientId}
                      onChange={(e) => {
                        if (e.target.value === "__autre__") {
                          setSaisieLibre(true);
                        } else {
                          setMoyenClientId(e.target.value);
                        }
                      }}
                    >
                      {moyensClient.map((moyen) => (
                        <option key={moyen.id} value={moyen.id}>
                          {moyen.numero}
                          {moyen.principal ? ` (${t("primaryLower")})` : ""}
                        </option>
                      ))}
                      <option value="__autre__">
                        {t("enterOther")}
                      </option>
                    </Select>
                    <p className="mt-1 text-xs text-ink-soft/70">
                      <a
                        href="/tableau-de-bord/parametres/moyens-paiement-client"
                        className="underline hover:text-ink"
                      >
                        {t("manageMethods")}
                      </a>
                    </p>
                  </>
                ) : (
                  <>
                    <Input
                      id="telephone"
                      required
                      value={telephone}
                      onChange={(e) => setTelephone(e.target.value)}
                      placeholder="0341234567"
                    />
                    {moyensClient.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSaisieLibre(false)}
                        className="mt-1 text-xs text-ink-soft underline hover:text-ink"
                      >
                        {t("chooseSaved")}
                      </button>
                    )}
                  </>
                )}
              </Field>
            </div>
          ) : (
            /* RÉFÉRENCE DU VIREMENT */

            <div className="w-full sm:w-56">
              <Field
                label={t("transferRef")}
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
            <p className="font-mono text-[0.6875rem] uppercase tracking-wider text-ink-soft/70">
              {t("recipient")}
            </p>

            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div>
                <p className="font-display font-medium">
                  {moyenSelectionne.type === "BANQUE"
                    ? t("bankAccount")
                    : typeMoyenPaiementLabel[moyenSelectionne.type]}
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
                  {t("holder", { nom: moyenSelectionne.nomTitulaire })}
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
              ? paiementPapi
                ? t("redirecting")
                : t("sending")
              : paiementPapi
                ? t("payWithPapi")
                : paiementMvola
                  ? t("payWithMvola")
                  : t("declareThePayment")}
          </Button>

          {moyensPaiement.length === 0 &&
            !chargementMoyens && (
              <p className="text-xs text-ink-soft">
                {t("configureFirst")}
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