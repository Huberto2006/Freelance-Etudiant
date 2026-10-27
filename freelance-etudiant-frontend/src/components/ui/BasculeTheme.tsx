"use client";

import { useTranslations } from "next-intl";
import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/lib/theme-context";

/**
 * Bouton de bascule rapide entre Mode Clair et Mode Sombre.
 * Consomme le ThemeProvider centralisé pour garantir la synchronisation
 * globale et instantanée de tout le frontend.
 */
export function BasculeTheme() {
  const t = useTranslations("settings.theme");
  const { mode, basculerMode, estInitialise } = useTheme();

  if (!estInitialise) {
    return (
      <button
        type="button"
        disabled
        aria-label={t("loading")}
        title={t("loading")}
        className="
          flex h-9 w-9
          items-center justify-center
          rounded-lg
          border border-ink/15
          text-ink-soft
          opacity-50
        "
      >
        <span
          className="
            h-4 w-4
            animate-pulse
            rounded-full
            bg-current
          "
        />
      </button>
    );
  }

  const modeSombre = mode === "sombre";

  return (
    <button
      type="button"
      onClick={basculerMode}
      aria-label={
        modeSombre
          ? t("switchToLight")
          : t("switchToDark")
      }
      title={
        modeSombre
          ? t("switchToLight")
          : t("switchToDark")
      }
      className="
        group
        flex h-9 w-9
        items-center justify-center
        rounded-lg
        border border-ink/15
        text-ink-soft
        transition-colors duration-150
        hover:border-ink/30
        hover:bg-ink/5
        hover:text-ink
        active:scale-95
      "
    >
      <span
        className="
          flex h-full w-full
          items-center justify-center
          transition-transform duration-300
          
        "
      >
        {modeSombre ? (
          <Sun size={18} strokeWidth={1.85} aria-hidden="true" />
        ) : (
          <Moon size={18} strokeWidth={1.85} aria-hidden="true" />
        )}
      </span>
    </button>
  );
}