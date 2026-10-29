"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Check,
  Play,
} from "lucide-react";

import { Button } from "@/components/ui/Button";

import {
  NoticeCard,
} from "@/components/ui/Notice";
import { TypeMoyenPaiement, MoyenPaiement } from "@/features/moyens-paiement/moyens-paiement.types";
import { typeLabel } from "@/features/moyens-paiement/utils/moyens-paiement";

// ============================================================
// MODALE ACTIVATION
// ============================================================

export function ModalActivation({
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

  const activation = !moyen.actif;

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
            {activation ? (
              <Play size={20} />
            ) : (
              <Check size={20} />
            )}
          </span>

          <div>
            <h2 className="font-display text-lg font-medium">
              {activation
                ? t("activateTitle")
                : t("deactivateTitle")}
            </h2>

            <p className="mt-2 text-sm leading-6 text-ink-soft">
              {libelleType(moyen.type)} — {moyen.numero}
            </p>

            <p className="mt-2 text-sm leading-6 text-ink-soft">
              {activation
                ? t("activateHint")
                : t("deactivateHint")}
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
            {chargement
              ? t("saving")
              : activation
                ? t("activate")
                : t("deactivate")}
          </Button>
        </div>
      </NoticeCard>
    </div>
  );
}
