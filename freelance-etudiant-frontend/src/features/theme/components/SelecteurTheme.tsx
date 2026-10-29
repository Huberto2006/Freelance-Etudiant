"use client";

import { Check, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "@/features/theme/theme-context";
import type { ThemeConfig } from "@/features/theme/theme-config";

interface SelecteurThemeProps {
  variante?: "compact" | "complet";
  className?: string;
}

export function SelecteurTheme({
  variante = "compact",
  className = "",
}: SelecteurThemeProps) {
  const tt = useTranslations("settings.theme");
  const nomTheme = (id: string, repli: string) =>
    tt.has(`names.${id}` as never) ? tt(`names.${id}` as never) : repli;
  const {
    themeId,
    setTheme,
    mode,
    setMode,
    basculerMode,
    themesDisponibles,
    estInitialise,
  } = useTheme();

  if (!estInitialise) {
    return (
      <div className={`animate-pulse flex items-center gap-2 ${className}`}>
        <div className="h-7 w-7 rounded-full bg-ink/10" />
        <div className="h-7 w-7 rounded-full bg-ink/10" />
        <div className="h-7 w-7 rounded-full bg-ink/10" />
      </div>
    );
  }

  /* =========================================================================
     VARIANTE COMPACTE (pour le menu déroulant de la Navbar)
     ========================================================================= */
  if (variante === "compact") {
    return (
      <div className={`space-y-3 ${className}`}>
        {/* Ligne 1 : Mode Clair / Sombre */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-ink">{tt("displayMode")}</p>
            <p className="text-[0.6875rem] text-ink-soft">
              {mode === "sombre" ? tt("dark") : tt("light")}
            </p>
          </div>

          <button
            type="button"
            onClick={basculerMode}
            aria-label={
              mode === "sombre"
                ? tt("switchToLight")
                : tt("switchToDark")
            }
            className="
              flex h-8 w-8 items-center justify-center rounded-lg border border-ink/15
              text-ink-soft transition-colors duration-150
              hover:border-ink/30 hover:bg-ink/5 hover:text-ink
            "
          >
            {mode === "sombre" ? (
              <Sun size={15} className="text-amber-400" />
            ) : (
              <Moon size={15} className="text-ink" />
            )}
          </button>
        </div>

        {/* Ligne 2 : Pastilles des thèmes de couleurs */}
        <div>
          <p className="mb-2 text-[0.6875rem] font-medium text-ink-soft">
            {tt("paletteShort")}
          </p>

          <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label={tt("chooseTheme")}>
            {themesDisponibles.map((t) => {
              const estActif = t.id === themeId;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={estActif}
                  onClick={() => setTheme(t.id)}
                  title={`${nomTheme(t.id, t.nom)} — ${t.typographie.nomDisplay}`}
                  className={`
                    group relative flex flex-col items-center justify-center rounded-lg p-1.5 transition-colors
                    ${
                      estActif
                        ? "bg-ink/10 ring-2 ring-ocre shadow-xs"
                        : "hover:bg-ink/5"
                    }
                  `}
                >
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-full shadow-xs ring-1 ring-black/10"
                    style={{ backgroundColor: t.pastilleCouleur }}
                  >
                    {estActif && (
                      <Check size={11} className="stroke-[3] text-white" />
                    )}
                  </span>
                  <span className="mt-1 max-w-full truncate text-[0.625rem] font-medium text-ink-soft">
                    {nomTheme(t.id, t.nom).split(" ")[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================================
     VARIANTE COMPLÈTE (pour la page Profil / Paramètres)
     ========================================================================= */
  return (
    <div className={`space-y-6 ${className}`}>
      {/* 1. Sélection du mode d'affichage */}
      <div>
        <label className="block text-sm font-medium text-ink">
          {tt("displayMode")}
        </label>
        <p className="mt-0.5 text-xs text-ink-soft">
          {tt("displayModeHint")}
        </p>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:max-w-md">
          <button
            type="button"
            onClick={() => setMode("clair")}
            className={`
              flex items-center gap-3 rounded-xl border p-3 text-left transition-colors
              ${
                mode === "clair"
                  ? "border-ocre bg-ocre/10 shadow-xs ring-1 ring-ocre"
                  : "border-ink/15 hover:border-ink/30 hover:bg-ink/5"
              }
            `}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600">
              <Sun size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">{tt("lightMode")}</p>
              <p className="text-xs text-ink-soft">{tt("lightHint")}</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMode("sombre")}
            className={`
              flex items-center gap-3 rounded-xl border p-3 text-left transition-colors
              ${
                mode === "sombre"
                  ? "border-ocre bg-ocre/10 shadow-xs ring-1 ring-ocre"
                  : "border-ink/15 hover:border-ink/30 hover:bg-ink/5"
              }
            `}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-400">
              <Moon size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">{tt("darkMode")}</p>
              <p className="text-xs text-ink-soft">{tt("darkHint")}</p>
            </div>
          </button>
        </div>
      </div>

      {/* 2. Sélection de la palette & typographie */}
      <div>
        <label className="block text-sm font-medium text-ink">
          {tt("palette")}
        </label>
        <p className="mt-0.5 text-xs text-ink-soft">
          {tt("paletteHint")}
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {themesDisponibles.map((t) => {
            const estActif = t.id === themeId;
            return (
              <CarteThemeItem
                key={t.id}
                theme={t}
                estActif={estActif}
                modeActuel={mode}
                onSelection={() => setTheme(t.id)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CarteThemeItem({
  theme,
  estActif,
  modeActuel,
  onSelection,
}: {
  theme: ThemeConfig;
  estActif: boolean;
  modeActuel: "clair" | "sombre";
  onSelection: () => void;
}) {
  const tt = useTranslations("settings.theme");
  const nomTheme = (id: string, repli: string) =>
    tt.has(`names.${id}` as never) ? tt(`names.${id}` as never) : repli;
  const descTheme = (id: string, repli: string) =>
    tt.has(`descriptions.${id}` as never) ? tt(`descriptions.${id}` as never) : repli;
  const palette = modeActuel === "sombre" ? theme.sombre : theme.clair;

  return (
    <button
      type="button"
      onClick={onSelection}
      className={`
        group relative flex flex-col justify-between rounded-xl border p-4 text-left transition-colors duration-150
        ${
          estActif
            ? "border-ocre bg-ocre/10 shadow-sm ring-2 ring-ocre"
            : "border-ink/15 bg-paper-light hover:border-ink/30 hover:shadow-xs"
        }
      `}
    >
      {/* En-tête avec pastille et nom */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            {/* Double pastille (primaire + accent) */}
            <div className="flex -space-x-1.5">
              <span
                className="h-6 w-6 rounded-full ring-2 ring-paper-light shadow-xs"
                style={{ backgroundColor: theme.pastilleCouleur }}
              />
              <span
                className="h-6 w-6 rounded-full ring-2 ring-paper-light shadow-xs opacity-80"
                style={{ backgroundColor: theme.pastilleAccent }}
              />
            </div>

            <p className="text-sm font-semibold text-ink">{nomTheme(theme.id, theme.nom)}</p>
          </div>

          {estActif && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ocre text-paper-light">
              <Check size={12} className="stroke-[3]" />
            </span>
          )}
        </div>

        <p className="mt-2 text-xs leading-relaxed text-ink-soft">
          {descTheme(theme.id, theme.description)}
        </p>
      </div>

      {/* Mini aperçu visuel (Bouton + Badge + Typo) */}
      <div className="mt-4 border-t border-ink/10 pt-3">
        <div className="flex items-center justify-between gap-2">
          {/* Badge police */}
          <span
            className="truncate rounded-md px-2 py-0.5 text-[0.6875rem] font-medium"
            style={{
              backgroundColor: palette.primarySoft,
              color: palette.primary,
              fontFamily: theme.typographie.fontDisplay,
            }}
          >
            {theme.typographie.nomDisplay.split(" ")[0]}
          </span>

          {/* Mini simulation bouton */}
          <span
            className="rounded-md px-2 py-0.5 text-[0.65rem] font-bold text-white shadow-xs"
            style={{
              backgroundColor: palette.primary,
            }}
          >
            {tt("preview")}
          </span>
        </div>
      </div>
    </button>
  );
}
