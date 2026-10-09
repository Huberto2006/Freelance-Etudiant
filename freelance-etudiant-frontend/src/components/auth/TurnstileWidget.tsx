"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/Button";

interface ParametresTurnstile {
  sitekey: string;
  action?: string;
  theme?: "auto" | "light" | "dark";
  size?: "normal" | "flexible" | "compact";
  language?: string;
  callback?: (token: string) => void;
  "expired-callback"?: () => void;
  "timeout-callback"?: () => void;
  "error-callback"?: () => boolean | void;
}

interface TurnstileGlobal {
  render: (conteneur: HTMLElement, parametres: ParametresTurnstile) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileGlobal;
  }
}

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let promesseScript: Promise<void> | null = null;

/** Charge le script officiel Cloudflare une seule fois par page. */
function chargerScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("indisponible"));
  }
  if (window.turnstile) return Promise.resolve();
  if (!promesseScript) {
    promesseScript = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => {
        // Script bloque (extension, reseau, CSP) : on permet un nouvel essai.
        promesseScript = null;
        script.remove();
        reject(new Error("bloque"));
      };
      document.head.appendChild(script);
    });
  }
  return promesseScript;
}

export interface TurnstileHandle {
  /** Relance une verification (le jeton precedent est a usage unique). */
  reset: () => void;
}

interface TurnstileWidgetProps {
  /** Nom de l'action, verifie cote serveur (ex. "connexion"). */
  action: string;
  /** Recoit le jeton valide, ou null (expire, echec, reinitialisation). */
  onToken: (jeton: string | null) => void;
  className?: string;
}

type Etat = "chargement" | "pret" | "expire" | "erreur" | "non-configure";

/**
 * Widget officiel Cloudflare Turnstile. La cle de site est publique
 * (NEXT_PUBLIC_TURNSTILE_SITE_KEY) ; la cle secrete n'existe que cote
 * NestJS. Le jeton obtenu ne prouve RIEN tant que le backend ne l'a pas
 * verifie aupres de Cloudflare.
 */
export const TurnstileWidget = forwardRef<
  TurnstileHandle,
  TurnstileWidgetProps
>(function TurnstileWidget({ action, onToken, className }, ref) {
  const cleSite = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const conteneur = useRef<HTMLDivElement>(null);
  const idWidget = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const [etat, setEtat] = useState<Etat>(
    cleSite ? "chargement" : "non-configure",
  );
  const [tentative, setTentative] = useState(0);

  useEffect(() => {
    onTokenRef.current = onToken;
  });

  useEffect(() => {
    if (!cleSite) return;
    let annule = false;

    chargerScript()
      .then(() => {
        if (annule || !conteneur.current || !window.turnstile) return;
        idWidget.current = window.turnstile.render(conteneur.current, {
          sitekey: cleSite,
          action,
          theme: "auto",
          size: "flexible",
          language: "fr",
          callback: (jeton) => {
            onTokenRef.current(jeton);
            setEtat("pret");
          },
          "expired-callback": () => {
            onTokenRef.current(null);
            setEtat("expire");
          },
          "timeout-callback": () => {
            onTokenRef.current(null);
            setEtat("expire");
          },
          "error-callback": () => {
            onTokenRef.current(null);
            setEtat("erreur");
            return true;
          },
        });
      })
      .catch(() => {
        if (!annule) {
          onTokenRef.current(null);
          setEtat("erreur");
        }
      });

    return () => {
      annule = true;
      if (idWidget.current && window.turnstile) {
        try {
          window.turnstile.remove(idWidget.current);
        } catch {
          /* widget deja retire */
        }
      }
      idWidget.current = null;
    };
  }, [cleSite, action, tentative]);

  useImperativeHandle(ref, () => ({
    reset() {
      onTokenRef.current(null);
      if (idWidget.current && window.turnstile) {
        setEtat("chargement");
        try {
          window.turnstile.reset(idWidget.current);
        } catch {
          setEtat("erreur");
        }
      }
    },
  }));

  function reessayer() {
    onTokenRef.current(null);
    setEtat("chargement");
    setTentative((n) => n + 1);
  }

  if (etat === "non-configure") {
    return (
      <p role="alert" className="text-sm text-brique">
        La vérification anti-robot n&apos;est pas configurée
        (NEXT_PUBLIC_TURNSTILE_SITE_KEY manquante). Le formulaire est
        désactivé.
      </p>
    );
  }

  return (
    <div className={className}>
      <div ref={conteneur} className="min-h-[65px]" />
      <div aria-live="polite" className="mt-1 text-xs text-ink-soft">
        {etat === "chargement" && <p>Vérification anti-robot en cours…</p>}
        {etat === "expire" && (
          <p>La vérification a expiré, une nouvelle est en cours.</p>
        )}
        {etat === "erreur" && (
          <div role="alert" className="flex flex-col items-start gap-2">
            <p className="text-sm text-brique">
              La vérification anti-robot n&apos;a pas pu être chargée. Elle
              est peut-être bloquée par une extension ou votre connexion.
            </p>
            <Button type="button" variant="ghost" size="sm" onClick={reessayer}>
              Réessayer
            </Button>
          </div>
        )}
      </div>
    </div>
  );
});
