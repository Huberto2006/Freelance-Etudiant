"use client";

import { useId } from "react";
import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { TAILLES_PAGE } from "./types";

export function DataTableToolbar({
  taillePage,
  onTaillePage,
  recherche,
  onRecherche,
  placeholderRecherche,
  libelleRecherche,
  filtres,
  reinitialisable,
  onReinitialiser,
}: {
  taillePage: number;
  onTaillePage: (taille: number) => void;
  recherche: string;
  onRecherche: (terme: string) => void;
  placeholderRecherche?: string;
  libelleRecherche?: string;
  filtres?: ReactNode;
  reinitialisable: boolean;
  onReinitialiser: () => void;
}) {
  const t = useTranslations("common");
  const idTaille = useId();

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="flex items-center gap-2">
        <label
          htmlFor={idTaille}
          className="whitespace-nowrap text-xs text-ink-soft"
        >
          {t("dataTable.rowsPerPage")}
        </label>
        <Select
          id={idTaille}
          value={taillePage}
          onChange={(event) => onTaillePage(Number(event.target.value))}
          className="w-20"
        >
          {TAILLES_PAGE.map((taille) => (
            <option key={taille} value={taille}>
              {taille}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
        {placeholderRecherche !== undefined && (
          <div className="relative w-full sm:w-64">
            <Search
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
            />
            <Input
              type="search"
              value={recherche}
              onChange={(event) => onRecherche(event.target.value)}
              placeholder={placeholderRecherche}
              aria-label={libelleRecherche ?? t("actions.search")}
              className="pl-9"
            />
          </div>
        )}
        {filtres}
        {reinitialisable && (
          <Button size="sm" variant="ghost" onClick={onReinitialiser}>
            {t("actions.reset")}
          </Button>
        )}
      </div>
    </div>
  );
}
