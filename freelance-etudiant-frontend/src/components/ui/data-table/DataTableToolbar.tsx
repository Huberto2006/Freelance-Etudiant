"use client";

import { useId } from "react";
import type { ReactNode } from "react";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
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
  filtresActifs,
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
  filtresActifs: boolean;
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
              type="text"
              role="searchbox"
              value={recherche}
              onChange={(event) => onRecherche(event.target.value)}
              placeholder={placeholderRecherche}
              aria-label={libelleRecherche ?? t("actions.search")}
              className={recherche ? "pr-9 pl-9" : "pl-9"}
            />
            {recherche !== "" && (
              <button
                type="button"
                onClick={() => onRecherche("")}
                aria-label={t("actions.clearSearch")}
                className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-ink-soft hover:bg-ink/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink pointer-coarse:h-11 pointer-coarse:w-11"
              >
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </div>
        )}
        {filtres !== undefined && (
          <details className="group relative">
            <summary
              aria-label={
                filtresActifs
                  ? t("dataTable.filtersActive")
                  : t("dataTable.filters")
              }
              className="inline-flex min-h-9 cursor-pointer list-none items-center gap-2 rounded-md border border-ink/15 bg-paper-light px-3 text-sm font-medium text-ink transition-colors hover:border-ink/30 hover:bg-ink/[0.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink marker:hidden pointer-coarse:min-h-11 [&::-webkit-details-marker]:hidden"
            >
              <SlidersHorizontal size={15} aria-hidden="true" />
              <span>{t("dataTable.filters")}</span>
              {filtresActifs && (
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full bg-ocre"
                />
              )}
              <ChevronDown
                size={14}
                aria-hidden="true"
                className="transition-transform group-open:rotate-180"
              />
            </summary>
            <div className="absolute right-0 z-30 mt-2 w-[min(42rem,calc(100vw-2rem))] rounded-lg border border-ink/10 bg-paper-light p-3 shadow-lg">
              <p className="mb-2 text-xs font-semibold text-ink-soft">
                {t("dataTable.filters")}
                {filtresActifs && (
                  <span className="ml-2 font-normal text-ocre-dark">
                    {t("dataTable.filtersActive")}
                  </span>
                )}
              </p>
              <div className="flex flex-wrap items-center gap-2">{filtres}</div>
            </div>
          </details>
        )}
        {reinitialisable && (
          <Button size="sm" variant="ghost" onClick={onReinitialiser}>
            {t("actions.reset")}
          </Button>
        )}
      </div>
    </div>
  );
}
