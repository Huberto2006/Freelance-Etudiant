"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_MODE,
  DEFAULT_THEME_ID,
  THEMES,
  estModeTheme,
  estThemeId,
  getTheme,
  type ModeTheme,
  type ThemeConfig,
  type ThemeId,
} from "./theme-config";

const STORAGE_THEME_ID_KEY = "kianja-theme-id";
const STORAGE_MODE_KEY = "kianja-theme-mode";
const LEGACY_STORAGE_KEY = "kianja-theme"; // Rétrocompatibilité avec l'ancienne clé

export interface ThemeContextValue {
  themeId: ThemeId;
  setTheme: (id: ThemeId) => void;
  mode: ModeTheme;
  setMode: (mode: ModeTheme) => void;
  basculerMode: () => void;
  themeConfig: ThemeConfig;
  themesDisponibles: ThemeConfig[];
  estInitialise: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Applique le thème et le mode directement sur l'élément <html> racine.
 */
export function appliquerThemeAuDOM(themeId: ThemeId, mode: ModeTheme) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;

  // 1. Applique le dataset pour les règles CSS [data-theme="..."]
  root.dataset.theme = themeId;

  // 2. Bascule la classe "dark" pour le mode sombre
  if (mode === "sombre") {
    root.classList.add("dark");
    root.style.colorScheme = "dark";
  } else {
    root.classList.remove("dark");
    root.style.colorScheme = "light";
  }
}

/**
 * Lit les préférences de thème enregistrées ou les valeurs par défaut.
 */
function lirePreferencesInitiales(): { themeId: ThemeId; mode: ModeTheme } {
  if (typeof window === "undefined") {
    return { themeId: DEFAULT_THEME_ID, mode: DEFAULT_MODE };
  }

  try {
    const rawThemeId = window.localStorage.getItem(STORAGE_THEME_ID_KEY);
    const themeId = estThemeId(rawThemeId) ? rawThemeId : DEFAULT_THEME_ID;

    // Vérifie d'abord la nouvelle clé de mode, puis l'ancienne clé, puis prefers-color-scheme
    const rawMode = window.localStorage.getItem(STORAGE_MODE_KEY);
    const legacyMode = window.localStorage.getItem(LEGACY_STORAGE_KEY);

    let mode: ModeTheme = DEFAULT_MODE;
    if (estModeTheme(rawMode)) {
      mode = rawMode;
    } else if (estModeTheme(legacyMode)) {
      mode = legacyMode;
    } else if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      mode = "sombre";
    }

    return { themeId, mode };
  } catch {
    return { themeId: DEFAULT_THEME_ID, mode: DEFAULT_MODE };
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>(DEFAULT_THEME_ID);
  const [mode, setModeState] = useState<ModeTheme>(DEFAULT_MODE);
  const [estInitialise, setEstInitialise] = useState(false);

  // Initialisation côté client au montage
  useEffect(() => {
    const { themeId: initialTheme, mode: initialMode } =
      lirePreferencesInitiales();

    appliquerThemeAuDOM(initialTheme, initialMode);

    void Promise.resolve().then(() => {
      setThemeIdState(initialTheme);
      setModeState(initialMode);
      setEstInitialise(true);
    });
  }, []);

  const setTheme = useCallback((nouveauThemeId: ThemeId) => {
    if (!estThemeId(nouveauThemeId)) return;

    setThemeIdState(nouveauThemeId);
    try {
      window.localStorage.setItem(STORAGE_THEME_ID_KEY, nouveauThemeId);
    } catch {
      // Ignorer si localStorage désactivé
    }

    // Mise à jour synchrone du DOM pour effet instantané
    if (typeof document !== "undefined") {
      document.documentElement.dataset.theme = nouveauThemeId;
    }
  }, []);

  const setMode = useCallback((nouveauMode: ModeTheme) => {
    if (!estModeTheme(nouveauMode)) return;

    setModeState(nouveauMode);
    try {
      window.localStorage.setItem(STORAGE_MODE_KEY, nouveauMode);
      window.localStorage.setItem(LEGACY_STORAGE_KEY, nouveauMode);
    } catch {
      // Ignorer si localStorage désactivé
    }

    if (typeof document !== "undefined") {
      const root = document.documentElement;
      if (nouveauMode === "sombre") {
        root.classList.add("dark");
        root.style.colorScheme = "dark";
      } else {
        root.classList.remove("dark");
        root.style.colorScheme = "light";
      }
    }
  }, []);

  const basculerMode = useCallback(() => {
    const suivant: ModeTheme = mode === "clair" ? "sombre" : "clair";
    setMode(suivant);
  }, [mode, setMode]);

  const themeConfig = useMemo(() => getTheme(themeId), [themeId]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeId,
      setTheme,
      mode,
      setMode,
      basculerMode,
      themeConfig,
      themesDisponibles: THEMES,
      estInitialise,
    }),
    [
      themeId,
      setTheme,
      mode,
      setMode,
      basculerMode,
      themeConfig,
      estInitialise,
    ],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme doit être utilisé à l'intérieur d'un ThemeProvider");
  }
  return ctx;
}
