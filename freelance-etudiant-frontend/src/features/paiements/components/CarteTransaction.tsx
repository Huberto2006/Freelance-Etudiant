"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Transaction } from "@/types/paiements";

import { useTranslations } from "next-intl";
import { useFormats } from "@/i18n/use-formats";
import { useLabels } from "@/i18n/use-labels";

import { Button } from "@/components/ui/Button";
import {
  NoticeCard,
  Tag,
} from "@/components/ui/Notice";
import { toneParStatut, lienPaiementSur } from "@/features/paiements/utils/paiements";

export function CarteTransaction({
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
