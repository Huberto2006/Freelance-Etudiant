"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";

interface ReponseCredentialGoogle {
  credential?: string;
}

interface GoogleIdentity {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (reponse: ReponseCredentialGoogle) => void;
        auto_select?: boolean;
        cancel_on_tap_outside?: boolean;
        ux_mode?: "popup" | "redirect";
      }) => void;
      renderButton: (
        element: HTMLElement,
        options: {
          type?: "standard" | "icon";
          theme?: "outline" | "filled_blue" | "filled_black";
          size?: "large" | "medium" | "small";
          text?: "signin_with" | "signup_with" | "continue_with" | "signin";
          shape?: "rectangular" | "pill";
          logo_alignment?: "left" | "center";
          width?: number;
          locale?: string;
        },
      ) => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

const SCRIPT_SRC = "https://accounts.google.com/gsi/client";

let promesseScript: Promise<void> | null = null;

function chargerScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("indisponible"));
  }
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!promesseScript) {
    promesseScript = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => {
        promesseScript = null;
        script.remove();
        reject(new Error("bloque"));
      };
      document.head.appendChild(script);
    });
  }
  return promesseScript;
}

interface BoutonGoogleProps {
  /** Recoit le jeton d'identite Google (a faire valider par le backend). */
  onCredential: (idToken: string) => void;
  /** "continue_with" = « Continuer avec Google ». */
  texte?: "continue_with" | "signup_with" | "signin_with";
  /** Desactive le bouton pendant une requete en cours. */
  disabled?: boolean;
}

type Etat = "chargement" | "pret" | "erreur";

/**
 * Bouton officiel Google Identity Services. Le navigateur n'obtient qu'un
 * jeton d'identite signe par Google : il ne constitue PAS une preuve
 * d'identite tant que le backend NestJS ne l'a pas verifie. Aucun secret
 * Google n'existe cote frontend (seul le Client ID, public, est utilise).
 * Si NEXT_PUBLIC_GOOGLE_CLIENT_ID est absent, le bouton n'est pas affiche
 * et la connexion email + mot de passe reste seule disponible.
 */
export function BoutonGoogle({
  onCredential,
  texte = "continue_with",
  disabled = false,
}: BoutonGoogleProps) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const conteneur = useRef<HTMLDivElement>(null);
  const onCredentialRef = useRef(onCredential);
  const [etat, setEtat] = useState<Etat>("chargement");
  const [tentative, setTentative] = useState(0);

  useEffect(() => {
    onCredentialRef.current = onCredential;
  });

  useEffect(() => {
    if (!clientId) return;
    let annule = false;

    chargerScript()
      .then(() => {
        const cible = conteneur.current;
        const gis = window.google?.accounts.id;
        if (annule || !cible || !gis) return;

        gis.initialize({
          client_id: clientId,
          auto_select: false,
          cancel_on_tap_outside: true,
          callback: (reponse) => {
            if (reponse.credential) onCredentialRef.current(reponse.credential);
          },
        });
        gis.renderButton(cible, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: texte,
          shape: "rectangular",
          logo_alignment: "left",
          locale: "fr",
          width: Math.min(400, Math.max(200, cible.clientWidth || 320)),
        });
        setEtat("pret");
      })
      .catch(() => {
        if (!annule) setEtat("erreur");
      });

    return () => {
      annule = true;
    };
  }, [clientId, texte, tentative]);

  if (!clientId) return null;

  return (
    <div className="w-full">
      <div
        ref={conteneur}
        aria-disabled={disabled}
        className={
          disabled
            ? "pointer-events-none flex min-h-[44px] justify-center opacity-60"
            : "flex min-h-[44px] justify-center"
        }
      />
      <div aria-live="polite">
        {etat === "chargement" && (
          <p className="mt-1 text-center text-xs text-ink-soft">
            Chargement de Google…
          </p>
        )}
        {etat === "erreur" && (
          <div role="alert" className="mt-2 flex flex-col items-center gap-2">
            <p className="text-center text-sm text-brique">
              Impossible de charger la connexion Google. Vérifiez votre
              connexion ou désactivez le bloqueur de contenu.
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setEtat("chargement");
                setTentative((n) => n + 1);
              }}
            >
              Réessayer
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
