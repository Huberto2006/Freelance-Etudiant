"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Star,
} from "lucide-react";

import { Button } from "@/components/ui/Button";

import {
  NoticeCard,
} from "@/components/ui/Notice";
import { TypeMoyenPaiement, MoyenPaiement } from "@/features/moyens-paiement/moyens-paiement.types";
import { typeLabel } from "@/features/moyens-paiement/utils/moyens-paiement";

// ============================================================
// MODALE PRINCIPAL
// ============================================================

export function ModalPrincipal({
  moyen,
  onFermer,
  onConfirmer,
}: {
  moyen: MoyenPaiement;
  onFermer: () => void;
  onConfirmer: () => Promise<void>;
}) {
  const t = useTranslations("settings.studentMethods");
  const libelleType = (ty: TypeMoyenPaiement) =>
    ty === "BANQUE" ? t("bankAccount") : typeLabel[ty];
  const [chargement, setChargement] = useState(false);

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
        <div className="flex items-start gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ocre/10 text-ocre-dark">
            <Star size={20} />
          </span>

          <div>
            <h2 className="font-display text-lg font-medium">
              {t("primaryTitle")}
            </h2>

            <p className="mt-2 text-sm leading-6 text-ink-soft">
              {libelleType(moyen.type)} — {moyen.numero}
            </p>

            <p className="mt-2 text-sm leading-6 text-ink-soft">
              {t("primaryModalHint")}
            </p>
          </div>
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
            {chargement ? t("saving") : t("confirm")}
          </Button>
        </div>
      </NoticeCard>
    </div>
  );
}
