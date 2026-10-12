import { ArrowUpDown } from "lucide-react";

export interface OptionTriBarre<T extends string> {
  valeur: T;
  libelle: string;
}

/** Compteur de résultats (à gauche) et sélecteur de tri (à droite). */
export function BarreResultats<T extends string>({
  nombre,
  singulier,
  pluriel,
  accordFeminin = false,
  tri,
  onTri,
  options,
}: {
  nombre: number;
  singulier: string;
  pluriel: string;
  accordFeminin?: boolean;
  tri: T;
  onTri: (valeur: T) => void;
  options: OptionTriBarre<T>[];
}) {
  const suffixe = accordFeminin ? "e" : "";
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-ink-soft" aria-live="polite">
        <span className="font-semibold text-ink">{nombre}</span>{" "}
        {nombre > 1 ? pluriel : singulier} trouvé{suffixe}
        {nombre > 1 ? "s" : ""}
      </p>

      <div className="flex items-center gap-2">
        <label
          htmlFor="tri-catalogue"
          className="flex items-center gap-1.5 font-mono text-[0.6875rem] uppercase tracking-wider text-ink-soft"
        >
          <ArrowUpDown size={13} aria-hidden="true" />
          <span className="hidden sm:inline">Trier par</span>
          <span className="sr-only sm:hidden">Trier par</span>
        </label>
        <select
          id="tri-catalogue"
          value={tri}
          onChange={(e) => onTri(e.target.value as T)}
          className="kianja-field-control h-10 rounded-[10px] border-0 bg-paper-light px-3 text-sm text-ink outline-none transition"
        >
          {options.map((o) => (
            <option key={o.valeur} value={o.valeur}>
              {o.libelle}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
