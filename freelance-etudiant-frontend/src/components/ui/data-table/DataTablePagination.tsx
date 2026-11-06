"use client";

import { clsx } from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { ELLIPSE, plagePages, type Pagination } from "./utils";

const classeBouton =
  "inline-flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-md border px-2 text-xs tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-40 pointer-coarse:h-11 pointer-coarse:min-w-11";

export function DataTablePagination({
  pagination,
  onPage,
}: {
  pagination: Pagination;
  onPage: (page: number) => void;
}) {
  const t = useTranslations("common");
  const { page, totalPages, debut, fin, total } = pagination;

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <p aria-live="polite" className="text-xs tabular-nums text-ink-soft">
        {t("dataTable.range", { debut: debut + 1, fin, total })}
      </p>

      {totalPages > 1 && (
        <nav aria-label={t("dataTable.pagination")}>
          <ul className="flex items-center gap-1">
            <li>
              <button
                type="button"
                disabled={page === 1}
                onClick={() => onPage(page - 1)}
                aria-label={t("actions.previous")}
                className={clsx(classeBouton, "border-ink/15 text-ink hover:bg-ink/5")}
              >
                <ChevronLeft size={16} aria-hidden="true" />
              </button>
            </li>

            {/* Sur mobile, un repère compact remplace la liste des numéros. */}
            <li className="px-2 text-xs tabular-nums text-ink-soft sm:hidden">
              {t("dataTable.pageOf", { page, totalPages })}
            </li>

            {plagePages(page, totalPages).map((numero, index) =>
              numero === ELLIPSE ? (
                <li
                  key={`ellipse-${index}`}
                  aria-hidden="true"
                  className="hidden w-8 text-center text-xs text-ink-soft sm:block"
                >
                  {ELLIPSE}
                </li>
              ) : (
                <li key={numero} className="hidden sm:block">
                  <button
                    type="button"
                    onClick={() => onPage(numero)}
                    aria-current={numero === page ? "page" : undefined}
                    aria-label={t("dataTable.goToPage", { page: numero })}
                    className={clsx(
                      classeBouton,
                      numero === page
                        ? "border-ink bg-ink text-paper-light"
                        : "border-ink/15 text-ink hover:bg-ink/5",
                    )}
                  >
                    {numero}
                  </button>
                </li>
              ),
            )}

            <li>
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => onPage(page + 1)}
                aria-label={t("actions.next")}
                className={clsx(classeBouton, "border-ink/15 text-ink hover:bg-ink/5")}
              >
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}
