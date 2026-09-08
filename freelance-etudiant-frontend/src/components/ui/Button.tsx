import { clsx } from "clsx";
import type { ButtonHTMLAttributes, ComponentPropsWithoutRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
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
};

const sizes: Record<string, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-sm",
  lg: "px-6 py-3.5 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  href,
  target,
  rel,
  type,
  disabled,
  ...props
}: ButtonProps) {
  const classes = clsx(
    "rounded-lg font-body font-medium tracking-wide transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed",
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
      />
    );
  }

  return (
    <button
      type={type}
      disabled={disabled}
      className={classes}
      {...props}
    />
  );
}
