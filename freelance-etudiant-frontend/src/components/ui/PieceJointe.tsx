"use client";

import { useRef, useState } from "react";
import { FileText, Loader2, Paperclip, X } from "lucide-react";
import { api, ApiError, getFileUrl } from "@/lib/api";

const TAILLE_MAX = 15 * 1024 * 1024; // 15 Mo, aligné sur la limite backend

export interface PieceJointeValeur {
  url: string;
  nom: string;
}

/**
 * Bouton trombone : sélectionne un fichier, l'envoie immédiatement à
 * /uploads/document, puis remonte {url, nom} au parent via onChange.
 * Utilisé pour joindre un fichier à un message ou à un cahier des charges.
 */
export function SelecteurPieceJointe({
  valeur,
  onChange,
  disabled,
}: {
  valeur: PieceJointeValeur | null;
  onChange: (piece: PieceJointeValeur | null) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function onFichierChoisi(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    e.target.value = "";
    if (!fichier) return;

    setErreur(null);

    if (fichier.size > TAILLE_MAX) {
      setErreur("Le fichier dépasse la taille maximale de 15 Mo.");
      return;
    }

    setEnvoi(true);
    try {
      const formData = new FormData();
      formData.append("file", fichier);
      const res = await api.upload<{ url: string; nomFichier: string }>(
        "/uploads/document",
        formData,
      );
      onChange({ url: res.url, nom: res.nomFichier });
    } catch (err) {
      setErreur(
        err instanceof ApiError ? err.message : "Impossible d'envoyer le fichier.",
      );
    } finally {
      setEnvoi(false);
    }
  }

  if (valeur) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-ocre-dark/40 bg-ocre/10 px-3 py-1.5 text-xs text-ocre-dark">
        <FileText size={13} />
        <span className="max-w-[160px] truncate">{valeur.nom}</span>
        <button
          type="button"
          onClick={() => onChange(null)}
          disabled={disabled}
          aria-label="Retirer la pièce jointe"
          className="text-ocre-dark/70 hover:text-brique"
        >
          <X size={13} />
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || envoi}
        title="Joindre un fichier"
        className="inline-flex items-center gap-1.5 rounded-full border border-ink/25 px-3 py-1.5 text-xs text-ink-soft transition-colors hover:bg-ink/5 disabled:cursor-wait disabled:opacity-60"
      >
        {envoi ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <Paperclip size={13} />
        )}
        {envoi ? "Envoi…" : "Joindre un fichier"}
      </button>
      <input
        ref={inputRef}
        type="file"
        onChange={onFichierChoisi}
        className="sr-only"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.jpg,.jpeg,.png,.webp,.txt"
      />
      {erreur && <p className="mt-1 text-xs text-brique">{erreur}</p>}
    </div>
  );
}

/**
 * Affiche une pièce jointe déjà envoyée sous forme de lien
 * téléchargeable (message reçu, cahier des charges consulté…).
 */
export function PieceJointeAffichage({
  url,
  nom,
}: {
  url: string;
  nom?: string | null;
}) {
  const lienComplet = getFileUrl(url);
  if (!lienComplet) return null;

  return (
    <a
      href={lienComplet}
      target="_blank"
      rel="noreferrer"
      download={nom ?? undefined}
      className="inline-flex items-center gap-1.5 rounded-full border border-ink/20 bg-ink/[0.03] px-3 py-1.5 text-xs text-ink-soft hover:bg-ink/[0.06] transition-colors"
    >
      <FileText size={13} />
      <span className="max-w-[200px] truncate">{nom ?? "Pièce jointe"}</span>
    </a>
  );
}
