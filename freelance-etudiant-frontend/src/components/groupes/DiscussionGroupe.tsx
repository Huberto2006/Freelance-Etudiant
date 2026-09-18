"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MessageCircle, Send } from "lucide-react";

import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useSocket } from "@/lib/socket-context";
import type { MessageAvecUtilisateurs } from "@/lib/message-types";
import { formatDateCourte } from "@/lib/format";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { NoticeCard } from "@/components/ui/Notice";

export function DiscussionGroupe({
  groupeId,
  nombreMembres,
}: {
  groupeId: string;
  nombreMembres: number;
}) {
  const { utilisateur } = useAuth();
  const { socket } = useSocket();
  const [messages, setMessages] = useState<MessageAvecUtilisateurs[]>([]);
  const [texte, setTexte] = useState("");
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const zoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (nombreMembres < 2) return;
    let annule = false;

    async function charger() {
      setChargement(true);
      try {
        const data = await api.get<MessageAvecUtilisateurs[]>(
          `/messages/groupes/${groupeId}`,
        );
        if (!annule) setMessages(data);
        await api.patch(`/messages/groupes/${groupeId}/lu`);
      } catch (error) {
        if (!annule) {
          setErreur(
            error instanceof ApiError
              ? error.message
              : "Impossible de charger la discussion.",
          );
        }
      } finally {
        if (!annule) setChargement(false);
      }
    }

    void charger();
    return () => {
      annule = true;
    };
  }, [groupeId, nombreMembres]);

  useEffect(() => {
    if (!socket || nombreMembres < 2) return;

    function recevoir(message: MessageAvecUtilisateurs) {
      if (message.groupeId !== groupeId) return;
      setMessages((anciens) =>
        anciens.some((item) => item.id === message.id)
          ? anciens
          : [...anciens, message],
      );
    }

    function supprimer(payload: { id: string }) {
      setMessages((anciens) =>
        anciens.map((message) =>
          message.id === payload.id
            ? { ...message, estSupprime: true, contenu: "" }
            : message,
        ),
      );
    }

    socket.on("message:groupe:nouveau", recevoir);
    socket.on("message:groupe:supprime", supprimer);
    return () => {
      socket.off("message:groupe:nouveau", recevoir);
      socket.off("message:groupe:supprime", supprimer);
    };
  }, [socket, groupeId, nombreMembres]);

  useEffect(() => {
    if (zoneRef.current) zoneRef.current.scrollTop = zoneRef.current.scrollHeight;
  }, [messages]);

  async function envoyer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const contenu = texte.trim();
    if (!contenu || envoi) return;

    setEnvoi(true);
    setErreur(null);
    try {
      await api.post(`/messages/groupes/${groupeId}`, { contenu });
      setTexte("");
    } catch (error) {
      setErreur(
        error instanceof ApiError
          ? error.message
          : "Impossible d'envoyer le message.",
      );
    } finally {
      setEnvoi(false);
    }
  }

  if (nombreMembres < 2) return null;

  return (
    <NoticeCard className="mt-6">
      <div className="flex items-center gap-2 border-b border-ink/10 pb-4">
        <MessageCircle size={18} className="text-bleu-dark" aria-hidden="true" />
        <h2 className="font-display text-lg font-semibold">Discussion du groupe</h2>
      </div>

      {erreur && <p className="mt-3 text-sm text-brique" role="alert">{erreur}</p>}

      <div ref={zoneRef} className="my-4 max-h-80 min-h-32 space-y-3 overflow-y-auto pr-1">
        {chargement ? (
          <p className="flex items-center gap-2 text-sm text-ink-soft">
            <Loader2 size={15} className="animate-spin" aria-hidden="true" />
            Chargement de la discussion…
          </p>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-soft/70">Aucun message dans cette discussion.</p>
        ) : (
          messages.map((message) => {
            const estMoi = message.expediteurId === utilisateur?.id;
            const nom = estMoi ? "Vous" : message.expediteur?.nom ?? "Étudiant";
            return (
              <div key={message.id} className={`flex gap-2 ${estMoi ? "justify-end" : ""}`}>
                {!estMoi && <Avatar nom={nom} photoUrl={message.expediteur?.photoUrl} size={30} />}
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${estMoi ? "bg-ink text-paper-light" : "bg-ink/5 text-ink"}`}>
                  <p className="mb-1 text-[11px] font-medium opacity-70">{nom}</p>
                  <p className={message.estSupprime ? "italic opacity-60" : "whitespace-pre-wrap break-words"}>
                    {message.estSupprime ? "Message supprimé" : message.contenu}
                  </p>
                  <p className="mt-1 text-[10px] opacity-60">{formatDateCourte(message.dateEnvoi)}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={envoyer} className="flex items-end gap-2 border-t border-ink/10 pt-4">
        <textarea
          value={texte}
          onChange={(event) => setTexte(event.target.value)}
          placeholder="Écrire un message…"
          aria-label="Message du groupe"
          rows={2}
          disabled={envoi}
          className="min-w-0 flex-1 resize-none rounded-lg border border-ink/20 bg-paper-light px-3 py-2 text-sm outline-none focus:border-bleu-dark"
        />
        <Button type="submit" size="sm" disabled={envoi || !texte.trim()} aria-label="Envoyer le message" className="flex items-center gap-1.5">
          {envoi ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          <span className="hidden sm:inline">Envoyer</span>
        </Button>
      </form>
    </NoticeCard>
  );
}
