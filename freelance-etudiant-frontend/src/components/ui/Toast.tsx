"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { clsx } from "clsx";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Notifications de retour d'action (confirmation, erreur, information).
 *
 * RÈGLE D'USAGE : une notification de succès ne s'affiche qu'APRÈS la
 * réponse positive effective du backend (`await api...` terminé sans
 * exception). Elle ne sert jamais à « annoncer » une opération en cours
 * ni à masquer un échec : en cas d'erreur, appeler `erreur(...)`.
 *
 * Usage :
 *   const toast = useToast();
 *   await api.patch(...);
 *   toast.succes("Compte suspendu");
 */

export type TonToast = "succes" | "erreur" | "info";

interface OptionsToast {
  titre: string;
  description?: string;
  ton?: TonToast;
  /** Durée d'affichage en ms (défaut : 4 s, 7 s pour une erreur). */
  duree?: number;
}

interface ToastActif extends Required<Pick<OptionsToast, "titre" | "ton">> {
  id: number;
  description?: string;
  duree: number;
}

interface ContexteToast {
  notifier: (options: OptionsToast) => void;
  succes: (titre: string, description?: string) => void;
  erreur: (titre: string, description?: string) => void;
  info: (titre: string, description?: string) => void;
}

// Valeur par défaut inerte : un composant rendu hors du provider (test,
// stockage isolé) ne doit jamais faire planter la page.
const ContexteNotifications = createContext<ContexteToast>({
  notifier: () => {},
  succes: () => {},
  erreur: () => {},
  info: () => {},
});

export function useToast(): ContexteToast {
  return useContext(ContexteNotifications);
}

const MAX_VISIBLES = 4;
const DUREE_SORTIE_MS = 160;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastActif[]>([]);
  const compteur = useRef(0);

  const retirer = useCallback((id: number) => {
    setToasts((courants) => courants.filter((t) => t.id !== id));
  }, []);

  const notifier = useCallback((options: OptionsToast) => {
    const ton = options.ton ?? "info";
    compteur.current += 1;
    const nouveau: ToastActif = {
      id: compteur.current,
      titre: options.titre,
      description: options.description,
      ton,
      duree: options.duree ?? (ton === "erreur" ? 7000 : 4000),
    };
    setToasts((courants) => [...courants, nouveau].slice(-MAX_VISIBLES));
  }, []);

  const valeur = useMemo<ContexteToast>(
    () => ({
      notifier,
      succes: (titre, description) =>
        notifier({ titre, description, ton: "succes" }),
      erreur: (titre, description) =>
        notifier({ titre, description, ton: "erreur" }),
      info: (titre, description) =>
        notifier({ titre, description, ton: "info" }),
    }),
    [notifier],
  );

  return (
    <ContexteNotifications.Provider value={valeur}>
      {children}

      {/* Zone d'annonce : fixée en bas, au-dessus des barres mobiles. Les
          notifications d'erreur utilisent role="alert" (annonce immédiate),
          les autres role="status" (annonce polie). */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] flex flex-col items-center gap-2 p-4 sm:items-end"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        {toasts.map((toast) => (
          <ElementToast key={toast.id} toast={toast} onRetirer={retirer} />
        ))}
      </div>
    </ContexteNotifications.Provider>
  );
}

const STYLES_TON: Record<
  TonToast,
  { icone: typeof Info; couleur: string; barre: string }
> = {
  succes: { icone: CircleCheck, couleur: "text-rice", barre: "bg-rice" },
  erreur: { icone: CircleAlert, couleur: "text-brique", barre: "bg-brique" },
  info: { icone: Info, couleur: "text-bleu-dark", barre: "bg-bleu" },
};

function ElementToast({
  toast,
  onRetirer,
}: {
  toast: ToastActif;
  onRetirer: (id: number) => void;
}) {
  const t = useTranslations("common.actions");
  const [enPause, setEnPause] = useState(false);
  const [sortie, setSortie] = useState(false);
  const restant = useRef(toast.duree);
  const debutSegment = useRef(0);
  const style = STYLES_TON[toast.ton];
  const Icone = style.icone;

  const fermer = useCallback(() => {
    setSortie(true);
    window.setTimeout(() => onRetirer(toast.id), DUREE_SORTIE_MS);
  }, [onRetirer, toast.id]);

  // Minuterie suspendue au survol et au focus : le temps restant est
  // conservé, l'utilisateur n'est jamais privé de la lecture du message.
  useEffect(() => {
    if (enPause || sortie) return;
    debutSegment.current = Date.now();
    const minuterie = window.setTimeout(fermer, restant.current);
    return () => {
      window.clearTimeout(minuterie);
      restant.current -= Date.now() - debutSegment.current;
    };
  }, [enPause, sortie, fermer]);

  return (
    <div
      role={toast.ton === "erreur" ? "alert" : "status"}
      onMouseEnter={() => setEnPause(true)}
      onMouseLeave={() => setEnPause(false)}
      onFocus={() => setEnPause(true)}
      onBlur={() => setEnPause(false)}
      className={clsx(
        "pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-lg border border-ink/15 bg-paper-light shadow-[0_10px_30px_-10px_rgba(15,23,42,0.35)]",
        sortie ? "animate-toast-out" : "animate-toast-in",
      )}
    >
      <div className="flex items-start gap-3 p-3.5 pr-2.5">
        <Icone
          size={18}
          aria-hidden="true"
          className={clsx("mt-0.5 shrink-0", style.couleur)}
        />

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink">{toast.titre}</p>
          {toast.description && (
            <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
              {toast.description}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={fermer}
          aria-label={t("close")}
          className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink"
        >
          <X size={15} aria-hidden="true" />
        </button>
      </div>

      {/* Durée restante : purement indicative, mise en pause avec la minuterie. */}
      <span
        aria-hidden="true"
        className={clsx("absolute inset-x-0 bottom-0 h-0.5 origin-left", style.barre)}
        style={{
          animation: `toast-progress ${toast.duree}ms linear forwards`,
          animationPlayState: enPause ? "paused" : "running",
        }}
      />
    </div>
  );
}
