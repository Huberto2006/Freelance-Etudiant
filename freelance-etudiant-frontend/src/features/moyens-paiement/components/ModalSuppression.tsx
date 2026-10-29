"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";

import {
  NoticeCard,
} from "@/components/ui/Notice";
import { TypeMoyenPaiement, MoyenPaiement } from "@/features/moyens-paiement/moyens-paiement.types";
import { typeLabel } from "@/features/moyens-paiement/utils/moyens-paiement";

// ============================================================
// MODALE SUPPRESSION
// ============================================================

export function ModalSuppression({
  moyen,
  onFermer,
  onConfirmer,
}: {
  moyen: MoyenPaiement;
  onFermer: () => void;
  onConfirmer: () => Promise<void>;
}) {
  const [chargement, setChargement] = useState(false);
  const t = useTranslations("settings.studentMethods");
  const libelleType = (ty: TypeMoyenPaiement) =>
    ty === "BANQUE" ? t("bankAccount") : typeLabel[ty];

  async function confirmer() {
    setChargement(true);

    try {
      await onConfirmer();
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4">
      <NoticeCard className="w-full max-w-md">
        <div>
          <h2 className="font-display text-lg font-medium">
            {t("deleteTitle")}
          </h2>

          <p className="mt-3 text-sm leading-6 text-ink-soft">
            {t("aboutToDelete")}
          </p>

          <div className="mt-3 rounded-lg bg-paper-light px-4 py-3">
            <p className="font-medium text-ink">
              {libelleType(moyen.type)}
            </p>

            <p className="mt-1 font-mono text-sm text-ink-soft">
              {moyen.numero}
            </p>

            <p className="mt-1 text-sm text-ink-soft">
              {moyen.nomTitulaire}
            </p>
          </div>

          <p className="mt-4 text-sm leading-6 text-ink-soft">
            {t("deleteHint")}
          </p>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            onClick={onFermer}
            disabled={chargement}
          >
            {t("cancel")}
          </Button>

          <Button
            variant="primary"
            onClick={() => void confirmer()}
            disabled={chargement}
          >
            {chargement
              ? t("deleting")
              : t("delete")}
          </Button>
        </div>
      </NoticeCard>
    </div>
  );
}
