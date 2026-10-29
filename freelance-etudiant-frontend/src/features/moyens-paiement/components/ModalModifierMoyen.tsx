"use client";

import { useTranslations } from "next-intl";
import { MoyenPaiement } from "@/features/moyens-paiement/moyens-paiement.types";
import { FormulaireMoyen } from "@/features/moyens-paiement/components/FormulaireMoyen";

// ============================================================
// FORMULAIRE MODIFICATION
// ============================================================

export function ModalModifierMoyen({
  moyen,
  onFermer,
  onModifie,
}: {
  moyen: MoyenPaiement;
  onFermer: () => void;
  onModifie: () => Promise<void>;
}) {
  const t = useTranslations("settings.studentMethods");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto">
        <FormulaireMoyen
          titre={t("editTitle")}
          description={t("editDescription")}
          moyenInitial={moyen}
          onFermer={onFermer}
          onTermine={onModifie}
        />
      </div>
    </div>
  );
}
