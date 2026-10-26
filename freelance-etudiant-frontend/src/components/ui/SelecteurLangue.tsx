"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Globe } from "lucide-react";
import { clsx } from "clsx";

import { definirLangue } from "@/i18n/actions";
import { LANGUES, LOCALES, normaliserLocale, type Locale } from "@/i18n/config";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

/**
 * Sélecteur de langue (fr / mg / en).
 *
 * - `menu`   : bouton compact + liste déroulante (barres de navigation).
 * - `inline` : trois boutons côte à côte (menu mobile, paramètres).
 *
 * Changer de langue écrit le cookie NEXT_LOCALE (action serveur), synchronise
 * le compte si l'utilisateur est connecté, puis rafraîchit la route : l'URL, la
 * session et les données saisies restent inchangées. Les noms de langue sont
 * toujours écrits dans leur propre langue.
 */
export function SelecteurLangue({
  variant = "menu",
  className,
}: {
  variant?: "menu" | "inline";
  className?: string;
}) {
  const t = useTranslations("common.language");
  const locale = normaliserLocale(useLocale());
  const router = useRouter();
  const { utilisateur } = useAuth();
  const [enCours, demarrer] = useTransition();
  const [ouvert, setOuvert] = useState(false);
  const [erreur, setErreur] = useState(false);
  const conteneurRef = useRef<HTMLDivElement>(null);
  const panneauId = useId();

  useEffect(() => {
    if (!ouvert) return;
    function fermerSiExterieur(e: MouseEvent) {
      if (!conteneurRef.current?.contains(e.target as Node)) setOuvert(false);
    }
    function surEchap(e: KeyboardEvent) {
      if (e.key === "Escape") setOuvert(false);
    }
    document.addEventListener("mousedown", fermerSiExterieur);
    document.addEventListener("keydown", surEchap);
    return () => {
      document.removeEventListener("mousedown", fermerSiExterieur);
      document.removeEventListener("keydown", surEchap);
    };
  }, [ouvert]);

  function choisir(cible: Locale) {
    setOuvert(false);
    if (cible === locale) return;
    setErreur(false);
    demarrer(async () => {
      try {
        await definirLangue(cible);
        if (utilisateur) {
          // Un échec réseau ne doit pas empêcher le changement d'affichage.
          await api.patch("/users/me/langue", { langue: cible }).catch(() => {});
        }
        router.refresh();
      } catch {
        setErreur(true);
      }
    });
  }

  const courante = LANGUES[locale];

  if (variant === "inline") {
    return (
      <div
        role="group"
        aria-label={t("choose")}
        className={clsx("flex flex-wrap gap-2", className)}
      >
        {LOCALES.map((code) => {
          const actif = code === locale;
          return (
            <button
              key={code}
              type="button"
              lang={code}
              disabled={enCours}
              aria-pressed={actif}
              onClick={() => choisir(code)}
              className={clsx(
                "flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bleu disabled:opacity-60",
                actif
                  ? "bg-bleu-soft text-bleu-dark"
                  : "text-ink-soft hover:bg-ink/5 hover:text-ink",
              )}
            >
              <span aria-hidden="true">{LANGUES[code].drapeau}</span>
              {LANGUES[code].nom}
            </button>
          );
        })}
        {erreur && (
          <p role="alert" className="w-full text-xs text-ink-soft">
            {t("changeError")}
          </p>
        )}
      </div>
    );
  }

  return (
    <div ref={conteneurRef} className={clsx("relative", className)}>
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        aria-expanded={ouvert}
        aria-controls={panneauId}
        aria-label={`${t("choose")} — ${t("current", { langue: courante.nom })}`}
        title={t("choose")}
        disabled={enCours}
        className="flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bleu disabled:opacity-60"
      >
        <Globe size={16} aria-hidden="true" />
        <span aria-hidden="true">{courante.code}</span>
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={clsx("transition-transform", ouvert && "rotate-180")}
        />
      </button>

      {ouvert && (
        <ul
          id={panneauId}
          className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-xl border border-ink/10 bg-paper-light py-1 shadow-xl"
        >
          {LOCALES.map((code) => {
            const actif = code === locale;
            return (
              <li key={code}>
                <button
                  type="button"
                  lang={code}
                  aria-current={actif ? "true" : undefined}
                  onClick={() => choisir(code)}
                  className={clsx(
                    "flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm transition-colors hover:bg-ink/5 focus-visible:bg-ink/5 focus-visible:outline-none",
                    actif ? "font-semibold text-bleu-dark" : "text-ink-soft",
                  )}
                >
                  <span aria-hidden="true">{LANGUES[code].drapeau}</span>
                  <span className="flex-1">{LANGUES[code].nom}</span>
                  {actif && <Check size={16} aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {erreur && (
        <span role="alert" className="sr-only">
          {t("changeError")}
        </span>
      )}
    </div>
  );
}
