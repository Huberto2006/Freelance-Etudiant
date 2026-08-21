"use client";

import {
  useSyncExternalStore,
  useState,
} from "react";

type Theme = "clair" | "sombre";

function appliquer(theme: Theme) {
  document.documentElement.classList.toggle(
    "dark",
    theme === "sombre",
  );
}

function lireTheme(): Theme {
  try {
    const stocke = window.localStorage.getItem("kianja-theme");

    if (stocke === "sombre" || stocke === "clair") {
      return stocke;
    }
  } catch {
    // localStorage indisponible
  }

  return "clair";
}

function subscribe() {
  return () => {};
}

function getSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

export function BasculeTheme() {
  const client = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const [theme, setTheme] = useState<Theme>("clair");

  if (!client) {
    return (
      <button
        type="button"
        disabled
        aria-label="Changer de thème"
        title="Changer de thème"
        className="flex h-8 w-8 items-center justify-center rounded-full border border-ink/20 text-ink-soft opacity-60"
      >
        <span className="h-4 w-4" />
      </button>
    );
  }

  const themeActuel = lireTheme();

  function basculer() {
    const suivant: Theme =
      theme === "sombre" || themeActuel === "sombre"
        ? "clair"
        : "sombre";

    setTheme(suivant);
    appliquer(suivant);

    try {
      window.localStorage.setItem(
        "kianja-theme",
        suivant,
      );
    } catch {
      // localStorage indisponible
    }
  }

  const sombre =
    theme === "sombre" || themeActuel === "sombre";

  return (
    <button
      type="button"
      onClick={basculer}
      aria-label={
        sombre
          ? "Passer en mode clair"
          : "Passer en mode sombre"
      }
      title={sombre ? "Mode clair" : "Mode sombre"}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-ink/20 text-ink-soft transition-colors hover:border-ocre hover:text-ocre-dark"
    >
      {sombre ? (
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path
            strokeLinecap="round"
            d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"
          />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5Z"
          />
        </svg>
      )}
    </button>
  );
}