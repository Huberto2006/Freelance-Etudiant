"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { clsx } from "clsx";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { TypeCibleFavori } from "@/lib/types";

/**
 * Bouton cœur pour ajouter/retirer une mission, un service ou un profil
 * étudiant de ses favoris. Invisible pour les visiteurs non connectés.
 */
export function FavoriBouton({
  cibleType,
  cibleId,
  className,
}: {
  cibleType: TypeCibleFavori;
  cibleId: string;
  className?: string;
}) {
  const { utilisateur } = useAuth();
  const [enFavori, setEnFavori] = useState<boolean | null>(null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (!utilisateur) return;
    api
      .get<{ cibleType: TypeCibleFavori; cibleId: string }[]>(
        `/favoris?cibleType=${cibleType}`,
      )
      .then((favoris) =>
        setEnFavori(favoris.some((f) => f.cibleId === cibleId)),
      )
      .catch(() => setEnFavori(false));
  }, [utilisateur, cibleType, cibleId]);

  if (!utilisateur || enFavori === null) return null;

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (envoi) return;
    setEnvoi(true);
    try {
      const res = await api.post<{ enFavori: boolean }>("/favoris", {
        cibleType,
        cibleId,
      });
      setEnFavori(res.enFavori);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={envoi}
      title={enFavori ? "Retirer des favoris" : "Ajouter aux favoris"}
      aria-label={enFavori ? "Retirer des favoris" : "Ajouter aux favoris"}
      className={clsx(
        "inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors disabled:opacity-60",
        enFavori
          ? "border-brique bg-brique/10 text-brique"
          : "border-ink/25 text-ink-soft hover:bg-ink/5",
        className,
      )}
    >
      <Heart size={15} fill={enFavori ? "currentColor" : "none"} />
    </button>
  );
}
