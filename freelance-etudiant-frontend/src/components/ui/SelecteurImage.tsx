"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { api, ApiError, getFileUrl } from "@/lib/api";

const TAILLE_MAX = 5 * 1024 * 1024; // 5 Mo
const TYPES_ACCEPTES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Sélecteur d'image principale réutilisable (mission, service...).
 * Envoie immédiatement le fichier à /uploads/document (même endpoint
 * générique que les pièces jointes de message), affiche un aperçu, et
 * remonte l'URL relative au formulaire parent via onChange.
 */
export function SelecteurImage({
  valeur,
  onChange,
  disabled,
  ratio = "aspect-video",
}: {
  valeur?: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
  ratio?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [apercu, setApercu] = useState<string | null>(null);

  const imageActuelle = apercu ?? getFileUrl(valeur);

  async function onFichierChoisi(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    e.target.value = "";
    if (!fichier) return;

    setErreur(null);

    if (!TYPES_ACCEPTES.includes(fichier.type)) {
      setErreur("Format non supporté. Utilisez JPG, PNG ou WebP.");
      return;
    }
    if (fichier.size > TAILLE_MAX) {
      setErreur("L'image dépasse la taille maximale de 5 Mo.");
      return;
    }

    const urlLocale = URL.createObjectURL(fichier);
    setApercu(urlLocale);
    setEnvoi(true);

    try {
      const formData = new FormData();
      formData.append("file", fichier);
      const res = await api.upload<{ url: string }>("/uploads/document", formData);
      onChange(res.url);
    } catch (err) {
      setErreur(
        err instanceof ApiError ? err.message : "Impossible d'envoyer l'image.",
      );
      setApercu(null);
    } finally {
      setEnvoi(false);
      URL.revokeObjectURL(urlLocale);
    }
  }

  function retirer() {
    setApercu(null);
    onChange(null);
  }

  return (
    <div>
      <div
        className={`relative ${ratio} w-full max-w-sm overflow-hidden rounded-xl border-2 border-dashed border-ink/25 bg-ink/[0.02]`}
      >
        {imageActuelle ? (
          <>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled || envoi}
              className="block h-full w-full disabled:cursor-wait"
              title="Cliquer pour remplacer l'image"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageActuelle}
                alt="Aperçu de l'image principale"
                className="h-full w-full object-cover"
              />
            </button>
            <button
              type="button"
              onClick={retirer}
              disabled={disabled || envoi}
              aria-label="Retirer l'image"
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-ink/70 text-paper-light hover:bg-brique"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || envoi}
            className="flex h-full w-full flex-col items-center justify-center gap-2 text-ink-soft/60 transition-colors hover:text-ocre-dark disabled:cursor-wait"
          >
            {envoi ? (
              <Loader2 size={22} className="animate-spin" />
            ) : (
              <ImagePlus size={22} />
            )}
            <span className="text-xs">
              {envoi ? "Envoi…" : "Ajouter une image"}
            </span>
          </button>
        )}

        {envoi && imageActuelle && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink/40">
            <Loader2 size={22} className="animate-spin text-paper-light" />
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onFichierChoisi}
        className="sr-only"
      />

      <p className="mt-1.5 text-xs text-ink-soft/70">
        JPG, PNG ou WebP · 5 Mo max
      </p>
      {erreur && <p className="text-xs text-brique">{erreur}</p>}
    </div>
  );
}
