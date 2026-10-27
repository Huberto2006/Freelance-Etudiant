"use client";

import { useEffect, useId, useRef } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { NoticeCard } from "@/components/ui/Notice";
import { Button } from "@/components/ui/Button";

/**
 * Boîte de confirmation habillée aux couleurs de l'app, à la place de
 * `window.confirm()` (dont le style système tranche avec l'interface).
 *
 * Comportements d'accessibilité :
 * - le focus entre dans la boîte (sur « Annuler », l'action la moins
 *   risquée) et revient à l'élément déclencheur à la fermeture ;
 * - Tab / Maj+Tab restent prisonniers de la boîte ;
 * - Échap et clic sur le fond annulent, sauf pendant `enCours` ;
 * - le défilement de la page est verrouillé tant que la boîte est ouverte.
 *
 * `enCours` doit refléter la requête réelle : les deux boutons sont alors
 * désactivés (aucune double validation possible) et le bouton de
 * confirmation affiche son indicateur.
 *
 * Usage :
 *   const [aConfirmer, setAConfirmer] = useState<Mission | null>(null);
 *   ...
 *   <ConfirmDialog
 *     ouvert={aConfirmer !== null}
 *     titre="Supprimer la mission ?"
 *     description={`« ${aConfirmer?.titre} » sera définitivement supprimée.`}
 *     enCours={suppressionEnCours}
 *     onConfirmer={() => supprimer(aConfirmer!)}
 *     onAnnuler={() => setAConfirmer(null)}
 *   />
 */
export function ConfirmDialog({
  ouvert,
  titre,
  description,
  libelleConfirmer,
  libelleAnnuler,
  destructif = true,
  enCours = false,
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
  /** Une requête est en cours : boutons désactivés, indicateur affiché. */
  enCours?: boolean;
  onConfirmer: () => void;
  onAnnuler: () => void;
}) {
  const t = useTranslations("common");
  const idTitre = useId();
  const idDescription = useId();
  const panneauRef = useRef<HTMLDivElement>(null);
  const boutonAnnulerRef = useRef<HTMLButtonElement>(null);

  // Les callbacks sont lus via une ref : les mettre en dépendance de
  // l'effet ci-dessous rejouerait le placement du focus à chaque rendu
  // du parent (le parent recrée ses fonctions à chaque rendu).
  const annulerRef = useRef(onAnnuler);
  const enCoursRef = useRef(enCours);
  useEffect(() => {
    annulerRef.current = onAnnuler;
    enCoursRef.current = enCours;
  });

  useEffect(() => {
    if (!ouvert) return;

    const declencheur = document.activeElement as HTMLElement | null;
    const defilementInitial = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    boutonAnnulerRef.current?.focus();

    function surTouche(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (!enCoursRef.current) annulerRef.current();
        return;
      }

      if (event.key !== "Tab") return;
      const focalisables = panneauRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focalisables || focalisables.length === 0) {
        event.preventDefault();
        return;
      }
      const premier = focalisables[0];
      const dernier = focalisables[focalisables.length - 1];
      const actif = document.activeElement;
      if (event.shiftKey && actif === premier) {
        event.preventDefault();
        dernier.focus();
      } else if (!event.shiftKey && actif === dernier) {
        event.preventDefault();
        premier.focus();
      }
    }

    document.addEventListener("keydown", surTouche);
    return () => {
      document.removeEventListener("keydown", surTouche);
      document.body.style.overflow = defilementInitial;
      declencheur?.focus?.();
    };
  }, [ouvert]);

  if (!ouvert) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={idTitre}
      aria-describedby={description ? idDescription : undefined}
      aria-busy={enCours || undefined}
      className="animate-in-fade fixed inset-0 z-[80] flex items-center justify-center bg-ink/45 p-4"
      onClick={() => {
        if (!enCours) onAnnuler();
      }}
    >
      <div ref={panneauRef} className="animate-pop w-full max-w-sm">
        <NoticeCard
          className="shadow-[0_20px_50px_-15px_rgba(15,23,42,0.45)]"
          // Empêche un clic à l'intérieur de la carte de fermer la boîte
          // (seul le clic sur le fond assombri doit annuler).
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start gap-3">
            {destructif && (
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brique/10 text-brique"
                aria-hidden="true"
              >
                <AlertTriangle size={18} />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p
                id={idTitre}
                className="font-display text-lg font-semibold leading-snug"
              >
                {titre}
              </p>
              {description && (
                <p
                  id={idDescription}
                  className="mt-1.5 text-sm leading-relaxed text-ink-soft"
                >
                  {description}
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2.5">
            <Button
              ref={boutonAnnulerRef}
              variant="ghost"
              size="sm"
              disabled={enCours}
              onClick={onAnnuler}
            >
              {libelleAnnuler ?? t("actions.cancel")}
            </Button>
            <Button
              variant={destructif ? "danger" : "primary"}
              size="sm"
              loading={enCours}
              onClick={onConfirmer}
            >
              {libelleConfirmer ?? t("actions.confirm")}
            </Button>
          </div>
        </NoticeCard>
      </div>
    </div>
  );
}
