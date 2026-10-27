import { clsx } from "clsx";
import { LoaderCircle } from "lucide-react";
import type {
  ButtonHTMLAttributes,
  ComponentPropsWithoutRef,
  Ref,
} from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** React 19 : `ref` est une prop ordinaire, transmise au <button>. */
  ref?: Ref<HTMLButtonElement>;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "danger-ghost";
  size?: "sm" | "md" | "lg";
  /**
   * Opération asynchrone en cours : le bouton affiche un indicateur,
   * se désactive (aucune double soumission possible) et expose
   * `aria-busy`. À piloter UNIQUEMENT par l'état réel de la requête :
   * il ne doit jamais servir à « simuler » un traitement.
   */
  loading?: boolean;
  /**
   * Fourni : le composant rend un lien <a> (mêmes variantes et tailles)
   * au lieu d'un <button>. Utile pour les actions de navigation
   * (« Voir le projet »…) afin de garder une apparence de bouton homogène.
   */
  href?: string;
  target?: string;
  rel?: string;
}

const variants: Record<string, string> = {
  primary:
    "bg-ink text-paper-light hover:bg-ink-soft border border-ink disabled:opacity-50",
  secondary:
    "bg-ocre text-paper-light hover:bg-ocre-dark border border-ocre-dark disabled:opacity-50",
  ghost:
    "bg-transparent text-ink border border-ink/30 hover:border-ink hover:bg-ink/5 disabled:opacity-50",
  danger:
    "bg-brique text-paper-light hover:bg-brique-light border border-brique disabled:opacity-50",
  // Action destructrice discrète : pour les lignes de tableau denses, où un
  // bouton rouge plein répété sur chaque ligne alourdirait la lecture.
  "danger-ghost":
    "bg-transparent text-brique border border-brique/35 hover:border-brique hover:bg-brique/5 disabled:opacity-50",
};

/*
 * Hauteurs : compactes à la souris, portées à 44 px sur écran tactile
 * (pointer-coarse) pour garder des zones de toucher suffisantes sans
 * alourdir la version desktop.
 */
const sizes: Record<string, string> = {
  sm: "px-3 py-1.5 text-sm pointer-coarse:min-h-11",
  md: "px-4 py-2.5 text-sm pointer-coarse:min-h-11",
  lg: "px-6 py-3.5 text-base pointer-coarse:min-h-12",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  href,
  target,
  rel,
  type,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const classes = clsx(
    "inline-flex items-center justify-center gap-2 rounded-md font-body font-medium",
    // Transitions ciblées (jamais `all`) : couleur, bordure et léger
    // enfoncement au clic. 150 ms, courbe unique du design system.
    "transition-[background-color,border-color,color,opacity,transform] duration-150 ease-out-soft",
    "cursor-pointer not-disabled:active:translate-y-px disabled:cursor-not-allowed",
    variants[variant],
    sizes[size],
    className,
  );

  if (href) {
    // Un lien ne gère ni `type` ni `disabled` ; pour target="_blank" on
    // garantit les protections standard si `rel` n'est pas fourni.
    // Les handlers communs (onClick, onMouseEnter…) restent transmis.
    const propsLien = props as unknown as ComponentPropsWithoutRef<"a">;
    return (
      <a
        href={href}
        target={target}
        rel={target === "_blank" ? (rel ?? "noopener noreferrer") : rel}
        className={classes}
        {...propsLien}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={classes}
      {...props}
    >
      {loading && (
        <LoaderCircle
          size={15}
          aria-hidden="true"
          className="shrink-0 motion-safe:animate-spin"
        />
      )}
      {children}
    </button>
  );
}
