"use client";

import { Check, Plus, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { clsx } from "clsx";

function normaliserTexte(valeur: string) {
  return valeur
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function parserValeur(valeur: string) {
  return valeur
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function deduplicer(items: string[]) {
  const vus = new Set<string>();
  return items.filter((item) => {
    const normalise = normaliserTexte(item);
    if (!normalise || vus.has(normalise)) {
      return false;
    }
    vus.add(normalise);
    return true;
  });
}

export function MultiSelectCreatable({
  id,
  value,
  onChange,
  options = [],
  placeholder = "Rechercher ou saisir une valeur…",
  allowCreate = true,
  mode = "multiple",
  className,
  disabled = false,
}: {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  options?: string[];
  placeholder?: string;
  allowCreate?: boolean;
  mode?: "single" | "multiple";
  className?: string;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selected = useMemo(() => parserValeur(value), [value]);

  const filteredOptions = useMemo(() => {
    const terme = normaliserTexte(query);

    if (!terme) {
      return options.filter((option) => !selected.includes(option));
    }

    return options.filter((option) => {
      if (selected.includes(option)) return false;
      return normaliserTexte(option).includes(terme);
    });
  }, [options, query, selected]);

  const customValue = useMemo(() => {
    const libelle = query.trim();
    if (!libelle || !allowCreate) return null;
    const alreadyExists = options.some(
      (option) => normaliserTexte(option) === normaliserTexte(libelle),
    );
    const alreadySelected = selected.some(
      (item) => normaliserTexte(item) === normaliserTexte(libelle),
    );
    if (alreadyExists || alreadySelected) return null;
    return libelle;
  }, [allowCreate, options, query, selected]);

  function appliquerValeur(nouvelleValeur: string) {
    const item = nouvelleValeur.trim();
    if (!item) return;

    const next = mode === "single"
      ? [item]
      : deduplicer([...selected, item]);

    onChange(next.join(", "));
    setQuery("");
    setIsOpen(false);
    inputRef.current?.focus();
  }

  function retirerItem(item: string) {
    const next = selected.filter((valeur) => valeur !== item);
    onChange(next.join(", "));
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      if (filteredOptions[0]) {
        appliquerValeur(filteredOptions[0]);
        return;
      }
      if (customValue) {
        appliquerValeur(customValue);
      }
    }

    if (event.key === "Backspace" && !query && selected.length > 0) {
      if (mode === "single") {
        onChange("");
        return;
      }
      const dernier = selected[selected.length - 1];
      retirerItem(dernier);
    }
  }

  return (
    <div className={clsx("relative", className)}>
      <div
        onClick={() => {
          if (!disabled) inputRef.current?.focus();
        }}
        className={clsx(
          "flex min-h-[44px] w-full flex-wrap items-center gap-1.5 rounded-lg border border-ink/30 bg-paper-light px-2 py-1.5 text-sm text-ink transition-colors focus-within:border-ocre",
          isOpen && "border-ocre",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        {selected.length > 0 &&
          selected.map((item) => (
            <span
              key={`${item}-${selected.indexOf(item)}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-ocre/30 bg-ocre/10 px-2 py-1 text-xs text-ink"
            >
              <span>{item}</span>
              <button
                type="button"
                disabled={disabled}
                aria-label={`Supprimer ${item}`}
                title={`Supprimer ${item}`}
                onClick={(event) => {
                  event.stopPropagation();
                  retirerItem(item);
                }}
                className="flex h-4 w-4 items-center justify-center rounded-full text-ink-soft hover:bg-ink/10 hover:text-ink"
              >
                <X size={12} />
              </button>
            </span>
          ))}

        <input
          id={id}
          ref={inputRef}
          disabled={disabled}
          value={query}
          onFocus={() => {
            if (!disabled) setIsOpen(true);
          }}
          onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={selected.length > 0 && !query ? "Rechercher..." : placeholder}
          className="min-w-[140px] flex-1 border-0 bg-transparent px-1 py-1.5 text-sm text-ink placeholder:text-ink-soft/60 focus:outline-none disabled:cursor-not-allowed"
        />
      </div>

      {!disabled && isOpen && (filteredOptions.length > 0 || customValue) && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-ink/10 bg-paper-light shadow-lg">
          <div className="max-h-56 overflow-y-auto p-1">
            {filteredOptions.map((option) => (
              <button
                key={option}
                type="button"
                disabled={disabled}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => appliquerValeur(option)}
                className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-sm text-ink transition-colors hover:bg-ink/[0.04]"
              >
                <span>{option}</span>
                {selected.includes(option) ? (
                  <Check size={14} className="text-ocre-dark" />
                ) : null}
              </button>
            ))}

            {customValue && (
              <button
                type="button"
                disabled={disabled}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => appliquerValeur(customValue)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-ocre-dark transition-colors hover:bg-ocre/5"
              >
                <Plus size={14} />
                <span>Ajouter « {customValue} »</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
