"use client";

import { useEffect, useState } from "react";
import { ThumbsUp } from "lucide-react";
import { clsx } from "clsx";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { ReactionInfo } from "@/lib/types";

/**
 * Bouton "réagir" affiché sur la fiche publique d'un profil (étudiant ou
 * client). Tout utilisateur connecté peut réagir une seule fois par
 * profil ; un second clic retire la réaction.
 */
export function ReactionProfil({ utilisateurId }: { utilisateurId: string }) {
  const { utilisateur } = useAuth();
  const [info, setInfo] = useState<ReactionInfo | null>(null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    api
      .get<ReactionInfo>(`/utilisateurs/${utilisateurId}/reactions`)
      .then(setInfo)
      .catch(() => setInfo({ total: 0, jaiReagi: false }));
  }, [utilisateurId]);

  const estSoiMeme = utilisateur?.id === utilisateurId;

  async function toggle() {
    if (!utilisateur || envoi || estSoiMeme) return;
    setEnvoi(true);
    try {
      const nouvelleInfo = await api.post<ReactionInfo>(
        `/utilisateurs/${utilisateurId}/reactions`,
      );
      setInfo(nouvelleInfo);
    } catch (err) {
      if (err instanceof ApiError) {
        // silencieux : le bouton reste dans son etat precedent
      }
    } finally {
      setEnvoi(false);
    }
  }

  if (!info || estSoiMeme) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!utilisateur || envoi}
      title={
        utilisateur
          ? "Réagir à ce profil"
          : "Connectez-vous pour réagir à ce profil"
      }
      className={clsx(
        "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        info.jaiReagi
          ? "border-ocre-dark bg-ocre/15 text-ocre-dark"
          : "border-ink/25 text-ink-soft hover:bg-ink/5",
      )}
    >
      <ThumbsUp size={15} fill={info.jaiReagi ? "currentColor" : "none"} />
      {info.total > 0 ? info.total : "Réagir"}
    </button>
  );
}
