"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/Field";

export interface PeriodeFiltre {
  depuis: string;
  jusqua: string;
}

export function FiltrePeriode({
  valeur,
  onChange,
}: {
  valeur: PeriodeFiltre;
  onChange: (valeur: PeriodeFiltre) => void;
}) {
  const t = useTranslations("common");
  const id = useId();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        id={`${id}-depuis`}
        type="date"
        aria-label={t("dataTable.dateFrom")}
        value={valeur.depuis}
        onChange={(event) =>
          onChange({ ...valeur, depuis: event.target.value })
        }
        className="w-36"
      />
      <Input
        id={`${id}-jusqua`}
        type="date"
        aria-label={t("dataTable.dateTo")}
        value={valeur.jusqua}
        onChange={(event) =>
          onChange({ ...valeur, jusqua: event.target.value })
        }
        className="w-36"
      />
    </div>
  );
}
