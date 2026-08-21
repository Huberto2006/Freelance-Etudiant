import { clsx } from "clsx";
import type { InputHTMLAttributes, LabelHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-xs font-mono uppercase tracking-wider text-ink-soft"
      >
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-ink-soft/70">{hint}</p>}
      {error && <p className="text-xs text-brique">{error}</p>}
    </div>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        "rounded-lg border border-ink/30 bg-paper-light px-3 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus:border-rice transition-colors",
        props.className,
      )}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={clsx(
        "rounded-lg border border-ink/30 bg-paper-light px-3 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus:border-rice transition-colors resize-y",
        props.className,
      )}
    />
  );
}

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={clsx(
        "rounded-lg border border-ink/30 bg-paper-light px-3 py-2.5 text-sm text-ink focus:border-rice transition-colors",
        className,
      )}
    />
  );
}

export function FieldLabel(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...props} />;
}
