"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { api, ApiError, getFileUrl } from "@/lib/api";

const TAILLE_MAX = 5 * 1024 * 1024; // 5 Mo

const TYPES_ACCEPTES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

type SelecteurImageProps = {
  valeur?: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
  ratio?: string;
};

type UploadResponse = {
  url?: string;
};

export function SelecteurImage({
  valeur,
  onChange,
  disabled = false,
  ratio = "aspect-video",
}: SelecteurImageProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [apercu, setApercu] = useState<string | null>(null);

  /*
   * L'aperçu local est prioritaire pendant l'upload.
   * Sinon, on affiche l'image déjà enregistrée.
   */
  const imageActuelle =
    apercu || getFileUrl(valeur);

  async function onFichierChoisi(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const fichier = event.target.files?.[0];

    // Permet de sélectionner à nouveau le même fichier.
    event.target.value = "";

    if (!fichier) return;

    setErreur(null);

    /*
     * Validation du type.
     */
    if (!TYPES_ACCEPTES.includes(fichier.type)) {
      setErreur(
        "Format non supporté. Utilisez JPG, PNG ou WebP.",
      );
      return;
    }

    /*
     * Validation de la taille.
     */
    if (fichier.size > TAILLE_MAX) {
      setErreur(
        "L'image dépasse la taille maximale de 5 Mo.",
      );
      return;
    }

    /*
     * Aperçu local immédiat.
     */
    const urlLocale = URL.createObjectURL(fichier);

    setApercu(urlLocale);
    setEnvoi(true);

    try {
      const formData = new FormData();

      formData.append("file", fichier);

      const response =
        await api.upload<UploadResponse>(
          "/uploads/image",
          formData,
        );

      /*
       * Le backend doit retourner une URL.
       */
      if (!response?.url) {
        throw new Error(
          "Le serveur n'a pas retourné l'URL de l'image.",
        );
      }

      /*
       * On conserve exactement la valeur retournée
       * par le backend dans le formulaire parent.
       */
      onChange(response.url);

      /*
       * L'aperçu local n'est plus nécessaire :
       * l'image finale sera maintenant calculée avec
       * getFileUrl(response.url).
       */
      setApercu(null);
    } catch (error) {
      setApercu(null);

      setErreur(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Impossible d'envoyer l'image.",
      );
    } finally {
      setEnvoi(false);

      /*
       * L'URL blob n'est plus utilisée après l'upload.
       */
      URL.revokeObjectURL(urlLocale);
    }
  }

  function retirer() {
    setApercu(null);
    setErreur(null);
    onChange(null);
  }

  function choisirImage() {
    if (disabled || envoi) return;
    inputRef.current?.click();
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
              onClick={choisirImage}
              disabled={disabled || envoi}
              className="block h-full w-full disabled:cursor-wait"
              title="Cliquer pour remplacer l'image"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageActuelle}
                alt="Aperçu de l'image principale"
                className="h-full w-full object-cover"
                onError={() => {
                  /*
                   * Permet de signaler clairement qu'une URL
                   * retournée par l'API n'est pas accessible.
                   */
                  setErreur(
                    "Impossible d'afficher cette image. Vérifiez l'URL retournée par le serveur.",
                  );
                }}
              />
            </button>

            <button
              type="button"
              onClick={retirer}
              disabled={disabled || envoi}
              aria-label="Retirer l'image"
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-ink/70 text-paper-light hover:bg-brique disabled:cursor-not-allowed"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={choisirImage}
            disabled={disabled || envoi}
            className="flex h-full w-full flex-col items-center justify-center gap-2 text-ink-soft/60 transition-colors hover:text-ocre-dark disabled:cursor-wait"
          >
            {envoi ? (
              <Loader2
                size={22}
                className="animate-spin"
              />
            ) : (
              <ImagePlus size={22} />
            )}

            <span className="text-xs">
              {envoi
                ? "Envoi…"
                : "Ajouter une image"}
            </span>
          </button>
        )}

        {envoi && imageActuelle && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink/40">
            <Loader2
              size={22}
              className="animate-spin text-paper-light"
            />
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onFichierChoisi}
        disabled={disabled || envoi}
        className="sr-only"
      />

      <p className="mt-1.5 text-xs text-ink-soft/70">
        JPG, PNG ou WebP · 5 Mo max
      </p>

      {erreur && (
        <p className="text-xs text-brique">
          {erreur}
        </p>
      )}
    </div>
  );
}