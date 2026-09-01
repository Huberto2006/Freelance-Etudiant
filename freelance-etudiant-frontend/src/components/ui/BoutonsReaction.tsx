"use client";

import { useEffect, useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { clsx } from "clsx";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type {
  InfoReactionsContenu,
  TypeCibleContenu,
  TypeReactionContenu,
} from "@/lib/types";

/**
 * Boutons 👍 / 👎 réutilisables pour une mission ou un service. Une seule
 * réaction active par utilisateur : cliquer sur la même bascule (retire),
 * cliquer sur l'autre la remplace.
 */
export function BoutonsReaction({
  cibleType,
  cibleId,
}: {
  cibleType: TypeCibleContenu;
  cibleId: string;
}) {
  const { utilisateur } = useAuth();
  const [info, setInfo] = useState<InfoReactionsContenu | null>(null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    api
      .get<InfoReactionsContenu>(
        `/reactions-contenu?cibleType=${cibleType}&cibleId=${cibleId}`,
      )
      .then(setInfo)
      .catch(() => setInfo({ jaime: 0, jenaimepas: 0, maReaction: null }));
  }, [cibleType, cibleId]);

  async function reagir(type: TypeReactionContenu) {
    if (!utilisateur || envoi) return;
    setEnvoi(true);
    try {
      const nouvelleInfo = await api.post<InfoReactionsContenu>(
        "/reactions-contenu",
        { cibleType, cibleId, type },
      );
      setInfo(nouvelleInfo);
    } catch (err) {
      if (err instanceof ApiError) {
        // silencieux : les boutons restent dans leur etat precedent
      }
    } finally {
      setEnvoi(false);
    }
  }

  if (!info) return null;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => reagir("jaime")}
        disabled={!utilisateur || envoi}
        title={utilisateur ? "J'aime" : "Connectez-vous pour réagir"}
        className={clsx(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60",
          info.maReaction === "jaime"
            ? "border-rice bg-rice/10 text-rice"
            : "border-ink/25 text-ink-soft hover:bg-ink/5",
        )}
      >
        <ThumbsUp size={14} fill={info.maReaction === "jaime" ? "currentColor" : "none"} />
        {info.jaime}
      </button>

      <button
        type="button"
        onClick={() => reagir("jenaimepas")}
        disabled={!utilisateur || envoi}
        title={utilisateur ? "Je n'aime pas" : "Connectez-vous pour réagir"}
        className={clsx(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60",
          info.maReaction === "jenaimepas"
            ? "border-brique bg-brique/10 text-brique"
            : "border-ink/25 text-ink-soft hover:bg-ink/5",
        )}
      >
        <ThumbsDown
          size={14}
          fill={info.maReaction === "jenaimepas" ? "currentColor" : "none"}
        />
        {info.jenaimepas}
      </button>
    </div>
  );
}
