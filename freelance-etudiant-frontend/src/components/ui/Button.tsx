import { clsx } from "clsx";
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
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
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        "font-body font-medium tracking-wide transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
