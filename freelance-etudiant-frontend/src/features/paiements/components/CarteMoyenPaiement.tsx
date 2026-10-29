"use client";

import { useState } from "react";
import {
  Copy,
  Check,
} from "lucide-react";

import { useTranslations } from "next-intl";
import {
  Tag,
} from "@/components/ui/Notice";
import { MoyenPaiement } from "@/features/paiements/paiements.types";
import { typeMoyenPaiementLabel } from "@/features/paiements/utils/paiements";
import { IconeMoyenPaiement } from "@/features/paiements/components/IconeMoyenPaiement";

// ============================================================
// CARTE D'UN MOYEN DE PAIEMENT
// ============================================================

export function CarteMoyenPaiement({
  moyen,
  selectionne,
  onSelectionner,
}: {
  moyen: MoyenPaiement;
  selectionne: boolean;
  onSelectionner: () => void;
}) {
  const t = useTranslations("payments.page");
  const [copie, setCopie] = useState(false);

  async function copierNumero(e: React.MouseEvent) {
    e.stopPropagation();

    try {
      await navigator.clipboard.writeText(moyen.numero);

      setCopie(true);

      window.setTimeout(() => {
        setCopie(false);
      }, 1800);
    } catch {
      setCopie(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onSelectionner}
      className={`
        w-full rounded-lg border p-4 text-left
        transition-colors duration-150
        ${
          selectionne
            ? "border-ocre bg-ocre/10 ring-1 ring-ocre/30"
            : "border-ink/10 bg-paper-light hover:border-ink/20 hover:bg-paper"
        }
      `}
    >
      <div className="flex items-start gap-3">
        <div
          className={`
            flex h-9 w-9 shrink-0 items-center justify-center
            rounded-lg
            ${
              selectionne
                ? "bg-ocre text-paper-light"
                : "bg-ink/5 text-ink-soft"
            }
          `}
        >
          <IconeMoyenPaiement type={moyen.type} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display font-medium">
                {moyen.type === "BANQUE" ? t("bankAccount") : typeMoyenPaiementLabel[moyen.type]}
              </p>

              {moyen.type === "BANQUE" &&
                moyen.nomBanque && (
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {moyen.nomBanque}
                  </p>
                )}

              {moyen.type !== "BANQUE" &&
                moyen.operateur && (
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {moyen.operateur}
                  </p>
                )}
            </div>

            {moyen.principal && (
              <Tag tone="ocre">{t("primary")}</Tag>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-sm font-medium">
                {moyen.numero}
              </p>

              <p className="mt-0.5 text-xs text-ink-soft">
                {t("holder", { nom: moyen.nomTitulaire })}
              </p>
            </div>

            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                void copierNumero(e);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();

                  void navigator.clipboard
                    .writeText(moyen.numero)
                    .then(() => {
                      setCopie(true);

                      window.setTimeout(() => {
                        setCopie(false);
                      }, 1800);
                    })
                    .catch(() => {
                      setCopie(false);
                    });
                }
              }}
              className="
                inline-flex shrink-0 items-center gap-1.5
                rounded-lg border border-ink/10
                px-2.5 py-1.5
                text-xs text-ink-soft
                transition-colors
                hover:bg-ink/5 hover:text-ink
              "
              aria-label={t("copyNumber", { numero: moyen.numero })}
            >
              {copie ? (
                <>
                  <Check size={14} />
                  {t("copied")}
                </>
              ) : (
                <>
                  <Copy size={14} />
                  {t("copy")}
                </>
              )}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
