"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import type { MessageAvecUtilisateurs } from "@/lib/message-types";
import { formatDateCourte } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { NoticeCard } from "@/components/ui/Notice";

export default function MessagesPage() {
  const { utilisateur } = useAuth();
  const [conversations, setConversations] = useState<MessageAvecUtilisateurs[]>([]);
  const [contactActif, setContactActif] = useState<{ id: string; nom: string } | null>(
    null,
  );
  const [fil, setFil] = useState<MessageAvecUtilisateurs[]>([]);
  const [nouveauMessage, setNouveauMessage] = useState("");
  const [chargement, setChargement] = useState(true);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const data = await api.get<MessageAvecUtilisateurs[]>("/messages");
      setConversations(data);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  const contacts = useMemo(() => {
    if (!utilisateur) return [];
    const map = new Map<string, { id: string; nom: string; dernier: string }>();
    for (const m of conversations) {
      const autre =
        m.expediteurId === utilisateur.id ? m.destinataire : m.expediteur;
      if (!autre) continue;
      if (!map.has(autre.id)) {
        map.set(autre.id, { id: autre.id, nom: autre.nom, dernier: m.contenu });
      }
    }
    return Array.from(map.values());
  }, [conversations, utilisateur]);

  const chargerFil = useCallback(async (contactId: string) => {
    const data = await api.get<MessageAvecUtilisateurs[]>(
      `/messages/conversation/${contactId}`,
    );
    setFil(data);
  }, []);

  useEffect(() => {
    if (contactActif) chargerFil(contactActif.id);
  }, [contactActif, chargerFil]);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if (!contactActif || !nouveauMessage.trim()) return;
    await api.post("/messages", {
      destinataireId: contactActif.id,
      contenu: nouveauMessage,
    });
    setNouveauMessage("");
    await chargerFil(contactActif.id);
    charger();
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold mb-8">Messages</h1>

      {chargement ? (
        <p className="text-sm text-ink-soft">Chargement…</p>
      ) : contacts.length === 0 && !contactActif ? (
        <p className="text-sm text-ink-soft">
          Aucune conversation pour l&apos;instant. Les échanges démarrent
          depuis la fiche d&apos;une mission ou d&apos;un profil.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-[220px_1fr]">
          <div className="flex flex-row gap-2 overflow-x-auto sm:flex-col sm:overflow-visible">
            {contacts.map((c) => (
              <button
                key={c.id}
                onClick={() => setContactActif(c)}
                className={`text-left border px-3 py-2.5 text-sm whitespace-nowrap sm:whitespace-normal transition-colors ${
                  contactActif?.id === c.id
                    ? "border-ocre-dark bg-ocre/10 text-ocre-dark"
                    : "border-ink/15 hover:border-ink/40"
                }`}
              >
                <p className="font-medium">{c.nom}</p>
                <p className="text-xs text-ink-soft/70 truncate hidden sm:block">
                  {c.dernier}
                </p>
              </button>
            ))}
          </div>

          <div>
            {!contactActif ? (
              <p className="text-sm text-ink-soft">
                Sélectionnez une conversation.
              </p>
            ) : (
              <NoticeCard className="flex flex-col h-[480px]">
                <p className="font-display font-medium mb-3">
                  {contactActif.nom}
                </p>
                <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1">
                  {fil.map((m) => {
                    const estMoi = m.expediteurId === utilisateur?.id;
                    return (
                      <div
                        key={m.id}
                        className={`max-w-[75%] px-3 py-2 text-sm ${
                          estMoi
                            ? "self-end bg-rice text-paper-light"
                            : "self-start bg-ink/5 text-ink"
                        }`}
                      >
                        <p>{m.contenu}</p>
                        <p
                          className={`mt-1 text-[10px] font-mono ${
                            estMoi ? "text-paper-light/70" : "text-ink-soft/60"
                          }`}
                        >
                          {formatDateCourte(m.dateEnvoi)}
                        </p>
                      </div>
                    );
                  })}
                </div>
                <form onSubmit={envoyer} className="mt-3 flex gap-2">
                  <Textarea
                    rows={1}
                    value={nouveauMessage}
                    onChange={(e) => setNouveauMessage(e.target.value)}
                    placeholder="Écrire un message…"
                    className="flex-1"
                  />
                  <Button type="submit" size="sm">
                    Envoyer
                  </Button>
                </form>
              </NoticeCard>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
