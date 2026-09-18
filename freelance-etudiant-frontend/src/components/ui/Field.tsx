import { clsx } from "clsx";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import type { InputHTMLAttributes, LabelHTMLAttributes, Ref, TextareaHTMLAttributes } from "react";

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
        "rounded-lg border border-ink/30 bg-paper-light px-3 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus:border-ocre transition-colors",
        props.className,
      )}
    />
  );
}

export function PasswordInput(
  props: InputHTMLAttributes<HTMLInputElement>,
) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={clsx(
          "w-full rounded-lg border border-ink/30 bg-paper-light px-3 py-2.5 pr-11 text-sm text-ink placeholder:text-ink-soft/50 focus:border-ocre focus:outline-none transition-colors",
          props.className,
        )}
      />
      <button
        type="button"
        onClick={() => setVisible((etat) => !etat)}
        aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        title={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink"
      >
        {visible ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}

export function Textarea({
  className,
  ref,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  /**
   * React 19 : le ref est transmis comme une prop classique, ce qui permet
   * aux pages d'ajuster dynamiquement la hauteur du champ (messagerie).
   */
  ref?: Ref<HTMLTextAreaElement>;
}) {
  return (
    <textarea
      ref={ref}
      {...props}
      className={clsx(
        "rounded-lg border border-ink/30 bg-paper-light px-3 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus:border-ocre transition-colors resize-y",
        className,
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
        "rounded-lg border border-ink/30 bg-paper-light px-3 py-2.5 text-sm text-ink focus:border-ocre transition-colors",
        className,
      )}
    />
  );
}

export function FieldLabel(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...props} />;
}
