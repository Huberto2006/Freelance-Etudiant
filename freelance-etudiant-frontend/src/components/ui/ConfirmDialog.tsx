"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { NoticeCard } from "@/components/ui/Notice";
import { Button } from "@/components/ui/Button";

/**
 * Boîte de confirmation habillée aux couleurs de l'app (carte punaisée +
 * boutons du design system), à la place de `window.confirm()` — la boîte
 * de dialogue native du navigateur, dont le style système tranche avec
 * le reste de l'interface (utilisée avant ce composant dans 8 pages :
 * mes-missions, mes-services, candidatures, notifications, amis, groupes,
 * mes-publications, tableau de bord).
 *
 * Usage :
 *   const [aConfirmer, setAConfirmer] = useState<Mission | null>(null);
 *   ...
 *   <ConfirmDialog
 *     ouvert={aConfirmer !== null}
 *     titre="Supprimer la mission ?"
 *     description={`« ${aConfirmer?.titre} » sera définitivement supprimée.`}
 *     onConfirmer={() => { supprimer(aConfirmer!); setAConfirmer(null); }}
 *     onAnnuler={() => setAConfirmer(null)}
 *   />
 */
export function ConfirmDialog({
  ouvert,
  titre,
  description,
  libelleConfirmer = "Confirmer",
  libelleAnnuler = "Annuler",
  destructif = true,
  onConfirmer,
  onAnnuler,
}: {
  ouvert: boolean;
  titre: string;
  description?: string;
  libelleConfirmer?: string;
  libelleAnnuler?: string;
  /** true (défaut) : bouton de confirmation en variante "danger". */
  destructif?: boolean;
  onConfirmer: () => void;
  onAnnuler: () => void;
}) {
  // Échap ferme la boîte, comme window.confirm() le faisait implicitement.
  useEffect(() => {
    if (!ouvert) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onAnnuler();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [ouvert, onAnnuler]);

  if (!ouvert) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-titre"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-[2px]"
      onClick={onAnnuler}
    >
      <NoticeCard
        className="w-full max-w-sm animate-in-fade"
        // Empêche un clic à l'intérieur de la carte de fermer la boîte
        // (seul le clic sur le fond assombri doit annuler).
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          {destructif && (
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brique/10 text-brique"
              aria-hidden="true"
            >
              <AlertTriangle size={18} />
            </span>
          )}
          <div className="flex-1">
            <p
              id="confirm-dialog-titre"
              className="font-display text-lg font-semibold"
            >
              {titre}
            </p>
            {description && (
              <p className="mt-1.5 text-sm text-ink-soft/80">{description}</p>
            )}
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2.5">
          <Button variant="ghost" size="sm" onClick={onAnnuler}>
            {libelleAnnuler}
          </Button>
          <Button
            variant={destructif ? "danger" : "primary"}
            size="sm"
            onClick={onConfirmer}
          >
            {libelleConfirmer}
          </Button>
        </div>
      </NoticeCard>
    </div>
  );
}
