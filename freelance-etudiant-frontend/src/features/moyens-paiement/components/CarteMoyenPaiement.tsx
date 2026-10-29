"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Check,
  MoreVertical,
  Pencil,
  Play,
  Star,
  Trash2,
} from "lucide-react";

import {
  NoticeCard,
  Tag,
} from "@/components/ui/Notice";
import { TypeMoyenPaiement, MoyenPaiement, ActionMoyen } from "@/features/moyens-paiement/moyens-paiement.types";
import { typeLabel } from "@/features/moyens-paiement/utils/moyens-paiement";
import { IconeMoyen } from "@/features/moyens-paiement/components/IconeMoyen";

// ============================================================
// CARTE MOYEN
// ============================================================

export function CarteMoyenPaiement({
  moyen,
  onAction,
}: {
  moyen: MoyenPaiement;
  onAction: (action: Exclude<ActionMoyen, null>) => void;
}) {
  const t = useTranslations("settings.studentMethods");
  const libelleType = (ty: TypeMoyenPaiement) =>
    ty === "BANQUE" ? t("bankAccount") : typeLabel[ty];
  const [menuOuvert, setMenuOuvert] = useState(false);

  return (
    <NoticeCard className="relative">
      <div className="flex items-start gap-4">
        <span
          className="
            flex h-11 w-11 shrink-0 items-center justify-center
            rounded-full bg-ocre/10 text-ocre-dark
          "
        >
          <IconeMoyen type={moyen.type} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-lg font-medium">
                  {libelleType(moyen.type)}
                </h2>

                {moyen.principal && (
                  <Tag tone="ocre">
                    <span className="inline-flex items-center gap-1">
                      <Star size={12} />
                      {t("primary")}
                    </span>
                  </Tag>
                )}

                <Tag tone={moyen.actif ? "rice" : "brique"}>
                  {moyen.actif ? t("active") : t("inactive")}
                </Tag>
              </div>

              {moyen.type === "BANQUE" &&
                moyen.nomBanque && (
                  <p className="mt-1 text-sm text-ink-soft">
                    {moyen.nomBanque}
                  </p>
                )}

              {moyen.type !== "BANQUE" &&
                moyen.operateur && (
                  <p className="mt-1 text-sm text-ink-soft">
                    {moyen.operateur}
                  </p>
                )}
            </div>

            {/* MENU ⋮ */}
            <div className="relative shrink-0">
              <button
                type="button"
                aria-label={t("actionsFor", { type: libelleType(moyen.type) })}
                aria-expanded={menuOuvert}
                className="
                  rounded-lg p-2
                  text-ink-soft
                  transition-colors
                  hover:bg-paper-light
                  hover:text-ink
                "
                onClick={() =>
                  setMenuOuvert((ouvert) => !ouvert)
                }
              >
                <MoreVertical size={18} />
              </button>

              {menuOuvert && (
                <>
                  <button
                    type="button"
                    aria-label={t("closeMenu")}
                    className="fixed inset-0 z-20 cursor-default"
                    onClick={() => setMenuOuvert(false)}
                  />

                  <div
                    className="
                      absolute right-0 top-10 z-30
                      w-56 overflow-hidden
                      rounded-xl
                      border border-ink/10
                      bg-paper
                      p-1
                      shadow-lg
                    "
                  >
                    {/* MODIFIER */}
                    <button
                      type="button"
                      className="
                        flex w-full items-center gap-3
                        rounded-lg px-3 py-2.5
                        text-left text-sm text-ink
                        transition-colors
                        hover:bg-paper-light
                      "
                      onClick={() => {
                        setMenuOuvert(false);
                        onAction("modifier");
                      }}
                    >
                      <Pencil size={16} />
                      {t("edit")}
                    </button>

                    {/* PRINCIPAL */}
                    {!moyen.principal && moyen.actif && (
                      <button
                        type="button"
                        className="
                          flex w-full items-center gap-3
                          rounded-lg px-3 py-2.5
                          text-left text-sm text-ink
                          transition-colors
                          hover:bg-paper-light
                        "
                        onClick={() => {
                          setMenuOuvert(false);
                          onAction("principal");
                        }}
                      >
                        <Star size={16} />
                        {t("setPrimary")}
                      </button>
                    )}

                    {/* ACTIVATION */}
                    <button
                      type="button"
                      className="
                        flex w-full items-center gap-3
                        rounded-lg px-3 py-2.5
                        text-left text-sm text-ink
                        transition-colors
                        hover:bg-paper-light
                      "
                      onClick={() => {
                        setMenuOuvert(false);
                        onAction("actif");
                      }}
                    >
                      {moyen.actif ? (
                        <>
                          <Check size={16} />
                          {t("deactivate")}
                        </>
                      ) : (
                        <>
                          <Play size={16} />
                          {t("activate")}
                        </>
                      )}
                    </button>

                    <div className="my-1 border-t border-ink/10" />

                    {/* SUPPRIMER */}
                    <button
                      type="button"
                      className="
                        flex w-full items-center gap-3
                        rounded-lg px-3 py-2.5
                        text-left text-sm
                        text-brique-dark
                        transition-colors
                        hover:bg-brique/5
                      "
                      onClick={() => {
                        setMenuOuvert(false);
                        onAction("supprimer");
                      }}
                    >
                      <Trash2 size={16} />
                      {t("delete")}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mt-4">
            <p className="font-mono text-base tracking-wide text-ink">
              {moyen.numero}
            </p>

            <p className="mt-1 text-sm text-ink-soft">
              {t("holder", { nom: moyen.nomTitulaire })}
            </p>
          </div>
        </div>
      </div>
    </NoticeCard>
  );
}
