"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { MessageAvecUtilisateurs } from "@/lib/message-types";
import { formatDateCourte } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { NoticeCard } from "@/components/ui/Notice";

export default function MessagesPage() {
  const { utilisateur } = useAuth();

  const [conversations, setConversations] = useState<
    MessageAvecUtilisateurs[]
  >([]);

  const [contactActif, setContactActif] = useState<{
    id: string;
    nom: string;
  } | null>(null);

  const [fil, setFil] = useState<MessageAvecUtilisateurs[]>([]);

  const [nouveauMessage, setNouveauMessage] = useState("");

  const [chargement, setChargement] = useState(true);
  const [chargementFil, setChargementFil] = useState(false);

  const [erreur, setErreur] = useState<string | null>(null);

  const [envoi, setEnvoi] = useState(false);

  /**
   * Charge toutes les conversations.
   *
   * Cette fonction est utilisée après l'envoi d'un message
   * ou après une autre action nécessitant un rafraîchissement.
   */
  const charger = useCallback(async () => {
    setErreur(null);

    try {
      const data = await api.get<MessageAvecUtilisateurs[]>(
        "/messages",
      );

      setConversations(data);
    } catch (error) {
      console.error(
        "Erreur lors du chargement des messages :",
        error,
      );

      setErreur(
        error instanceof ApiError
          ? error.message
          : "Impossible de charger les conversations.",
      );
    }
  }, []);

  /**
   * Chargement initial.
   *
   * On ne fait pas directement :
   *
   * useEffect(() => {
   *   charger();
   * }, [charger]);
   *
   * car charger() modifie l'état.
   */
  useEffect(() => {
    let cancelled = false;

    const chargerInitial = async () => {
      try {
        const data = await api.get<MessageAvecUtilisateurs[]>(
          "/messages",
        );

        if (!cancelled) {
          setConversations(data);
          setErreur(null);
        }
      } catch (error) {
        console.error(
          "Erreur lors du chargement initial des messages :",
          error,
        );

        if (!cancelled) {
          setErreur(
            error instanceof ApiError
              ? error.message
              : "Impossible de charger les conversations.",
          );
        }
      } finally {
        if (!cancelled) {
          setChargement(false);
        }
      }
    };

    chargerInitial();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Liste des contacts.
   */
  const contacts = useMemo(() => {
    if (!utilisateur) return [];

    const map = new Map<
      string,
      {
        id: string;
        nom: string;
        dernier: string;
      }
    >();

    for (const message of conversations) {
      const autre =
        message.expediteurId === utilisateur.id
          ? message.destinataire
          : message.expediteur;

      if (!autre) continue;

      if (!map.has(autre.id)) {
        map.set(autre.id, {
          id: autre.id,
          nom: autre.nom,
          dernier: message.contenu,
        });
      }
    }

    return Array.from(map.values());
  }, [conversations, utilisateur]);

  /**
   * Charge les messages d'une conversation.
   */
  const chargerFil = useCallback(
    async (contactId: string) => {
      setChargementFil(true);
      setErreur(null);

      try {
        const data = await api.get<MessageAvecUtilisateurs[]>(
          `/messages/conversation/${contactId}`,
        );

        setFil(data);
      } catch (error) {
        console.error(
          "Erreur lors du chargement de la conversation :",
          error,
        );

        setErreur(
          error instanceof ApiError
            ? error.message
            : "Impossible de charger cette conversation.",
        );
      } finally {
        setChargementFil(false);
      }
    },
    [],
  );

  /**
   * Charge la conversation lorsqu'un contact est sélectionné.
   */
  useEffect(() => {
    if (!contactActif) {
      return;
    }

    let cancelled = false;

    const chargerConversation = async () => {
      setChargementFil(true);
      setErreur(null);

      try {
        const data = await api.get<MessageAvecUtilisateurs[]>(
          `/messages/conversation/${contactActif.id}`,
        );

        if (!cancelled) {
          setFil(data);
        }
      } catch (error) {
        console.error(
          "Erreur lors du chargement de la conversation :",
          error,
        );

        if (!cancelled) {
          setErreur(
            error instanceof ApiError
              ? error.message
              : "Impossible de charger cette conversation.",
          );
        }
      } finally {
        if (!cancelled) {
          setChargementFil(false);
        }
      }
    };

    chargerConversation();

    return () => {
      cancelled = true;
    };
  }, [contactActif]);

  /**
   * Envoi d'un message.
   */
  async function envoyer(
    e: React.FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();

    if (
      !contactActif ||
      !nouveauMessage.trim() ||
      envoi
    ) {
      return;
    }

    setEnvoi(true);
    setErreur(null);

    try {
      await api.post("/messages", {
        destinataireId: contactActif.id,
        contenu: nouveauMessage.trim(),
      });

      setNouveauMessage("");

      await chargerFil(contactActif.id);
      await charger();
    } catch (error) {
      console.error(
        "Erreur lors de l'envoi du message :",
        error,
      );

      setErreur(
        error instanceof ApiError
          ? error.message
          : "Impossible d'envoyer le message.",
      );
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div>
      {/* Titre */}
      <div className="mb-8 flex items-center gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ocre/10 text-ocre-dark"
          aria-hidden="true"
        >
          <MessageCircle size={20} />
        </span>
        <h1 className="font-display text-3xl font-semibold">
          Messages
        </h1>
      </div>

      {/* Erreur */}
      {erreur && (
        <NoticeCard className="mb-5">
          <p className="text-sm text-brique">
            {erreur}
          </p>
        </NoticeCard>
      )}

      {/* Chargement initial */}
      {chargement ? (
        <p className="text-sm text-ink-soft">
          Chargement…
        </p>
      ) : contacts.length === 0 && !contactActif ? (
        <p className="text-sm text-ink-soft">
          Aucune conversation pour l&apos;instant. Les échanges
          démarrent depuis la fiche d&apos;une mission ou d&apos;un
          profil.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-[220px_1fr]">
          {/* ================================================
              LISTE DES CONTACTS
              ================================================ */}
          <div className="flex flex-row gap-2 overflow-x-auto sm:flex-col sm:overflow-visible">
            {contacts.map((contact) => (
              <button
                key={contact.id}
                type="button"
                onClick={() =>
                  setContactActif(contact)
                }
                className={`text-left border px-3 py-2.5 text-sm whitespace-nowrap sm:whitespace-normal transition-colors ${
                  contactActif?.id === contact.id
                    ? "border-ocre-dark bg-ocre/10 text-ocre-dark"
                    : "border-ink/15 hover:border-ink/40"
                }`}
              >
                <p className="font-medium">
                  {contact.nom}
                </p>

                <p className="text-xs text-ink-soft/70 truncate hidden sm:block">
                  {contact.dernier}
                </p>
              </button>
            ))}
          </div>

          {/* ================================================
              CONVERSATION
              ================================================ */}
          <div>
            {!contactActif ? (
              <p className="text-sm text-ink-soft">
                Sélectionnez une conversation.
              </p>
            ) : (
              <NoticeCard className="flex flex-col h-[480px]">
                {/* Nom du contact */}
                <p className="font-display font-medium mb-3">
                  {contactActif.nom}
                </p>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1">
                  {chargementFil ? (
                    <p className="text-sm text-ink-soft">
                      Chargement de la conversation…
                    </p>
                  ) : fil.length === 0 ? (
                    <p className="text-sm text-ink-soft">
                      Aucun message dans cette conversation.
                    </p>
                  ) : (
                    fil.map((message) => {
                      const estMoi =
                        message.expediteurId ===
                        utilisateur?.id;

                      return (
                        <div
                          key={message.id}
                          className={`max-w-[75%] px-3 py-2 text-sm ${
                            estMoi
                              ? "self-end bg-rice text-paper-light"
                              : "self-start bg-ink/5 text-ink"
                          }`}
                        >
                          <p>{message.contenu}</p>

                          <p
                            className={`mt-1 text-[10px] font-mono ${
                              estMoi
                                ? "text-paper-light/70"
                                : "text-ink-soft/60"
                            }`}
                          >
                            {formatDateCourte(
                              message.dateEnvoi,
                            )}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Formulaire d'envoi */}
                <form
                  onSubmit={envoyer}
                  className="mt-3 flex gap-2"
                >
                  <Textarea
                    rows={1}
                    value={nouveauMessage}
                    onChange={(e) =>
                      setNouveauMessage(
                        e.target.value,
                      )
                    }
                    placeholder="Écrire un message…"
                    className="flex-1"
                    disabled={envoi}
                  />

                  <Button
                    type="submit"
                    size="sm"
                    disabled={
                      envoi ||
                      !nouveauMessage.trim()
                    }
                  >
                    {envoi
                      ? "Envoi…"
                      : "Envoyer"}
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