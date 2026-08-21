"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, User as UserIcon } from "lucide-react";
import { api, ApiError, getFileUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Utilisateur } from "@/lib/types";

const TYPES_ACCEPTES = ["image/jpeg", "image/png", "image/webp"];
const TAILLE_MAX = 5 * 1024 * 1024; // 5 Mo, aligné sur la limite backend

/**
 * Avatar circulaire "tampon" avec upload de photo de profil.
 * Utilise l'endpoint POST /uploads/profile (etudiant et client uniquement).
 */
export function PhotoProfil({
  utilisateur,
  size = 96,
}: {
  utilisateur: Utilisateur;
  size?: number;
}) {
  const { rafraichirProfil } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [apercu, setApercu] = useState<string | null>(null);

  const photoActuelle = apercu ?? getFileUrl(utilisateur.photoUrl);
  const initiales = utilisateur.nom
    .split(" ")
    .map((mot) => mot[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  function ouvrirSelecteur() {
    if (!envoi) inputRef.current?.click();
  }

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
      await api.upload<{ message: string; url: string }>(
        "/uploads/profile",
        formData,
      );
      await rafraichirProfil();
    } catch (err) {
      setErreur(
        err instanceof ApiError ? err.message : "Impossible d'envoyer la photo.",
      );
      setApercu(null);
    } finally {
      setEnvoi(false);
      URL.revokeObjectURL(urlLocale);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2 sm:items-start">
      <div
        className="group relative shrink-0"
        style={{ width: size, height: size }}
      >
        <button
          type="button"
          onClick={ouvrirSelecteur}
          disabled={envoi}
          title="Changer la photo de profil"
          aria-label="Changer la photo de profil"
          className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border-2 border-rice bg-ocre/10 text-ocre-dark transition-opacity disabled:cursor-wait"
        >
          {photoActuelle ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoActuelle}
              alt={`Photo de profil de ${utilisateur.nom}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="font-display text-2xl font-semibold">
              {initiales || <UserIcon size={size * 0.4} />}
            </span>
          )}

          {/* Voile au survol / pendant l'envoi */}
          <span
            className="absolute inset-0 flex items-center justify-center bg-ink/50 text-paper-light opacity-0 transition-opacity group-hover:opacity-100"
            style={{ opacity: envoi ? 1 : undefined }}
            aria-hidden="true"
          >
            {envoi ? (
              <Loader2 size={size * 0.28} className="animate-spin" />
            ) : (
              <Camera size={size * 0.28} />
            )}
          </span>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onFichierChoisi}
          className="sr-only"
        />
      </div>

      <p className="text-xs text-ink-soft/70">
        JPG, PNG ou WebP · 5 Mo max
      </p>
      {erreur && <p className="text-xs text-brique">{erreur}</p>}
    </div>
  );
}
