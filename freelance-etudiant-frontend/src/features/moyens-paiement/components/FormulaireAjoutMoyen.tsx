"use client";

import { useTranslations } from "next-intl";
import { FormulaireMoyen } from "@/features/moyens-paiement/components/FormulaireMoyen";

// ============================================================
// FORMULAIRE AJOUT
// ============================================================

export function FormulaireAjoutMoyen({
  onFermer,
  onAjoute,
}: {
  onFermer: () => void;
  onAjoute: () => Promise<void>;
}) {
  const t = useTranslations("settings.studentMethods");
  return (
    <FormulaireMoyen
      titre={t("addTitle")}
      description={t("addDescription")}
      moyenInitial={null}
      onFermer={onFermer}
      onTermine={onAjoute}
    />
  );
}
