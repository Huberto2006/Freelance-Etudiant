import { clsx } from "clsx";
import { Eye, EyeOff } from "lucide-react";
import { cloneElement, isValidElement, useState } from "react";
import { useTranslations } from "next-intl";
import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  Ref,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

function hasFieldValue(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (typeof value === "number") {
    return !Number.isNaN(value);
  }

  return value !== undefined && value !== null && value !== "";
}

function composeHandlers<T>(
  existing: ((event: T) => void) | undefined,
  next: (event: T) => void,
) {
  return (event: T) => {
    existing?.(event);
    next(event);
  };
}

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
  const [focused, setFocused] = useState(false);

  const child = isValidElement<Record<string, unknown>>(children) ? children : null;
  const childProps = (child?.props ?? {}) as Record<string, unknown>;
  const childClassName = typeof childProps.className === "string" ? childProps.className : "";
  const isTextarea = child?.type === Textarea;
  const isSelect = child?.type === Select;
  const hasValue = hasFieldValue(childProps.value ?? childProps.defaultValue) || focused;
  const labelFloated = isSelect || hasValue;

  const idErreur = `${htmlFor}-erreur`;
  const idAide = `${htmlFor}-aide`;
  const decritPar = error
    ? idErreur
    : hint
      ? idAide
      : (childProps["aria-describedby"] as string | undefined);
  const estObligatoire = Boolean(childProps.required);

  const enhancedChild = child
    ? cloneElement(child, {
        id: htmlFor,
        placeholder: " ",
        "aria-invalid": Boolean(error) || childProps["aria-invalid"],
        "aria-describedby": decritPar,
        "data-filled": String(labelFloated),
        value: childProps.value ?? childProps.defaultValue,
        onFocus: composeHandlers(
          childProps.onFocus as ((event: React.FocusEvent<HTMLElement>) => void) | undefined,
          () => setFocused(true),
        ),
        onBlur: composeHandlers(
          childProps.onBlur as ((event: React.FocusEvent<HTMLElement>) => void) | undefined,
          () => setFocused(false),
        ),
        className: clsx(
          childClassName,
          "kianja-field-control peer w-full rounded-md border border-ink/15 bg-paper-light text-sm text-ink transition-[border-color,padding,background-color] duration-150 placeholder:text-transparent hover:border-ink/25 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-brique/50",
          labelFloated ? "pt-5 pb-2" : "py-2.5",
          isTextarea ? "min-h-[120px] resize-y" : "",
          isSelect ? "appearance-none pr-10 text-ink" : "",
          childProps.type === "password" ? "pr-11" : "",
        ),
        style: {
          ...(childProps.style ?? {}),
        },
      })
    : children;

  const labelStyle: React.CSSProperties = labelFloated
    ? {
        top: 0,
        left: "0.7rem",
        transform: "translateY(-50%)",
        fontSize: "0.68rem",
        lineHeight: "1.1",
        backgroundColor: "var(--color-paper-light)",
        padding: "0 0.2rem",
        color: error ? "var(--color-brique)" : "var(--color-ink-soft)",
      }
    : {
        top: "50%",
        left: "0.9rem",
        transform: "translateY(-50%)",
        fontSize: "0.875rem",
        lineHeight: "1.5",
        color: error ? "var(--color-brique)" : "var(--color-ink-soft)",
      };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        {enhancedChild}
        <label
          htmlFor={htmlFor}
          className="pointer-events-none absolute z-10 select-none whitespace-nowrap font-medium transition-[top,left,transform,font-size,color] duration-150 ease-out-soft"
          style={labelStyle}
        >
          {label}
          {estObligatoire && (
            <span aria-hidden="true" className="ml-0.5 text-brique">
              *
            </span>
          )}
        </label>
      </div>
      {hint && !error && (
        <p id={idAide} className="text-xs text-ink-soft/80">
          {hint}
        </p>
      )}
      {error && (
        <p id={idErreur} role="alert" className="text-xs font-medium text-brique">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        "kianja-field-control w-full rounded-md border border-ink/15 bg-paper-light px-3 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 transition-colors hover:border-ink/25 focus:outline-none aria-invalid:border-brique/50 disabled:cursor-not-allowed disabled:opacity-60",
        props.className,
      )}
    />
  );
}

export function PasswordInput(
  props: InputHTMLAttributes<HTMLInputElement>,
) {
  const t = useTranslations("forms");
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={clsx(
          "kianja-field-control w-full rounded-md border border-ink/15 bg-paper-light px-3 py-2.5 pr-11 text-sm text-ink placeholder:text-ink-soft/50 transition-colors hover:border-ink/25 focus:outline-none aria-invalid:border-brique/50 disabled:cursor-not-allowed disabled:opacity-60",
          props.className,
        )}
      />
      <button
        type="button"
        onClick={() => setVisible((etat) => !etat)}
        aria-label={visible ? t("password.hide") : t("password.show")}
        title={visible ? t("password.hide") : t("password.show")}
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
        "kianja-field-control w-full rounded-md border border-ink/15 bg-paper-light px-3 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 transition-colors hover:border-ink/25 focus:outline-none aria-invalid:border-brique/50 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    />
  );
}

export function Select({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={clsx(
        "kianja-field-control w-full rounded-md border border-ink/15 bg-paper-light px-3 py-2.5 text-sm text-ink transition-colors hover:border-ink/25 focus:outline-none aria-invalid:border-brique/50 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    />
  );
}

export function FieldLabel(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...props} />;
}
