"use client";

import { useEffect, useState } from "react";

type Theme = "clair" | "sombre";

function appliquer(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "sombre");
}

export function BasculeTheme() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const stocke = window.localStorage.getItem("kianja-theme");
    const initial: Theme =
      stocke === "sombre" || stocke === "clair"
        ? stocke
        : document.documentElement.classList.contains("dark")
          ? "sombre"
          : "clair";
    setTheme(initial);
    appliquer(initial);
  }, []);

  function basculer() {
    const suivant: Theme = theme === "sombre" ? "clair" : "sombre";
    setTheme(suivant);
    appliquer(suivant);
    window.localStorage.setItem("kianja-theme", suivant);
  }

  const sombre = theme === "sombre";

  return (
    <button
      type="button"
      onClick={basculer}
      aria-label={sombre ? "Passer en mode clair" : "Passer en mode sombre"}
      title={sombre ? "Mode clair" : "Mode sombre"}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-ink/20 text-ink-soft transition-colors hover:border-ocre hover:text-ocre-dark"
    >
      {theme === null ? (
        <span className="block h-4 w-4" />
      ) : sombre ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path strokeLinecap="round" d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5Z" />
        </svg>
      )}
    </button>
  );
}
