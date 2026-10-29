"use client";

import { useEffect, useState } from "react";
import {
  X,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";

import type { Candidature } from "@/types/candidatures";
import type { MethodePaiement, Transaction } from "@/types/paiements";

import { useTranslations } from "next-intl";
import { useFormats } from "@/i18n/use-formats";

import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import {
  NoticeCard,
} from "@/components/ui/Notice";
import { MoyenPaiement, ReponseMoyensPaiementCandidature, MoyenPaiementClient } from "@/features/paiements/paiements.types";
import { typeMoyenPaiementLabel, lienPaiementSur } from "@/features/paiements/utils/paiements";
import { CarteMoyenPaiement } from "@/features/paiements/components/CarteMoyenPaiement";

// ============================================================
// FORMULAIRE DE DÉCLARATION D'UN PAIEMENT
// ============================================================

export function FormulairePaiement({
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
