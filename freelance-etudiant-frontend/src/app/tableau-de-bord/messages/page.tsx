"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useSearchParams } from "next/navigation";
import { MessageCircle } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { useSocket } from "@/lib/socket-context";
import { api, ApiError } from "@/lib/api";

import type { MessageAvecUtilisateurs } from "@/lib/message-types";

import { formatDateCourte } from "@/lib/format";

import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { NoticeCard } from "@/components/ui/Notice";
import {
  PieceJointeAffichage,
  SelecteurPieceJointe,
  type PieceJointeValeur,
} from "@/components/ui/PieceJointe";

/* =========================================================
   PAGE
   ========================================================= */

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div>
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

          <p className="text-sm text-ink-soft">
            Chargement…
          </p>
        </div>
      }
    >
      <MessagesContent />
    </Suspense>
  );
}

/* =========================================================
   CONTENU
   ========================================================= */

function MessagesContent() {
  const { utilisateur } = useAuth();
  const { socket } = useSocket();

  const searchParams =
    useSearchParams();

  /* =========================================================
     PARAMÈTRES URL
     ========================================================= */

  const contactIdParam =
    searchParams.get("contact");

  const nomParam =
    searchParams.get("nom");

  /*
   * Contact provenant de l'URL.
   *
   * Aucun setState ici.
   */
  const contactDepuisUrl =
    useMemo(() => {
      if (!contactIdParam) {
        return null;
      }

      return {
        id: contactIdParam,
        nom:
          nomParam?.trim() ||
          "Utilisateur",
      };
    }, [
      contactIdParam,
      nomParam,
    ]);

  /* =========================================================
     ÉTATS
     ========================================================= */

  const [
    conversations,
    setConversations,
  ] = useState<
    MessageAvecUtilisateurs[]
  >([]);

  const [
    contactSelectionne,
    setContactSelectionne,
  ] = useState<{
    id: string;
    nom: string;
  } | null>(null);

  const [
    fil,
    setFil,
  ] = useState<
    MessageAvecUtilisateurs[]
  >([]);

  const [
    nouveauMessage,
    setNouveauMessage,
  ] = useState("");

  const [
    pieceJointe,
    setPieceJointe,
  ] = useState<PieceJointeValeur | null>(null);

  const [
    chargement,
    setChargement,
  ] = useState(true);

  const [
    chargementFil,
    setChargementFil,
  ] = useState(false);

  const [
    erreur,
    setErreur,
  ] = useState<string | null>(null);

  const [
    envoi,
    setEnvoi,
  ] = useState(false);

  /* =========================================================
     CONTACT ACTIF
     ========================================================= */

  /*
   * Pas besoin de useEffect + setState.
   *
   * Le contact actif est simplement dérivé de l'état
   * et des paramètres URL.
   */
  const contactActif =
    contactSelectionne ??
    contactDepuisUrl;

  /* =========================================================
     CHARGER LES CONVERSATIONS
     ========================================================= */

  const chargerConversations = useCallback(async () => {
    try {
      const data =
        await api.get<
          MessageAvecUtilisateurs[]
        >("/messages");

      setConversations(data);

      setErreur(null);
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

  /* =========================================================
     CHARGEMENT INITIAL
     ========================================================= */

  useEffect(() => {
    let cancelled = false;

    async function chargerInitial() {
      try {
        const data =
          await api.get<
            MessageAvecUtilisateurs[]
          >("/messages");

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
    }

    chargerInitial();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =========================================================
     CONSTRUCTION DES CONTACTS
     ========================================================= */

  const contacts =
    useMemo(() => {
      if (!utilisateur) {
        return [];
      }

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
          message.expediteurId ===
          utilisateur.id
            ? message.destinataire
            : message.expediteur;

        if (!autre) {
          continue;
        }

        if (!map.has(autre.id)) {
          map.set(autre.id, {
            id: autre.id,
            nom: autre.nom,
            dernier:
              message.contenu?.trim() ||
              "Nouvelle conversation",
          });
        }
      }

      /*
       * Si l'URL contient un contact qui n'est
       * pas encore présent dans les conversations,
       * on l'ajoute également.
       */
      if (
        contactDepuisUrl &&
        !map.has(contactDepuisUrl.id)
      ) {
        map.set(
          contactDepuisUrl.id,
          {
            id: contactDepuisUrl.id,
            nom: contactDepuisUrl.nom,
            dernier:
              "Nouvelle conversation",
          },
        );
      }

      return Array.from(
        map.values(),
      );
    }, [
      conversations,
      utilisateur,
      contactDepuisUrl,
    ]);

  /* =========================================================
     MESSAGES NON LUS PAR CONTACT (source : table messages)
     ========================================================= */

  /*
   * Indicateur de messagerie : nombre de messages non lus
   * recus de chaque contact, deduit des conversations chargees
   * via GET /messages (champ estLu de l'entite Message).
   *
   * IMPORTANT : cet etat appartient au systeme MESSAGES et
   * reste totalement independant du compteur de notifications
   * 🔔 (table notifications). Lire un message ne change aucune
   * notification, et marquer une notification comme lue ne
   * change aucun message.
   */
  const nonLusParContact = useMemo(() => {
    const compteurs = new Map<string, number>();

    if (!utilisateur) {
      return compteurs;
    }

    for (const message of conversations) {
      if (
        message.destinataireId === utilisateur.id &&
        !message.estLu
      ) {
        const actuel =
          compteurs.get(message.expediteurId) ?? 0;

        compteurs.set(
          message.expediteurId,
          actuel + 1,
        );
      }
    }

    return compteurs;
  }, [conversations, utilisateur]);

  /* =========================================================
     CHARGER UNE CONVERSATION
     ========================================================= */

  async function chargerFil(
    contactId: string,
  ): Promise<MessageAvecUtilisateurs[]> {
    setChargementFil(true);
    setErreur(null);

    try {
      const data =
        await api.get<
          MessageAvecUtilisateurs[]
        >(
          `/messages/conversation/${contactId}`,
        );

      setFil(data);

      return data;
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

      return [];
    } finally {
      setChargementFil(false);
    }
  }

  /* =========================================================
     MARQUER LES MESSAGES RECUS COMME LUS (systeme MESSAGES)
     ========================================================= */

  /*
   * Marque comme lus les messages recus d'une conversation
   * ouverte, via l'endpoint existant PATCH /messages/:id/lu.
   *
   * Cette action appartient exclusivement a la MESSAGERIE :
   * elle ne modifie AUCUNE notification (les deux etats
   * "message lu" et "notification lue" restent independants).
   */
  const marquerFilCommeLu = useCallback(
    async (messages: MessageAvecUtilisateurs[]) => {
      if (!utilisateur) {
        return;
      }

      const nonLus = messages.filter(
        (message) =>
          message.destinataireId ===
            utilisateur.id && !message.estLu,
      );

      if (nonLus.length === 0) {
        return;
      }

      try {
        await Promise.all(
          nonLus.map((message) =>
            api.patch(`/messages/${message.id}/lu`),
          ),
        );

        /*
         * Mise a jour locale du fil (estLu -> true).
         */
        setFil((prev) =>
          prev.map((message) =>
            message.estLu
              ? message
              : { ...message, estLu: true },
          ),
        );

        /*
         * Rafraichit les indicateurs non-lus de la
         * liste de contacts (systeme messages uniquement).
         */
        await chargerConversations();
      } catch (error) {
        console.error(
          "Erreur lors du marquage des messages comme lus :",
          error,
        );
      }
    },
    [utilisateur, chargerConversations],
  );

  /*
   * Marque un seul message recu comme lu (utilise quand un
   * message arrive en temps reel dans la conversation deja
   * ouverte : l'utilisateur le voit, il est donc lu).
   */
  const marquerMessageRecuCommeLu = useCallback(
    async (message: MessageAvecUtilisateurs) => {
      if (
        !utilisateur ||
        message.destinataireId !== utilisateur.id ||
        message.estLu
      ) {
        return;
      }

      try {
        await api.patch(`/messages/${message.id}/lu`);

        setFil((prev) =>
          prev.map((item) =>
            item.id === message.id
              ? { ...item, estLu: true }
              : item,
          ),
        );

        void chargerConversations();
      } catch (error) {
        console.error(
          "Erreur lors du marquage du message comme lu :",
          error,
        );
      }
    },
    [utilisateur, chargerConversations],
  );

  /* =========================================================
     CHANGEMENT DE CONTACT
     ========================================================= */

  /*
   * Ici, le changement vient d'une interaction utilisateur.
   * Il est donc parfaitement approprié de mettre à jour
   * l'état dans le handler.
   */
  function selectionnerContact(
    contact: {
      id: string;
      nom: string;
    },
  ) {
    setContactSelectionne(contact);

    /*
     * Ouvrir la conversation = voir les messages recus :
     * on les marque donc comme lus via l'endpoint
     * PATCH /messages/:id/lu (responsabilite MESSAGERIE
     * uniquement -- aucune notification n'est modifiee ici,
     * le compteur 🔔 reste independant).
     */
    void chargerFil(contact.id).then((filCharge) =>
      marquerFilCommeLu(filCharge),
    );
  }

  /* =========================================================
     CONTACT DEPUIS URL
     ========================================================= */

  /*
   * Si ?contact=... est présent et qu'aucun contact
   * n'a été sélectionné manuellement, on charge sa
   * conversation directement.
   *
   * IMPORTANT :
   * ce useEffect ne fait PAS setContactActif().
   *
   * Il ne fait que déclencher une requête réseau.
   */
  useEffect(() => {
    if (
      !contactDepuisUrl ||
      contactSelectionne
    ) {
      return;
    }

    let cancelled = false;

    async function chargerContactUrl() {
      setChargementFil(true);
      setErreur(null);

      try {
        const data =
          await api.get<
            MessageAvecUtilisateurs[]
          >(
            `/messages/conversation/${contactDepuisUrl?.id}`,
          );

        if (!cancelled) {
          setFil(data);

          /*
           * Conversation ouverte via l'URL (?contact=...) :
           * les messages recus affiches sont marques comme
           * lus (systeme messages, independant des
           * notifications).
           */
          void marquerFilCommeLu(data);
        }
      } catch (error) {
        console.error(
          "Erreur lors du chargement du contact depuis l'URL :",
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
    }

    void chargerContactUrl();

    return () => {
      cancelled = true;
    };
  }, [
    contactDepuisUrl,
    contactSelectionne,
    marquerFilCommeLu,
  ]);

  /* =========================================================
     TEMPS RÉEL — NOUVEAUX MESSAGES (Socket.IO)
     ========================================================= */

  /*
   * Ecoute les messages poussés par le serveur (destinataire OU
   * expéditeur, pour la synchronisation multi-onglets).
   *
   * Dédoublonnage par id : l'expéditeur reçoit son propre message en
   * écho via Socket.IO alors qu'il l'a déjà ajouté localement via le
   * rechargement REST qui suit l'envoi (voir `envoyer()` ci-dessous).
   */
  useEffect(() => {
    if (!socket || !utilisateur) return;

    function onNouveauMessage(
      message: MessageAvecUtilisateurs,
    ) {
      const autreId =
        message.expediteurId === utilisateur?.id
          ? message.destinataireId
          : message.expediteurId;

      if (contactActif?.id === autreId) {
        setFil((prev) =>
          prev.some((m) => m.id === message.id)
            ? prev
            : [...prev, message],
        );

        /*
         * Message recu dans la conversation deja ouverte :
         * l'utilisateur le voit immediatement, il est donc
         * lu. Marquage cote MESSAGERIE uniquement (PATCH
         * /messages/:id/lu) -- aucune notification n'est
         * creée ni modifiee ici, et le badge 🔔 n'est PAS
         * decremente : il ne s'effacera que lorsque la
         * notification correspondante sera lue.
         */
        void marquerMessageRecuCommeLu(message);
      }

      // Rafraîchit la liste des contacts (aperçu du dernier message,
      // ordre) sans bloquer l'affichage du fil ci-dessus.
      void chargerConversations();
    }

    socket.on("message:nouveau", onNouveauMessage);

    return () => {
      socket.off("message:nouveau", onNouveauMessage);
    };
  }, [
    socket,
    utilisateur,
    contactActif,
    marquerMessageRecuCommeLu,
    chargerConversations,
  ]);

  /* =========================================================
     ENVOYER UN MESSAGE
     ========================================================= */

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
      await api.post(
        "/messages",
        {
          destinataireId:
            contactActif.id,

          contenu:
            nouveauMessage.trim(),

          pieceJointeUrl:
            pieceJointe?.url,

          pieceJointeNom:
            pieceJointe?.nom,
        },
      );

      setNouveauMessage("");
      setPieceJointe(null);

      /*
       * Recharge la conversation après envoi.
       */
      const data =
        await api.get<
          MessageAvecUtilisateurs[]
        >(
          `/messages/conversation/${contactActif.id}`,
        );

      setFil(data);

      /*
       * Recharge également la liste des contacts.
       */
      await chargerConversations();
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

  /* =========================================================
     AFFICHAGE
     ========================================================= */

  return (
    <div>
      {/* =====================================================
          TITRE
          ===================================================== */}

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

      {/* =====================================================
          ERREUR
          ===================================================== */}

      {erreur && (
        <NoticeCard className="mb-5">
          <p className="text-sm text-brique">
            {erreur}
          </p>
        </NoticeCard>
      )}

      {/* =====================================================
          CHARGEMENT
          ===================================================== */}

      {chargement ? (
        <p className="text-sm text-ink-soft">
          Chargement…
        </p>
      ) : contacts.length === 0 ? (
        <NoticeCard>
          <p className="text-sm text-ink-soft">
            Aucune conversation pour
            l&apos;instant.
          </p>

          <p className="mt-2 text-sm text-ink-soft">
            La messagerie est disponible
            après l&apos;acceptation d&apos;une
            candidature entre un client et un
            étudiant.
          </p>

          <p className="mt-2 text-sm text-ink-soft">
            Après acceptation, le contact
            apparaît automatiquement ici,
            même si aucun message n&apos;a
            encore été envoyé.
          </p>
        </NoticeCard>
      ) : (
        <div className="grid gap-5 sm:grid-cols-[220px_1fr]">
          {/* =================================================
              CONTACTS
              ================================================= */}

          <div className="flex flex-row gap-2 overflow-x-auto sm:flex-col sm:overflow-visible">
            {contacts.map(
              (contact) => (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() =>
                    selectionnerContact(
                      contact,
                    )
                  }
                  className={`border px-3 py-2.5 text-left text-sm whitespace-nowrap transition-colors sm:whitespace-normal ${
                    contactActif?.id ===
                    contact.id
                      ? "border-ocre-dark bg-ocre/10 text-ocre-dark"
                      : "border-ink/15 hover:border-ink/40"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <p className="font-medium">
                      {contact.nom}
                    </p>

                    {/*
                      Indicateur de MESSAGES non lus (●),
                      deduit du champ estLu de la table
                      messages. Totalement independant du
                      compteur de notifications 🔔.
                    */}
                    {(nonLusParContact.get(
                      contact.id,
                    ) ?? 0) > 0 && (
                      <span
                        className="h-2 w-2 shrink-0 rounded-full bg-ocre-dark"
                        title={`${nonLusParContact.get(contact.id)} message(s) non lu(s)`}
                        aria-label={`${nonLusParContact.get(contact.id)} message(s) non lu(s)`}
                      />
                    )}
                  </div>

                  <p className="hidden truncate text-xs text-ink-soft/70 sm:block">
                    {contact.dernier ||
                      "Nouvelle conversation"}
                  </p>
                </button>
              ),
            )}
          </div>

          {/* =================================================
              CONVERSATION
              ================================================= */}

          <div>
            {!contactActif ? (
              <p className="text-sm text-ink-soft">
                Sélectionnez une conversation.
              </p>
            ) : (
              <NoticeCard className="flex h-[480px] flex-col">
                {/* -------------------------------------------
                    NOM
                    ------------------------------------------- */}

                <div className="mb-3 border-b border-ink/10 pb-3">
                  <p className="font-display font-medium">
                    {contactActif.nom}
                  </p>
                </div>

                {/* -------------------------------------------
                    MESSAGES
                    ------------------------------------------- */}

                <div className="flex flex-1 flex-col gap-3 overflow-y-auto pr-1">
                  {chargementFil ? (
                    <p className="text-sm text-ink-soft">
                      Chargement de la
                      conversation…
                    </p>
                  ) : fil.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center">
                      <p className="max-w-sm text-center text-sm text-ink-soft">
                        Aucun message
                        dans cette
                        conversation.
                        <br />
                        <span className="mt-1 inline-block">
                          Vous pouvez
                          commencer la
                          conversation.
                        </span>
                      </p>
                    </div>
                  ) : (
                    fil.map(
                      (message) => {
                        const estMoi =
                          message.expediteurId ===
                          utilisateur?.id;

                        return (
                          <div
                            key={
                              message.id
                            }
                            className={`max-w-[75%] px-3 py-2 text-sm ${
                              estMoi
                                ? "self-end bg-rice text-paper-light"
                                : "self-start bg-ink/5 text-ink"
                            }`}
                          >
                            <p>
                              {
                                message.contenu
                              }
                            </p>

                            {message.pieceJointeUrl && (
                              <div className="mt-2">
                                <PieceJointeAffichage
                                  url={message.pieceJointeUrl}
                                  nom={message.pieceJointeNom}
                                />
                              </div>
                            )}

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
                      },
                    )
                  )}
                </div>

                {/* -------------------------------------------
                    ENVOI
                    ------------------------------------------- */}

                <form
                  onSubmit={envoyer}
                  className="mt-3 flex flex-col gap-2"
                >
                  <div className="flex gap-2">
                    <Textarea
                      rows={1}
                      value={
                        nouveauMessage
                      }
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
                  </div>

                  <SelecteurPieceJointe
                    valeur={pieceJointe}
                    onChange={setPieceJointe}
                    disabled={envoi}
                  />
                </form>
              </NoticeCard>
            )}
          </div>
        </div>
      )}
    </div>
  );
}