"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { api, ApiError, getFileUrl } from "@/lib/api";

const TAILLE_MAX = 5 * 1024 * 1024; // 5 Mo
const TYPES_ACCEPTES = ["image/jpeg", "image/png", "image/webp"];

type UploadResponse = { url?: string };

/**
 * Selecteur de plusieurs images (services : 5 max, la premiere sert de
 * couverture). Chaque fichier est envoye immediatement a /uploads/image ;
 * `valeur` contient toujours la liste des URLs deja enregistrees par le
 * backend (jamais de blob local une fois l'upload termine).
 */
export function SelecteurImages({
  valeur,
  onChange,
  disabled = false,
  max = 5,
}: {
  valeur: string[];
  onChange: (urls: string[]) => void;
  disabled?: boolean;
  max?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const placesRestantes = Math.max(0, max - valeur.length);

  async function onFichiersChoisis(event: React.ChangeEvent<HTMLInputElement>) {
    const fichiers = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (fichiers.length === 0) return;

    setErreur(null);
    const aEnvoyer = fichiers.slice(0, placesRestantes);
    if (fichiers.length > aEnvoyer.length) {
      setErreur(`Maximum ${max} images : seules les ${aEnvoyer.length} premieres seront ajoutees.`);
    }

    const urlsAjoutees: string[] = [];
    setEnvoi(true);
    try {
      for (const fichier of aEnvoyer) {
        if (!TYPES_ACCEPTES.includes(fichier.type)) {
          setErreur("Format non supporté. Utilisez JPG, PNG ou WebP.");
          continue;
        }
        if (fichier.size > TAILLE_MAX) {
          setErreur("Une image dépasse la taille maximale de 5 Mo.");
          continue;
        }
        const formData = new FormData();
        formData.append("file", fichier);
        const response = await api.upload<UploadResponse>("/uploads/image", formData);
        if (!response?.url) {
          throw new Error("Le serveur n'a pas retourné l'URL de l'image.");
        }
        urlsAjoutees.push(response.url);
      }
      if (urlsAjoutees.length > 0) {
        onChange([...valeur, ...urlsAjoutees]);
      }
    } catch (error) {
      setErreur(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Impossible d'envoyer l'image.",
      );
    } finally {
      setEnvoi(false);
    }
  }

  function retirer(index: number) {
    onChange(valeur.filter((_, i) => i !== index));
  }

  function choisirImages() {
    if (disabled || envoi || placesRestantes === 0) return;
    inputRef.current?.click();
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={TYPES_ACCEPTES.join(",")}
        multiple
        className="hidden"
        onChange={onFichiersChoisis}
      />
      <div className="flex flex-wrap gap-3">
        {valeur.map((url, index) => (
          <div
            key={url + index}
            className="relative h-24 w-24 overflow-hidden rounded-xl border border-ink/15 bg-ink/[0.02]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getFileUrl(url) ?? undefined}
              alt=""
              className="h-full w-full object-cover"
            />
            {index === 0 && (
              <span className="absolute bottom-1 left-1 rounded bg-ink/70 px-1.5 py-0.5 text-[10px] font-medium text-paper-light">
                Couverture
              </span>
            )}
            <button
              type="button"
              onClick={() => retirer(index)}
              disabled={disabled || envoi}
              aria-label="Retirer cette image"
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink/70 text-paper-light hover:bg-brique disabled:cursor-not-allowed"
            >
              <X size={12} />
            </button>
          </div>
        ))}

        {placesRestantes > 0 && (
          <button
            type="button"
            onClick={choisirImages}
            disabled={disabled || envoi}
            className="flex h-24 w-24 flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-ink/25 text-ink-soft/60 transition-colors hover:text-ocre-dark disabled:cursor-wait"
          >
            {envoi ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <ImagePlus size={20} />
            )}
            <span className="text-[11px]">{envoi ? "Envoi…" : "Ajouter"}</span>
          </button>
        )}
      </div>

      <p className="mt-1.5 text-xs text-ink-soft/70">
        JPG, PNG ou WebP · 5 Mo max · {max} images max, la première sert de couverture
      </p>

      {erreur && <p className="text-xs text-brique">{erreur}</p>}
    </div>
  );
}
