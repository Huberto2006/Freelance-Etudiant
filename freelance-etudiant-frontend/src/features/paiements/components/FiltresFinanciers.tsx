"use client";

import { useTranslations } from "next-intl";
import { Select } from "@/components/ui/Field";
import { FiltrePeriode } from "@/components/ui/data-table/FiltrePeriode";
import { useLabels } from "@/i18n/use-labels";
import type { MethodePaiement, StatutTransaction } from "@/types/paiements";

export interface ValeursFiltresFinanciers {
  statut: StatutTransaction | "";
  methode: MethodePaiement | "";
  depuis: string;
  jusqua: string;
}

export const FILTRES_FINANCIERS_VIDES: ValeursFiltresFinanciers = {
  statut: "",
  methode: "",
  depuis: "",
  jusqua: "",
};

const METHODES: MethodePaiement[] = [
  "papi",
  "mvola",
  "orange_money",
  "airtel_money",
  "virement",
];

export function FiltresFinanciers({
  valeur,
  statuts,
  onChange,
}: {
  valeur: ValeursFiltresFinanciers;
  statuts?: readonly StatutTransaction[];
  onChange: (valeur: ValeursFiltresFinanciers) => void;
}) {
  const t = useTranslations("payments.table");
  const { methodePaiement, statutTransaction } = useLabels();
  const statutsDisponibles = statuts ?? [];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {statuts && (
        <Select
          aria-label={t("filterStatus")}
          value={valeur.statut}
          onChange={(event) => {
            const statut =
              statutsDisponibles.find(
                (option) => option === event.target.value,
              ) ?? "";
            onChange({
              ...valeur,
              statut,
            });
          }}
          className="w-40"
        >
          <option value="">{t("allStatuses")}</option>
          {statuts.map((statut) => (
            <option key={statut} value={statut}>
              {statutTransaction(statut)}
            </option>
          ))}
        </Select>
      )}
      <Select
        aria-label={t("filterMethod")}
        value={valeur.methode}
        onChange={(event) => {
        const methode =
          METHODES.find((option) => option === event.target.value) ?? "";
        onChange({
          ...valeur,
          methode,
        });
        }}
        className="w-40"
      >
        <option value="">{t("allMethods")}</option>
        {METHODES.map((methode) => (
          <option key={methode} value={methode}>
            {methodePaiement(methode)}
          </option>
        ))}
      </Select>
      <FiltrePeriode
        valeur={{ depuis: valeur.depuis, jusqua: valeur.jusqua }}
        onChange={(periode) => onChange({ ...valeur, ...periode })}
      />
    </div>
  );
}
