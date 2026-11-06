import { clsx } from "clsx";

/**
 * Pastille d'état d'une connexion RÉELLE : pulsation très légère quand
 * `actif`. À ne brancher que sur une donnée vérifiée : le backend n'émet ni
 * présence des autres utilisateurs ni indicateur de frappe.
 */
export function PastilleActivite({ actif }: { actif: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={clsx(
        "pastille-activite",
        actif ? "pastille-activite--active bg-rice" : "bg-ink/25",
      )}
    />
  );
}

/** Trois points d'attente, pour une opération courte en cours (envoi). */
export function PointsAttente({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={clsx("inline-flex items-center gap-0.5", className)}
    >
      <span className="point-attente" />
      <span className="point-attente [animation-delay:140ms]" />
      <span className="point-attente [animation-delay:280ms]" />
    </span>
  );
}
