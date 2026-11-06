"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import { lienPaiementSur } from "@/features/paiements/utils/paiements";
import { api, ApiError } from "@/lib/api";
import type { Transaction } from "@/types/paiements";

/**
 * Actions d'une ligne de transaction : facture, reprise d'un paiement Papi et
 * vérification du statut réel auprès du fournisseur.
 */
export function ActionsTransaction({
  transaction,
  onVerifie,
}: {
  transaction: Transaction;
  onVerifie: () => void;
}) {
  const t = useTranslations("payments.page");
  const [verification, setVerification] = useState(false);
  const [messageVerification, setMessageVerification] = useState<string | null>(
    null,
  );

  const enLigne =
    transaction.provider === "mvola" || transaction.provider === "papi";
  const fournisseur = transaction.provider === "papi" ? "Papi" : "MVola";
  const verifiable = enLigne && transaction.statut === "en_attente";

  // Lien Papi : seulement s'il est bien en https (jamais de lien arbitraire
  // dans l'interface).
  const lienReprise =
    transaction.provider === "papi" && transaction.statut === "en_attente"
      ? lienPaiementSur(transaction.lienPaiement)
      : null;

  async function verifier() {
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
        err instanceof ApiError ? err.message : t("verifyUnavailable"),
      );
    } finally {
      setVerification(false);
    }
  }

  return (
    <div className="flex min-w-40 flex-col items-start gap-2">
      {(transaction.statut === "confirmee" ||
        transaction.statut === "liberee") && (
        <Link
          href={`/tableau-de-bord/paiements/${transaction.id}/facture`}
          className="text-sm text-ink-soft underline underline-offset-4 hover:text-ink"
        >
          {t("viewInvoice")}
        </Link>
      )}

      {lienReprise && (
        <Button size="sm" href={lienReprise}>
          {t("resumePayment")}
        </Button>
      )}

      {verifiable && (
        <Button
          size="sm"
          variant="secondary"
          disabled={verification}
          onClick={() => void verifier()}
        >
          {verification ? t("verifying") : t("verifyStatus", { fournisseur })}
        </Button>
      )}

      {messageVerification && (
        <p role="status" className="max-w-56 text-xs text-ink-soft">
          {messageVerification}
        </p>
      )}
    </div>
  );
}
