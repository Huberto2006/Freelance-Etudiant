"use client";

import { useEffect, useState } from "react";

type Theme = "clair" | "sombre";

const THEME_KEY = "kianja-theme";

/**
 * Vérifie si une valeur correspond à un thème valide.
 */
function estTheme(value: string | null): value is Theme {
  return value === "clair" || value === "sombre";
}

/**
 * Récupère le thème enregistré.
 */
function lireTheme(): Theme {
  if (typeof window === "undefined") {
    return "clair";
  }

  try {
    const theme = window.localStorage.getItem(THEME_KEY);

    return estTheme(theme) ? theme : "clair";
  } catch {
    return "clair";
  }
}

/**
 * Enregistre le thème.
 */
function enregistrerTheme(theme: Theme) {
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // localStorage indisponible
  }
}

/**
 * Applique le thème au document HTML.
 */
function appliquerTheme(theme: Theme) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.classList.toggle(
    "dark",
    theme === "sombre",
  );
}

export function BasculeTheme() {
  const [theme, setTheme] = useState<Theme>("clair");
  const [estInitialise, setEstInitialise] = useState(false);

  /**
   * Initialisation du thème côté navigateur.
   */
  useEffect(() => {
    const themeInitial = lireTheme();

    // appliquerTheme synchronise un systeme externe (le DOM) : c'est le
    // role legitime d'un effet. Les mises a jour d'etat React sont
    // differees hors du corps synchrone de l'effet (react-hooks/
    // set-state-in-effect).
    appliquerTheme(themeInitial);

    void Promise.resolve().then(() => {
      setTheme(themeInitial);
      setEstInitialise(true);
    });
  }, []);

  /**
   * Change le thème.
   */
  const basculer = () => {
    const nouveauTheme: Theme =
      theme === "clair" ? "sombre" : "clair";

    setTheme(nouveauTheme);
    appliquerTheme(nouveauTheme);
    enregistrerTheme(nouveauTheme);
  };

  /**
   * Évite les différences entre SSR et navigateur.
   */
  if (!estInitialise) {
    return (
      <button
        type="button"
        disabled
        aria-label="Chargement du thème"
        title="Chargement du thème"
        className="
          flex h-9 w-9
          items-center justify-center
          rounded-full
          border border-ink/20
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

  const modeSombre = theme === "sombre";

  return (
    <button
      type="button"
      onClick={basculer}
      aria-label={
        modeSombre
          ? "Passer en mode clair"
          : "Passer en mode sombre"
      }
      title={
        modeSombre
          ? "Passer en mode clair"
          : "Passer en mode sombre"
      }
      className="
        group
        flex h-9 w-9
        items-center justify-center
        rounded-full
        border border-ink/20
        text-ink-soft
        transition-all duration-200
        hover:border-ocre
        hover:bg-ocre/10
        hover:text-ocre-dark
        hover:shadow-sm
        focus:outline-none
        focus:ring-2
        focus:ring-ocre/30
        active:scale-95
      "
    >
      <span
        className="
          flex h-full w-full
          items-center justify-center
          transition-transform duration-300
          group-hover:rotate-12
        "
      >
        {modeSombre ? (
          /* MODE SOMBRE → soleil */
          <svg
            viewBox="0 0 24 24"
            className="h-[18px] w-[18px]"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="4" />

            <path
              strokeLinecap="round"
              d="
                M12 2v2
                M12 20v2
                M2 12h2
                M20 12h2
                M4.93 4.93l1.41 1.41
                M17.66 17.66l1.41 1.41
                M19.07 4.93l-1.41 1.41
                M6.34 17.66l-1.41 1.41
              "
            />
          </svg>
        ) : (
          /* MODE CLAIR → lune */
          <svg
            viewBox="0 0 24 24"
            className="h-[18px] w-[18px]"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="
                M20.5 14.5
                A8.5 8.5 0 1 1
                9.5 3.5
                A6.8 6.8 0 0 0
                20.5 14.5Z
              "
            />
          </svg>
        )}
      </span>
    </button>
  );
}