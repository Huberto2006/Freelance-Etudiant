"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  Check,
  CheckCheck,
  ExternalLink,
  FileText,
  Loader2,
  MessageCircle,
  MoreVertical,
  Search,
  Send,
  Star,
  User,
  Users,
  X,
} from "lucide-react";
import { clsx } from "clsx";

import { roleLabel, useAuth } from "@/lib/auth-context";
import { api, ApiError, getFileUrl } from "@/lib/api";
import { useSocket } from "@/lib/socket-context";
import {
  formatArgent,
  formatDate,
  statutMissionLabel,
} from "@/lib/format";

import type {
  CompteurNonLus,
  ConversationGroupeResume,
  ConversationIndividuelle,
  ConversationResume,
  MessageAvecUtilisateurs,
} from "@/lib/message-types";

import type {
  ClientProfile,
  EtudiantProfile,
  Mission,
  Role,
} from "@/lib/types";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Field";

import {
  PieceJointeAffichage,
  SelecteurPieceJointe,
  type PieceJointeValeur,
} from "@/components/ui/PieceJointe";

import { Skeleton } from "@/components/ui/Skeleton";

/* =========================================================
   TYPES LOCAUX
   ========================================================= */

interface LigneConversation {
  cle: string;
  type: "INDIVIDUEL" | "GROUPE";
  id: string;
  nom: string;
  photoUrl?: string | null;
  role?: Role | null;
  nombreMembres?: number;
  dernierContenu: string;
  dernierDate: string | null;
  dernierEstMoi: boolean;
  conversationVide: boolean;
  nonLus: number;
}

type SelectionConversation =
  | {
      type: "INDIVIDUEL";
      id: string;
      nom: string;
    }
  | {
      type: "GROUPE";
      id: string;
      nom: string;
      nombreMembres?: number;
    };

interface PieceJointeConversation {
  url: string;
  nom: string | null;
  auteur: string;
  dateEnvoi: string;
}

type MessageSocket = MessageAvecUtilisateurs & {
  groupeId?: string | null;
};

/* =========================================================
   HELPERS
   ========================================================= */

function formaterHeure(date: string): string {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  } catch {
    return "";
  }
}

function formaterDateListe(date: string): string {
  const jour = new Date(date);

  if (Number.isNaN(jour.getTime())) {
    return "";
  }

  const aujourdhui = new Date();

  if (jour.toDateString() === aujourdhui.toDateString()) {
    return formaterHeure(date);
  }

  const hier = new Date(aujourdhui);

  hier.setDate(aujourdhui.getDate() - 1);

  if (jour.toDateString() === hier.toDateString()) {
    return "Hier";
  }

  const memeAnnee =
    jour.getFullYear() === aujourdhui.getFullYear();

  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
      ...(memeAnnee
        ? {}
        : {
            year: "numeric",
          }),
    }).format(jour);
  } catch {
    return "";
  }
}

function formaterJourSeparateur(date: string): string {
  const jour = new Date(date);

  if (Number.isNaN(jour.getTime())) {
    return "";
  }

  const memeAnnee =
    jour.getFullYear() === new Date().getFullYear();

  try {
    return new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      ...(memeAnnee
        ? {}
        : {
            year: "numeric",
          }),
    }).format(jour);
  } catch {
    return "";
  }
}

function estMemeJournee(
  a: string,
  b: string,
): boolean {
  return (
    new Date(a).toDateString() ===
    new Date(b).toDateString()
  );
}

function apercuMessage(
  message: MessageAvecUtilisateurs,
): string {
  if (message.estSupprime) {
    return "Message supprimé";
  }

  if (message.contenu?.trim()) {
    return message.contenu.trim();
  }

  if (message.pieceJointeUrl) {
    return "Pièce jointe";
  }

  return "Nouvelle conversation";
}

function apercuMessageGroupe(
  message: MessageAvecUtilisateurs,
  utilisateurId: string,
): string {
  const apercu = apercuMessage(message);

  if (message.expediteurId === utilisateurId) {
    return apercu;
  }

  const auteur =
    message.expediteur?.nom ?? "Membre";

  return `${auteur} : ${apercu}`;
}

/*
 * roleLabel est une fonction :
 * roleLabel(role)
 */
function afficherRole(
  role?: Role | null,
): string {
  if (!role) {
    return "Utilisateur Kianja";
  }

  return roleLabel(role);
}

/* =========================================================
   PAGE
   ========================================================= */

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100dvh-8rem)] min-h-[560px] items-center justify-center md:h-[calc(100dvh-9rem)]">
          <div className="flex items-center gap-2 text-sm text-ink-soft">
            <Loader2
              size={16}
              className="animate-spin"
              aria-hidden="true"
            />
            Chargement des conversations…
          </div>
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
  const searchParams = useSearchParams();

  /* =========================================================
     URL
     ========================================================= */

  const contactIdParam =
    searchParams.get("contact");

  const groupeIdParam =
    searchParams.get("groupe");

  const nomParam =
    searchParams.get("nom");

  const contactDepuisUrl = useMemo(() => {
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

  /*
   * IMPORTANT :
   * On déclare explicitement nombreMembres comme propriété
   * optionnelle pour éviter l'erreur TypeScript.
   */
  const groupeDepuisUrl = useMemo<{
    id: string;
    nom: string;
    nombreMembres?: number;
  } | null>(() => {
    if (!groupeIdParam) {
      return null;
    }

    return {
      id: groupeIdParam,
      nom:
        nomParam?.trim() ||
        "Groupe",
    };
  }, [
    groupeIdParam,
    nomParam,
  ]);

  /* =========================================================
     ETATS
     ========================================================= */

  const [
    conversations,
    setConversations,
  ] = useState<ConversationResume[]>([]);

  const [
    compteurDetail,
    setCompteurDetail,
  ] = useState<CompteurNonLus | null>(null);

  const [
    contactSelectionne,
    setContactSelectionne,
  ] = useState<{
    id: string;
    nom: string;
  } | null>(null);

  const [
    groupeSelectionne,
    setGroupeSelectionne,
  ] = useState<SelectionConversation | null>(
    null,
  );

  const [
    fil,
    setFil,
  ] = useState<MessageAvecUtilisateurs[]>([]);

  const [
    nouveauMessage,
    setNouveauMessage,
  ] = useState("");

  const [
    pieceJointe,
    setPieceJointe,
  ] = useState<PieceJointeValeur | null>(
    null,
  );

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

  const [
    erreurEnvoi,
    setErreurEnvoi,
  ] = useState<string | null>(null);

  const formEnvoiRef =
    useRef<HTMLFormElement>(null);

  const envoiEnCoursRef =
    useRef(false);

  const zoneMessagesRef =
    useRef<HTMLDivElement>(null);

  const textareaRef =
    useRef<HTMLTextAreaElement>(null);

  const [
    ongletMessages,
    setOngletMessages,
  ] = useState<
    "toutes" | "non_lus"
  >("toutes");

  const [
    recherche,
    setRecherche,
  ] = useState("");

  const [
    conversationOuverteMobile,
    setConversationOuverteMobile,
  ] = useState(
    Boolean(
      contactIdParam ||
        groupeIdParam,
    ),
  );

  const [
    panneauVisible,
    setPanneauVisible,
  ] = useState(true);

  const [
    detailsOuverts,
    setDetailsOuverts,
  ] = useState(false);

  const [
    mission,
    setMission,
  ] = useState<Mission | null>(null);

  const [
    profilEtudiant,
    setProfilEtudiant,
  ] = useState<EtudiantProfile | null>(
    null,
  );

  const [
    profilClient,
    setProfilClient,
  ] = useState<ClientProfile | null>(
    null,
  );

  const [
    messageEnSuppression,
    setMessageEnSuppression,
  ] = useState<string | null>(
    null,
  );

  /* =========================================================
     CONVERSATION ACTIVE
     ========================================================= */

  const cleUrlConversation =
    contactIdParam ??
    groupeIdParam ??
    null;

  const [
    derniereCleUrl,
    setDerniereCleUrl,
  ] = useState(
    cleUrlConversation,
  );

  if (
    cleUrlConversation !==
    derniereCleUrl
  ) {
    setDerniereCleUrl(
      cleUrlConversation,
    );

    setConversationOuverteMobile(
      Boolean(cleUrlConversation),
    );
  }

  /*
   * Si un groupe est sélectionné, on ne conserve pas
   * un ancien contact provenant de l'URL.
   */
  const contactActif =
    contactSelectionne ??
    (!groupeSelectionne
      ? contactDepuisUrl
      : null);

  /*
   * On ne récupère depuis la sélection que les groupes.
   * Cela permet à TypeScript de connaître nombreMembres.
   */
  const groupeActif =
    groupeSelectionne?.type ===
    "GROUPE"
      ? groupeSelectionne
      : !contactSelectionne
        ? groupeDepuisUrl
        : null;

  /*
   * Conversation active = INDIVIDUEL ou GROUPE.
   */
  const conversationActive =
    contactActif
      ? {
          type: "INDIVIDUEL" as const,
          id: contactActif.id,
          nom: contactActif.nom,
        }
      : groupeActif
        ? {
            type: "GROUPE" as const,
            id: groupeActif.id,
            nom: groupeActif.nom,
            nombreMembres:
              groupeActif.nombreMembres,
          }
        : null;

  /* =========================================================
     CHARGEMENT DES CONVERSATIONS
     ========================================================= */

  const chargerConversations =
    useCallback(async () => {
      try {
        const data =
          await api.get<ConversationResume[]>(
            "/messages",
          );

        setConversations(data);
        setErreur(null);
      } catch (error) {
        console.error(
          "Erreur chargement conversations :",
          error,
        );

        setErreur(
          error instanceof ApiError
            ? error.message
            : "Impossible de charger les conversations.",
        );
      }
    }, []);

  const chargerCompteur =
    useCallback(async () => {
      try {
        const data =
          await api.get<CompteurNonLus>(
            "/messages/non-lus/compteur",
          );

        setCompteurDetail(data);
      } catch (error) {
        console.error(
          "Erreur compteur messages :",
          error,
        );
      }
    }, []);

  const rafraichirDonnees =
    useCallback(async () => {
      await Promise.all([
        chargerConversations(),
        chargerCompteur(),
      ]);
    }, [
      chargerConversations,
      chargerCompteur,
    ]);

  useEffect(() => {
    let cancelled = false;

    async function chargerInitial() {
      try {
        const [
          conversationsData,
          compteurData,
        ] = await Promise.all([
          api.get<ConversationResume[]>(
            "/messages",
          ),
          api.get<CompteurNonLus>(
            "/messages/non-lus/compteur",
          ),
        ]);

        if (cancelled) {
          return;
        }

        setConversations(
          conversationsData,
        );

        setCompteurDetail(
          compteurData,
        );

        setErreur(null);
      } catch (error) {
        console.error(
          "Erreur chargement initial :",
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

    void chargerInitial();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =========================================================
     TYPES DE CONVERSATIONS
     ========================================================= */

  const conversationsIndividuelles =
    useMemo(
      () =>
        conversations.filter(
          (
            conversation,
          ): conversation is ConversationIndividuelle =>
            conversation.type ===
            "INDIVIDUEL",
        ),
      [conversations],
    );

  const conversationsGroupes =
    useMemo(
      () =>
        conversations.filter(
          (
            conversation,
          ): conversation is ConversationGroupeResume =>
            conversation.type ===
            "GROUPE",
        ),
      [conversations],
    );

  /* =========================================================
     CONSTRUCTION DES LIGNES
     ========================================================= */

  const lignesConversations =
    useMemo<LigneConversation[]>(
      () => {
        if (!utilisateur) {
          return [];
        }

        const lignes: LigneConversation[] =
          [];

        /*
         * INDIVIDUELS
         */

        const contactsMap =
          new Map<
            string,
            LigneConversation
          >();

        for (
          const message of conversationsIndividuelles
        ) {
          const autre =
            message.expediteurId ===
            utilisateur.id
              ? message.destinataire
              : message.expediteur;

          if (!autre) {
            continue;
          }

          if (
            contactsMap.has(
              autre.id,
            )
          ) {
            continue;
          }

          contactsMap.set(
            autre.id,
            {
              cle: autre.id,
              type: "INDIVIDUEL",
              id: autre.id,
              nom:
                autre.nom?.trim() ||
                "Utilisateur",
              photoUrl:
                autre.photoUrl ??
                null,
              role:
                autre.role ??
                null,
              dernierContenu:
                apercuMessage(
                  message,
                ),
              dernierDate:
                message.dateEnvoi,
              dernierEstMoi:
                message.expediteurId ===
                utilisateur.id,
              conversationVide:
                !message.contenu?.trim() &&
                !message.estSupprime &&
                !message.pieceJointeUrl,
              nonLus: 0,
            },
          );
        }

        /*
         * Contact demandé via URL
         */

        if (
          contactDepuisUrl &&
          !contactsMap.has(
            contactDepuisUrl.id,
          )
        ) {
          contactsMap.set(
            contactDepuisUrl.id,
            {
              cle: contactDepuisUrl.id,
              type: "INDIVIDUEL",
              id: contactDepuisUrl.id,
              nom:
                contactDepuisUrl.nom,
              photoUrl: null,
              role: null,
              dernierContenu:
                "Nouvelle conversation",
              dernierDate: null,
              dernierEstMoi: false,
              conversationVide: true,
              nonLus: 0,
            },
          );
        }

        /*
         * Messages individuels non lus
         */

        for (
          const message of conversationsIndividuelles
        ) {
          if (
            message.destinataireId ===
              utilisateur.id &&
            !message.estLu
          ) {
            const ligne =
              contactsMap.get(
                message.expediteurId,
              );

            if (ligne) {
              ligne.nonLus += 1;
            }
          }
        }

        lignes.push(
          ...contactsMap.values(),
        );

        /*
         * GROUPES
         */

        for (
          const groupe of conversationsGroupes
        ) {
          const dernier =
            groupe.dernierMessage;

          lignes.push({
            cle: `groupe-${groupe.groupeId}`,
            type: "GROUPE",
            id: groupe.groupeId,
            nom: groupe.nom,
            photoUrl: null,
            role: null,
            nombreMembres:
              typeof groupe.nombreMembres ===
              "number"
                ? groupe.nombreMembres
                : undefined,
            dernierContenu: dernier
              ? apercuMessageGroupe(
                  dernier,
                  utilisateur.id,
                )
              : "Aucun message",
            dernierDate:
              dernier?.dateEnvoi ??
              null,
            dernierEstMoi:
              dernier?.expediteurId ===
              utilisateur.id,
            conversationVide:
              !dernier,
            nonLus:
              typeof groupe.nonLus ===
              "number"
                ? groupe.nonLus
                : 0,
          });
        }

        /*
         * Groupe demandé directement par URL
         */

        if (
          groupeDepuisUrl &&
          !lignes.some(
            (ligne) =>
              ligne.type ===
                "GROUPE" &&
              ligne.id ===
                groupeDepuisUrl.id,
          )
        ) {
          lignes.push({
            cle: `groupe-${groupeDepuisUrl.id}`,
            type: "GROUPE",
            id: groupeDepuisUrl.id,
            nom:
              groupeDepuisUrl.nom,
            photoUrl: null,
            role: null,
            nombreMembres:
              groupeDepuisUrl.nombreMembres,
            dernierContenu:
              "Aucun message",
            dernierDate: null,
            dernierEstMoi: false,
            conversationVide: true,
            nonLus: 0,
          });
        }

        /*
         * Tri par dernier message
         */

        lignes.sort((a, b) => {
          if (
            !a.dernierDate &&
            !b.dernierDate
          ) {
            return 0;
          }

          if (!a.dernierDate) {
            return 1;
          }

          if (!b.dernierDate) {
            return -1;
          }

          return (
            new Date(
              b.dernierDate,
            ).getTime() -
            new Date(
              a.dernierDate,
            ).getTime()
          );
        });

        return lignes;
      },
      [
        conversationsIndividuelles,
        conversationsGroupes,
        utilisateur,
        contactDepuisUrl,
        groupeDepuisUrl,
      ],
    );

  /* =========================================================
     RECHERCHE + ONGLET
     ========================================================= */

  const rechercheNormalisee =
    recherche
      .trim()
      .toLowerCase();

  const lignesFiltrees =
    useMemo(() => {
      let resultat =
        lignesConversations;

      if (rechercheNormalisee) {
        resultat =
          resultat.filter(
            (ligne) =>
              ligne.nom
                .toLowerCase()
                .includes(
                  rechercheNormalisee,
                ) ||
              ligne.dernierContenu
                .toLowerCase()
                .includes(
                  rechercheNormalisee,
                ),
          );
      }

      if (
        ongletMessages ===
        "non_lus"
      ) {
        resultat =
          resultat.filter(
            (ligne) =>
              ligne.nonLus > 0,
          );
      }

      return resultat;
    }, [
      lignesConversations,
      rechercheNormalisee,
      ongletMessages,
    ]);

  const compteToutes =
    lignesConversations.length;

  const compteNonLus =
    compteurDetail?.total ??
    lignesConversations.reduce(
      (total, ligne) =>
        total + ligne.nonLus,
      0,
    );

  /* =========================================================
     CHARGEMENT FIL INDIVIDUEL
     ========================================================= */

  const chargerFil =
    useCallback(
      async (
        contactId: string,
      ): Promise<
        MessageAvecUtilisateurs[]
      > => {
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
            "Erreur conversation individuelle :",
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
      },
      [],
    );

  /* =========================================================
     CHARGEMENT FIL GROUPE
     ========================================================= */

  const chargerFilGroupe =
    useCallback(
      async (
        groupeId: string,
      ): Promise<
        MessageAvecUtilisateurs[]
      > => {
        setChargementFil(true);
        setErreur(null);

        try {
          const data =
            await api.get<
              MessageAvecUtilisateurs[]
            >(
              `/messages/groupes/${groupeId}`,
            );

          setFil(data);

          return data;
        } catch (error) {
          console.error(
            "Erreur conversation groupe :",
            error,
          );

          setErreur(
            error instanceof ApiError
              ? error.message
              : "Impossible de charger la discussion du groupe.",
          );

          return [];
        } finally {
          setChargementFil(false);
        }
      },
      [],
    );

  /* =========================================================
     MARQUER INDIVIDUEL COMME LU
     ========================================================= */

  const marquerFilCommeLu =
    useCallback(
      async (
        messages: MessageAvecUtilisateurs[],
      ) => {
        if (!utilisateur) {
          return;
        }

        const nonLus =
          messages.filter(
            (message) =>
              message.destinataireId ===
                utilisateur.id &&
              !message.estLu,
          );

        if (
          nonLus.length === 0
        ) {
          return;
        }

        try {
          await Promise.all(
            nonLus.map(
              (message) =>
                api.patch(
                  `/messages/${message.id}/lu`,
                ),
            ),
          );

          setFil((precedent) =>
            precedent.map(
              (message) =>
                message.estLu
                  ? message
                  : {
                      ...message,
                      estLu: true,
                    },
            ),
          );

          await rafraichirDonnees();
        } catch (error) {
          console.error(
            "Erreur marquage individuel lu :",
            error,
          );
        }
      },
      [
        utilisateur,
        rafraichirDonnees,
      ],
    );

  /* =========================================================
     MARQUER GROUPE COMME LU
     ========================================================= */

  const marquerGroupeCommeLu =
    useCallback(
      async (
        groupeId: string,
      ) => {
        try {
          await api.patch(
            `/messages/groupes/${groupeId}/lu`,
          );

          setFil((precedent) =>
            precedent.map(
              (message) => ({
                ...message,
                estLu: true,
              }),
            ),
          );

          await rafraichirDonnees();
        } catch (error) {
          console.error(
            "Erreur marquage groupe lu :",
            error,
          );
        }
      },
      [rafraichirDonnees],
    );

  /* =========================================================
     MARQUER UN MESSAGE RECU
     ========================================================= */

  const marquerMessageRecuCommeLu =
    useCallback(
      async (
        message: MessageAvecUtilisateurs,
      ) => {
        if (
          !utilisateur ||
          message.destinataireId !==
            utilisateur.id ||
          message.estLu
        ) {
          return;
        }

        try {
          await api.patch(
            `/messages/${message.id}/lu`,
          );

          setFil((precedent) =>
            precedent.map(
              (item) =>
                item.id ===
                message.id
                  ? {
                      ...item,
                      estLu: true,
                    }
                  : item,
            ),
          );

          void rafraichirDonnees();
        } catch (error) {
          console.error(
            "Erreur marquage message lu :",
            error,
          );
        }
      },
      [
        utilisateur,
        rafraichirDonnees,
      ],
    );

  /* =========================================================
     SELECTION INDIVIDUELLE
     ========================================================= */

  function selectionnerContact(
    contact: {
      id: string;
      nom: string;
    },
  ) {
    setContactSelectionne(
      contact,
    );

    setGroupeSelectionne(
      null,
    );

    setErreurEnvoi(null);

    setConversationOuverteMobile(
      true,
    );

    void chargerFil(
      contact.id,
    ).then(
      marquerFilCommeLu,
    );
  }

  /* =========================================================
     SELECTION GROUPE
     ========================================================= */

  function selectionnerGroupe(
    groupe: LigneConversation,
  ) {
    if (
      groupe.type !==
      "GROUPE"
    ) {
      return;
    }

    const selection: SelectionConversation =
      {
        type: "GROUPE",
        id: groupe.id,
        nom: groupe.nom,
        nombreMembres:
          typeof groupe.nombreMembres ===
          "number"
            ? groupe.nombreMembres
            : undefined,
      };

    setGroupeSelectionne(
      selection,
    );

    setContactSelectionne(
      null,
    );

    setErreurEnvoi(null);

    setConversationOuverteMobile(
      true,
    );

    void chargerFilGroupe(
      groupe.id,
    ).then(() =>
      marquerGroupeCommeLu(
        groupe.id,
      ),
    );
  }

  /* =========================================================
     OUVERTURE DEPUIS URL — INDIVIDUEL
     ========================================================= */

  useEffect(() => {
    if (
      !contactDepuisUrl ||
      contactSelectionne ||
      groupeSelectionne
    ) {
      return;
    }

    let cancelled = false;

    async function chargerDepuisUrl() {
      setChargementFil(true);
      setErreur(null);

      try {
        const data =
          await api.get<
            MessageAvecUtilisateurs[]
          >(
            `/messages/conversation/${contactDepuisUrl?.id}`,
          );

        if (cancelled) {
          return;
        }

        setFil(data);

        void marquerFilCommeLu(
          data,
        );
      } catch (error) {
        console.error(
          "Erreur contact URL :",
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

    void chargerDepuisUrl();

    return () => {
      cancelled = true;
    };
  }, [
    contactDepuisUrl,
    contactSelectionne,
    groupeSelectionne,
    marquerFilCommeLu,
  ]);

  /* =========================================================
     OUVERTURE DEPUIS URL — GROUPE
     ========================================================= */

  useEffect(() => {
    if (
      !groupeDepuisUrl ||
      groupeSelectionne ||
      contactSelectionne
    ) {
      return;
    }

    let cancelled = false;

    async function chargerGroupeDepuisUrl() {
      setChargementFil(true);
      setErreur(null);

      try {
        const data =
          await api.get<
            MessageAvecUtilisateurs[]
          >(
            `/messages/groupes/${groupeDepuisUrl?.id}`,
          );

        if (cancelled) {
          return;
        }

        setFil(data);

        try {
          await api.patch(
            `/messages/groupes/${groupeDepuisUrl?.id}/lu`,
          );

          if (!cancelled) {
            setFil((precedent) =>
              precedent.map(
                (message) => ({
                  ...message,
                  estLu: true,
                }),
              ),
            );
          }

          void rafraichirDonnees();
        } catch (error) {
          console.error(
            "Erreur marquage groupe URL :",
            error,
          );
        }
      } catch (error) {
        console.error(
          "Erreur groupe URL :",
          error,
        );

        if (!cancelled) {
          setErreur(
            error instanceof ApiError
              ? error.message
              : "Impossible de charger cette discussion de groupe.",
          );
        }
      } finally {
        if (!cancelled) {
          setChargementFil(false);
        }
      }
    }

    void chargerGroupeDepuisUrl();

    return () => {
      cancelled = true;
    };
  }, [
    groupeDepuisUrl,
    groupeSelectionne,
    contactSelectionne,
    rafraichirDonnees,
  ]);

  /* =========================================================
     SOCKET.IO
     ========================================================= */

  useEffect(() => {
    if (
      !socket ||
      !utilisateur
    ) {
      return;
    }

    function onNouveauMessage(
      message: MessageSocket,
    ) {
      /*
       * GROUPE
       */

      if (
        message.groupeId
      ) {
        if (
          conversationActive?.type ===
            "GROUPE" &&
          conversationActive.id ===
            message.groupeId
        ) {
          setFil(
            (precedent) =>
              precedent.some(
                (item) =>
                  item.id ===
                  message.id,
              )
                ? precedent
                : [
                    ...precedent,
                    message,
                  ],
          );

          void api
            .patch(
              `/messages/groupes/${message.groupeId}/lu`,
            )
            .then(() =>
              rafraichirDonnees(),
            )
            .catch((error) =>
              console.error(
                "Erreur marquage groupe socket :",
                error,
              ),
            );
        }

        void rafraichirDonnees();

        return;
      }

      /*
       * INDIVIDUEL
       */

      const autreId =
        message.expediteurId ===
        utilisateur?.id
          ? message.destinataireId
          : message.expediteurId;

      if (
        conversationActive?.type ===
          "INDIVIDUEL" &&
        conversationActive.id ===
          autreId
      ) {
        setFil(
          (precedent) =>
            precedent.some(
              (item) =>
                item.id ===
                message.id,
            )
              ? precedent
              : [
                  ...precedent,
                  message,
                ],
        );

        void marquerMessageRecuCommeLu(
          message,
        );
      }

      void rafraichirDonnees();
    }

    socket.on(
      "message:nouveau",
      onNouveauMessage,
    );

    return () => {
      socket.off(
        "message:nouveau",
        onNouveauMessage,
      );
    };
  }, [
    socket,
    utilisateur,
    conversationActive,
    marquerMessageRecuCommeLu,
    rafraichirDonnees,
  ]);

  /* =========================================================
     SOCKET — SUPPRESSION
     ========================================================= */

  useEffect(() => {
    if (!socket) {
      return;
    }

    function onMessageSupprime(
      payload: {
        id: string;
      },
    ) {
      setFil((precedent) =>
        precedent.map(
          (message) =>
            message.id ===
            payload.id
              ? {
                  ...message,
                  estSupprime: true,
                  contenu: "",
                  pieceJointeUrl:
                    null,
                  pieceJointeNom:
                    null,
                }
              : message,
        ),
      );
    }

    socket.on(
      "message:supprime",
      onMessageSupprime,
    );

    return () => {
      socket.off(
        "message:supprime",
        onMessageSupprime,
      );
    };
  }, [socket]);

  /* =========================================================
     CORRESPONDANT INDIVIDUEL
     ========================================================= */

  const autreUtilisateur =
    useMemo(() => {
      if (
        !utilisateur ||
        !contactActif
      ) {
        return null;
      }

      for (
        const message of fil
      ) {
        if (
          message.expediteurId ===
            contactActif.id &&
          message.expediteur
        ) {
          return message.expediteur;
        }

        if (
          message.destinataireId ===
            contactActif.id &&
          message.destinataire
        ) {
          return message.destinataire;
        }
      }

      for (
        const message of conversationsIndividuelles
      ) {
        if (
          message.expediteurId ===
            contactActif.id &&
          message.expediteur
        ) {
          return message.expediteur;
        }

        if (
          message.destinataireId ===
            contactActif.id &&
          message.destinataire
        ) {
          return message.destinataire;
        }
      }

      return null;
    }, [
      utilisateur,
      contactActif,
      fil,
      conversationsIndividuelles,
    ]);

  const autreUtilisateurId =
    autreUtilisateur?.id ??
    null;

  const autreUtilisateurRole =
    autreUtilisateur?.role ??
    null;

  /* =========================================================
     MISSION
     ========================================================= */

  const missionIdActif =
    useMemo(() => {
      if (
        conversationActive?.type !==
        "INDIVIDUEL"
      ) {
        return null;
      }

      for (
        let i =
          fil.length - 1;
        i >= 0;
        i--
      ) {
        const id =
          fil[i]?.missionId;

        if (id) {
          return id;
        }
      }

      for (
        const message of conversationsIndividuelles
      ) {
        const implique =
          message.expediteurId ===
            contactActif?.id ||
          message.destinataireId ===
            contactActif?.id;

        if (
          implique &&
          message.missionId
        ) {
          return message.missionId;
        }
      }

      return null;
    }, [
      conversationActive,
      fil,
      conversationsIndividuelles,
      contactActif,
    ]);

  const missionAffichee =
    mission &&
    mission.id ===
      missionIdActif
      ? mission
      : null;

  useEffect(() => {
    if (!missionIdActif) {
      setMission(null);
      return;
    }

    let cancelled = false;

    async function chargerMission() {
      try {
        const data =
          await api.get<Mission>(
            `/missions/${missionIdActif}`,
            {
              auth: false,
            },
          );

        if (!cancelled) {
          setMission(data);
        }
      } catch {
        if (!cancelled) {
          setMission(null);
        }
      }
    }

    void chargerMission();

    return () => {
      cancelled = true;
    };
  }, [missionIdActif]);

  /* =========================================================
     PROFIL INDIVIDUEL
     ========================================================= */

  useEffect(() => {
    let cancelled = false;

    async function chargerProfil() {
      if (!autreUtilisateurId) {
        return;
      }

      try {
        const role =
          autreUtilisateurRole
            ? String(
                autreUtilisateurRole,
              ).toLowerCase()
            : "";

        if (
          role ===
          "etudiant"
        ) {
          const data =
            await api.get<EtudiantProfile>(
              `/etudiants/${autreUtilisateurId}`,
              {
                auth: false,
              },
            );

          if (!cancelled) {
            setProfilEtudiant(data);
            setProfilClient(null);
          }
        } else if (
          role ===
          "client"
        ) {
          const data =
            await api.get<ClientProfile>(
              `/clients/${autreUtilisateurId}`,
              {
                auth: false,
              },
            );

          if (!cancelled) {
            setProfilClient(data);
            setProfilEtudiant(null);
          }
        }
      } catch {
        if (!cancelled) {
          setProfilEtudiant(null);
          setProfilClient(null);
        }
      }
    }

    void chargerProfil();

    return () => {
      cancelled = true;
    };
  }, [
    autreUtilisateurId,
    autreUtilisateurRole,
  ]);

  const profilEtudiantAffiche =
    profilEtudiant &&
    profilEtudiant.utilisateurId ===
      autreUtilisateurId
      ? profilEtudiant
      : null;

  const profilClientAffiche =
    profilClient &&
    profilClient.utilisateurId ===
      autreUtilisateurId
      ? profilClient
      : null;

  const profilHref =
    autreUtilisateurRole &&
    String(
      autreUtilisateurRole,
    ).toLowerCase() ===
      "etudiant" &&
    autreUtilisateurId
      ? `/etudiants/${autreUtilisateurId}`
      : autreUtilisateurRole &&
          String(
            autreUtilisateurRole,
          ).toLowerCase() ===
            "client" &&
          autreUtilisateurId
        ? `/clients/${autreUtilisateurId}`
        : null;

  /* =========================================================
     PIECES JOINTES
     ========================================================= */

  const piecesJointes =
    useMemo<
      PieceJointeConversation[]
    >(() => {
      if (!utilisateur) {
        return [];
      }

      const liste: PieceJointeConversation[] =
        [];

      const urlsVues =
        new Set<string>();

      for (
        let i =
          fil.length - 1;
        i >= 0;
        i--
      ) {
        const message =
          fil[i];

        if (
          !message?.pieceJointeUrl ||
          message.estSupprime
        ) {
          continue;
        }

        if (
          urlsVues.has(
            message.pieceJointeUrl,
          )
        ) {
          continue;
        }

        urlsVues.add(
          message.pieceJointeUrl,
        );

        liste.push({
          url: message.pieceJointeUrl,
          nom:
            message.pieceJointeNom ??
            null,
          auteur:
            message.expediteurId ===
            utilisateur.id
              ? "Vous"
              : message.expediteur?.nom ??
                conversationActive?.nom ??
                "",
          dateEnvoi:
            message.dateEnvoi,
        });
      }

      return liste;
    }, [
      fil,
      utilisateur,
      conversationActive,
    ]);

  /* =========================================================
     ENVOI
     ========================================================= */

  async function envoyer(
    e: React.FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();

    const contenu =
      nouveauMessage.trim();

    if (
      !conversationActive ||
      !contenu ||
      envoiEnCoursRef.current
    ) {
      return;
    }

    envoiEnCoursRef.current =
      true;

    setEnvoi(true);
    setErreurEnvoi(null);

    try {
      if (
        conversationActive.type ===
        "GROUPE"
      ) {
        await api.post(
          `/messages/groupes/${conversationActive.id}`,
          {
            contenu,
            pieceJointeUrl:
              pieceJointe?.url,
            pieceJointeNom:
              pieceJointe?.nom,
          },
        );

        setNouveauMessage("");
        setPieceJointe(null);

        const data =
          await api.get<
            MessageAvecUtilisateurs[]
          >(
            `/messages/groupes/${conversationActive.id}`,
          );

        setFil(data);

        await rafraichirDonnees();
      } else {
        await api.post(
          "/messages",
          {
            destinataireId:
              conversationActive.id,
            contenu,
            pieceJointeUrl:
              pieceJointe?.url,
            pieceJointeNom:
              pieceJointe?.nom,
          },
        );

        setNouveauMessage("");
        setPieceJointe(null);

        const data =
          await api.get<
            MessageAvecUtilisateurs[]
          >(
            `/messages/conversation/${conversationActive.id}`,
          );

        setFil(data);

        await rafraichirDonnees();
      }
    } catch (error) {
      console.error(
        "Erreur envoi message :",
        error,
      );

      setErreurEnvoi(
        error instanceof ApiError
          ? error.message
          : "Impossible d'envoyer le message. Vérifiez votre connexion et réessayez.",
      );
    } finally {
      envoiEnCoursRef.current =
        false;

      setEnvoi(false);
    }
  }

  /* =========================================================
     CLAVIER
     ========================================================= */

  function gererToucheTextarea(
    e: React.KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (
      e.key !== "Enter"
    ) {
      return;
    }

    if (
      e.shiftKey ||
      e.nativeEvent.isComposing
    ) {
      return;
    }

    e.preventDefault();

    formEnvoiRef.current?.requestSubmit();
  }

  /* =========================================================
     SUPPRESSION
     ========================================================= */

  async function supprimerMessage(
    messageId: string,
  ) {
    if (
      messageEnSuppression
    ) {
      return;
    }

    setMessageEnSuppression(
      messageId,
    );

    setErreur(null);

    try {
      await api.delete(
        `/messages/${messageId}`,
      );

      setFil((precedent) =>
        precedent.map(
          (message) =>
            message.id ===
            messageId
              ? {
                  ...message,
                  estSupprime: true,
                  contenu:
                    "Message supprimé",
                  pieceJointeUrl:
                    null,
                  pieceJointeNom:
                    null,
                }
              : message,
        ),
      );

      await rafraichirDonnees();
    } catch (error) {
      console.error(
        "Erreur suppression message :",
        error,
      );

      setErreur(
        error instanceof ApiError
          ? error.message
          : "Impossible de supprimer ce message.",
      );
    } finally {
      setMessageEnSuppression(
        null,
      );
    }
  }

  /* =========================================================
     SCROLL
     ========================================================= */

  useEffect(() => {
    const zone =
      zoneMessagesRef.current;

    if (!zone) {
      return;
    }

    zone.scrollTop =
      zone.scrollHeight;
  }, [
    fil,
    chargementFil,
    conversationActive?.id,
  ]);

  /* =========================================================
     TEXTAREA
     ========================================================= */

  useEffect(() => {
    const element =
      textareaRef.current;

    if (!element) {
      return;
    }

    element.style.height =
      "auto";

    element.style.height = `${Math.min(
      element.scrollHeight,
      140,
    )}px`;
  }, [nouveauMessage]);

  /* =========================================================
     PANNEAU
     ========================================================= */

  function gererBoutonMenu() {
    if (
      typeof window !==
        "undefined" &&
      window.matchMedia(
        "(min-width: 1280px)",
      ).matches
    ) {
      setPanneauVisible(
        (precedent) =>
          !precedent,
      );
    } else {
      setDetailsOuverts(
        true,
      );
    }
  }

  function fermerConversationMobile() {
    setConversationOuverteMobile(
      false,
    );
  }

  const voirConversationMobile =
    conversationOuverteMobile;

  /* =========================================================
     RENDU
     ========================================================= */

  return (
    <div className="flex h-[calc(100dvh-8rem)] min-h-[560px] flex-col overflow-hidden md:h-[calc(100dvh-9rem)]">

      {erreur && (
        <div
          role="alert"
          className="mb-3 rounded-xl border border-brique/40 bg-brique/10 px-4 py-2.5 text-sm text-brique"
        >
          {erreur}
        </div>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-ink/10 bg-paper-light shadow-sm">

        {/* =================================================
            LISTE
            ================================================= */}

        <aside
          className={clsx(
            "w-full shrink-0 flex-col border-r border-ink/10 bg-paper lg:flex lg:w-[320px]",
            voirConversationMobile
              ? "hidden"
              : "flex",
          )}
        >
          <div className="flex items-center gap-2.5 border-b border-ink/10 px-4 py-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
              <MessageCircle
                size={18}
              />
            </span>

            <div className="min-w-0 flex-1">
              <h1 className="font-display text-lg font-semibold leading-tight text-ink">
                Messages
              </h1>

              <p className="text-xs text-ink-soft">
                {compteNonLus >
                0
                  ? `${compteNonLus} message${compteNonLus > 1 ? "s" : ""} non lu${compteNonLus > 1 ? "s" : ""}`
                  : `${compteToutes} conversation${compteToutes > 1 ? "s" : ""}`}
              </p>
            </div>
          </div>

          {/* RECHERCHE */}

          {compteToutes >
            0 && (
            <div className="px-3 pt-3">
              <div className="relative">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft/60"
                  aria-hidden="true"
                />

                <Input
                  type="search"
                  value={
                    recherche
                  }
                  onChange={(e) =>
                    setRecherche(
                      e.target
                        .value,
                    )
                  }
                  placeholder="Rechercher…"
                  aria-label="Rechercher une conversation"
                  className="w-full rounded-full border-ink/20 bg-paper-light py-2 pl-9 pr-3 text-sm"
                />
              </div>
            </div>
          )}

          {/* ONGLETS */}

          {compteToutes >
            0 && (
            <div
              className="flex gap-2 px-3 pb-3 pt-2.5"
              role="tablist"
              aria-label="Filtrer les conversations"
            >
              {[
                {
                  valeur:
                    "toutes" as const,
                  label:
                    "Toutes",
                  compte:
                    compteToutes,
                },
                {
                  valeur:
                    "non_lus" as const,
                  label:
                    "Non lues",
                  compte:
                    compteNonLus,
                },
              ].map(
                (onglet) => {
                  const estActif =
                    ongletMessages ===
                    onglet.valeur;

                  return (
                    <button
                      key={
                        onglet.valeur
                      }
                      type="button"
                      role="tab"
                      aria-selected={
                        estActif
                      }
                      onClick={() =>
                        setOngletMessages(
                          onglet.valeur,
                        )
                      }
                      className={clsx(
                        "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors",
                        estActif
                          ? "border-ink bg-ink text-paper-light"
                          : "border-ink/20 bg-paper-light text-ink-soft hover:border-ink/50 hover:text-ink",
                      )}
                    >
                      {
                        onglet.label
                      }

                      <span
                        className={clsx(
                          "rounded-full px-1.5 py-px text-[10px] leading-none",
                          estActif
                            ? "bg-paper-light/20 text-paper-light"
                            : "bg-ink/10 text-ink-soft",
                        )}
                      >
                        {
                          onglet.compte
                        }
                      </span>
                    </button>
                  );
                },
              )}
            </div>
          )}

          {/* LISTE */}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {chargement ? (
              <div
                className="space-y-2 p-3"
                aria-hidden="true"
              >
                {[
                  0,
                  1,
                  2,
                  3,
                ].map(
                  (index) => (
                    <div
                      key={
                        index
                      }
                      className="flex items-center gap-3 rounded-xl border border-ink/5 bg-paper-light p-3"
                    >
                      <Skeleton
                        rond
                        className="h-11 w-11"
                      />

                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3.5 w-28" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    </div>
                  ),
                )}
              </div>
            ) : compteToutes ===
              0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <MessageCircle
                    size={22}
                  />
                </span>

                <p className="text-sm font-medium text-ink">
                  Aucune conversation pour l&apos;instant
                </p>

                <p className="text-xs leading-relaxed text-ink-soft/80">
                  Les conversations individuelles et les groupes dont
                  vous êtes membre apparaîtront ici.
                </p>
              </div>
            ) : lignesFiltrees.length ===
              0 ? (
              <div className="flex h-full items-center justify-center p-6 text-center">
                <p className="text-sm text-ink-soft">
                  {recherche.trim()
                    ? `Aucune conversation ne correspond à « ${recherche.trim()} »`
                    : "Aucune conversation avec des messages non lus."}
                </p>
              </div>
            ) : (
              <ul className="flex flex-col">
                {lignesFiltrees.map(
                  (ligne) => {
                    const estSelectionne =
                      conversationActive?.type ===
                        ligne.type &&
                      conversationActive.id ===
                        ligne.id;

                    return (
                      <li
                        key={
                          ligne.cle
                        }
                      >
                        <button
                          type="button"
                          onClick={() =>
                            ligne.type ===
                            "GROUPE"
                              ? selectionnerGroupe(
                                  ligne,
                                )
                              : selectionnerContact(
                                  {
                                    id: ligne.id,
                                    nom: ligne.nom,
                                  },
                                )
                          }
                          aria-current={
                            estSelectionne
                              ? "true"
                              : undefined
                          }
                          className={clsx(
                            "flex w-full cursor-pointer items-center gap-3 border-b border-ink/5 px-4 py-3 text-left transition-colors",
                            estSelectionne
                              ? "bg-primary-soft"
                              : "hover:bg-ink/[0.04]",
                          )}
                        >
                          <span className="relative shrink-0">
                            {ligne.type ===
                            "GROUPE" ? (
                              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft text-primary">
                                <Users
                                  size={20}
                                />
                              </span>
                            ) : (
                              <Avatar
                                nom={
                                  ligne.nom
                                }
                                photoUrl={
                                  ligne.photoUrl
                                }
                                size={
                                  44
                                }
                              />
                            )}

                            {ligne.nonLus >
                              0 && (
                              <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brique px-1 font-mono text-[9px] font-bold leading-none text-paper-light ring-2 ring-paper">
                                {ligne.nonLus >
                                9
                                  ? "9+"
                                  : ligne.nonLus}
                              </span>
                            )}
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="flex items-baseline justify-between gap-2">
                              <span
                                className={clsx(
                                  "flex min-w-0 items-center gap-1.5 truncate text-sm text-ink",
                                  ligne.nonLus >
                                    0
                                    ? "font-semibold"
                                    : "font-medium",
                                )}
                              >
                                <span className="truncate">
                                  {
                                    ligne.nom
                                  }
                                </span>

                                {ligne.type ===
                                  "GROUPE" && (
                                  <Users
                                    size={
                                      12
                                    }
                                    className="shrink-0 text-primary"
                                    aria-label="Groupe"
                                  />
                                )}
                              </span>

                              {ligne.dernierDate &&
                                !ligne.conversationVide && (
                                  <span className="shrink-0 text-[10px] font-mono text-ink-soft/60">
                                    {formaterDateListe(
                                      ligne.dernierDate,
                                    )}
                                  </span>
                                )}
                            </span>

                            <span
                              className={clsx(
                                "mt-0.5 block truncate text-xs",
                                ligne.nonLus >
                                  0
                                  ? "text-ink-soft"
                                  : "text-ink-soft/70",
                              )}
                            >
                              {ligne.type ===
                                "GROUPE" &&
                              ligne.nombreMembres !=
                                null
                                ? `${ligne.nombreMembres} membre${ligne.nombreMembres > 1 ? "s" : ""} · `
                                : ""}

                              {ligne.conversationVide
                                ? "Nouvelle conversation"
                                : `${ligne.dernierEstMoi ? "Vous : " : ""}${ligne.dernierContenu}`}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  },
                )}
              </ul>
            )}
          </div>
        </aside>

        {/* =================================================
            CONVERSATION
            ================================================= */}

        <section
          className={clsx(
            "min-w-0 flex-1 flex-col bg-paper-light lg:flex",
            voirConversationMobile
              ? "flex"
              : "hidden",
          )}
        >
          {!conversationActive ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
                <MessageCircle
                  size={26}
                />
              </span>

              <p className="font-display text-lg font-semibold text-ink">
                Sélectionnez une conversation
              </p>

              <p className="max-w-sm text-sm text-ink-soft/80">
                Choisissez un contact ou un groupe dans la liste.
              </p>
            </div>
          ) : (
            <>
              {/* HEADER */}

              <header className="flex items-center gap-3 border-b border-ink/10 bg-paper-light px-4 py-3">
                <button
                  type="button"
                  onClick={
                    fermerConversationMobile
                  }
                  aria-label="Retour à la liste des conversations"
                  className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink lg:hidden"
                >
                  <ArrowLeft
                    size={18}
                  />
                </button>

                {conversationActive.type ===
                "GROUPE" ? (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                    <Users
                      size={20}
                    />
                  </span>
                ) : (
                  <Avatar
                    nom={
                      conversationActive.nom
                    }
                    photoUrl={
                      autreUtilisateur?.photoUrl
                    }
                    size={40}
                    href={
                      profilHref ??
                      undefined
                    }
                    className="hidden sm:inline-flex"
                  />
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-base font-semibold leading-tight text-ink">
                    {
                      conversationActive.nom
                    }
                  </p>

                  <p className="text-xs text-ink-soft">
                    {conversationActive.type ===
                    "GROUPE"
                      ? conversationActive.nombreMembres !=
                        null
                        ? `${conversationActive.nombreMembres} membre${conversationActive.nombreMembres > 1 ? "s" : ""}`
                        : "Groupe Kianja"
                      : autreUtilisateur
                        ? afficherRole(
                            autreUtilisateur.role,
                          )
                        : "Utilisateur Kianja"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    gererBoutonMenu
                  }
                  aria-label="Détails de la conversation"
                  title="Détails de la conversation"
                  className={clsx(
                    "inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors",
                    panneauVisible
                      ? "bg-primary-soft text-primary"
                      : "text-ink-soft hover:bg-ink/5 hover:text-ink",
                  )}
                >
                  <MoreVertical
                    size={18}
                  />
                </button>
              </header>

              {/* MISSION INDIVIDUELLE */}

              {conversationActive.type ===
                "INDIVIDUEL" &&
                missionAffichee && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-ink/10 bg-paper px-4 py-2.5 text-xs">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-soft">
                      <Briefcase
                        size={13}
                        aria-hidden="true"
                      />
                      Mission
                    </span>

                    <Link
                      href={`/missions/${missionAffichee.id}`}
                      className="max-w-full truncate font-medium text-ink underline-offset-2 hover:underline"
                    >
                      {
                        missionAffichee.titre
                      }
                    </Link>

                    <span className="text-ink-soft">
                      Statut:&nbsp;
                      <span className="font-medium text-ink">
                        {statutMissionLabel[
                          missionAffichee.statut
                        ] ??
                          missionAffichee.statut}
                      </span>
                    </span>

                    <span className="text-ink-soft">
                      Budget:&nbsp;
                      <span className="font-medium text-ink">
                        {formatArgent(
                          missionAffichee.budget,
                        )}
                      </span>
                    </span>

                    <Link
                      href={`/missions/${missionAffichee.id}`}
                      className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/30 bg-primary-soft px-2.5 py-1 font-medium text-primary transition-colors hover:border-primary/60"
                    >
                      Voir la mission
                      <ExternalLink
                        size={12}
                        aria-hidden="true"
                      />
                    </Link>
                  </div>
                )}

              {/* FIL */}

              <div
                ref={
                  zoneMessagesRef
                }
                className="min-h-0 flex-1 space-y-1.5 overflow-y-auto bg-paper px-4 py-4"
              >
                {chargementFil ? (
                  <div className="flex h-full items-center justify-center gap-2 text-sm text-ink-soft">
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                    Chargement de la conversation…
                  </div>
                ) : fil.length ===
                  0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink/5 text-ink-soft">
                      {conversationActive.type ===
                      "GROUPE" ? (
                        <Users
                          size={20}
                        />
                      ) : (
                        <MessageCircle
                          size={20}
                        />
                      )}
                    </span>

                    <p className="text-sm text-ink-soft">
                      Aucun message dans cette conversation.
                    </p>

                    <p className="text-xs text-ink-soft/70">
                      Envoyez le premier message pour démarrer les échanges.
                    </p>
                  </div>
                ) : (
                  fil.map(
                    (
                      message,
                      index,
                    ) => {
                      const estMoi =
                        message.expediteurId ===
                        utilisateur?.id;

                      const nouveauJour =
                        index ===
                          0 ||
                        !estMemeJournee(
                          fil[
                            index -
                              1
                          ].dateEnvoi,
                          message.dateEnvoi,
                        );

                      return (
                        <div
                          key={
                            message.id
                          }
                        >
                          {nouveauJour && (
                            <div className="flex justify-center py-2">
                              <span className="rounded-full bg-ink/5 px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-ink-soft/70">
                                {formaterJourSeparateur(
                                  message.dateEnvoi,
                                )}
                              </span>
                            </div>
                          )}

                          <div
                            className={clsx(
                              "group flex w-full items-end gap-2",
                              estMoi
                                ? "justify-end"
                                : "justify-start",
                            )}
                          >
                            {!estMoi && (
                              <Avatar
                                nom={
                                  message.expediteur
                                    ?.nom ??
                                  conversationActive.nom
                                }
                                photoUrl={
                                  message
                                    .expediteur
                                    ?.photoUrl
                                }
                                size={
                                  26
                                }
                                className="mb-1 hidden shrink-0 sm:inline-flex"
                              />
                            )}

                            <div
                              className={clsx(
                                "relative max-w-[85%] rounded-2xl px-3.5 py-2 text-sm shadow-sm sm:max-w-[70%]",
                                estMoi
                                  ? "rounded-br-md bg-primary text-paper-light"
                                  : "rounded-bl-md border border-ink/10 bg-paper-light text-ink",
                              )}
                            >
                              {/* AUTEUR GROUPE */}

                              {conversationActive.type ===
                                "GROUPE" &&
                                !estMoi &&
                                message.expediteur
                                  ?.nom && (
                                  <p className="mb-1 text-[10px] font-semibold text-primary">
                                    {
                                      message.expediteur
                                        .nom
                                    }
                                  </p>
                                )}

                              {message.estSupprime ? (
                                <p
                                  className={clsx(
                                    "text-xs italic",
                                    estMoi
                                      ? "text-paper-light/70"
                                      : "text-ink-soft/70",
                                  )}
                                >
                                  Message supprimé
                                </p>
                              ) : (
                                <>
                                  {message.contenu && (
                                    <p className="whitespace-pre-wrap break-words">
                                      {
                                        message.contenu
                                      }
                                    </p>
                                  )}

                                  {message.pieceJointeUrl && (
                                    <div
                                      className={clsx(
                                        message.contenu
                                          ? "mt-2"
                                          : "",
                                        estMoi &&
                                          "[&_a]:border-paper-light/40 [&_a]:bg-paper-light/10 [&_a]:text-paper-light [&_a:hover]:bg-paper-light/20",
                                      )}
                                    >
                                      <PieceJointeAffichage
                                        url={
                                          message.pieceJointeUrl
                                        }
                                        nom={
                                          message.pieceJointeNom
                                        }
                                      />
                                    </div>
                                  )}
                                </>
                              )}

                              <div
                                className={clsx(
                                  "mt-1 flex items-center justify-end gap-1 text-[10px] font-mono leading-none",
                                  estMoi
                                    ? "text-paper-light/70"
                                    : "text-ink-soft/60",
                                )}
                              >
                                <span>
                                  {formaterHeure(
                                    message.dateEnvoi,
                                  )}
                                </span>

                                {estMoi &&
                                  !message.estSupprime &&
                                  (message.estLu ? (
                                    <CheckCheck
                                      size={
                                        13
                                      }
                                      aria-label="Message lu"
                                    />
                                  ) : (
                                    <Check
                                      size={
                                        13
                                      }
                                      aria-label="Message envoyé"
                                    />
                                  ))}
                              </div>

                              {estMoi &&
                                !message.estSupprime && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      supprimerMessage(
                                        message.id,
                                      )
                                    }
                                    disabled={
                                      messageEnSuppression ===
                                      message.id
                                    }
                                    aria-label="Supprimer ce message"
                                    className="absolute -right-2 -top-2 hidden h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-ink/15 bg-paper text-[10px] text-ink-soft opacity-0 transition-opacity hover:border-brique/50 hover:text-brique group-hover:flex group-hover:opacity-100"
                                  >
                                    ×
                                  </button>
                                )}
                            </div>
                          </div>
                        </div>
                      );
                    },
                  )
                )}
              </div>

              {/* SAISIE */}

              <form
                ref={
                  formEnvoiRef
                }
                onSubmit={envoyer}
                className="border-t border-ink/10 bg-paper-light px-4 py-3"
              >
                <div className="flex items-end gap-2">
                  <SelecteurPieceJointe
                    compact
                    valeur={
                      pieceJointe
                    }
                    onChange={
                      setPieceJointe
                    }
                    disabled={
                      envoi
                    }
                  />

                  <Textarea
                    ref={
                      textareaRef
                    }
                    rows={1}
                    value={
                      nouveauMessage
                    }
                    onChange={(e) =>
                      setNouveauMessage(
                        e.target
                          .value,
                      )
                    }
                    onKeyDown={
                      gererToucheTextarea
                    }
                    placeholder={
                      conversationActive.type ===
                      "GROUPE"
                        ? "Écrivez au groupe…"
                        : "Écrivez votre message…"
                    }
                    aria-label="Votre message"
                    className="max-h-[140px] min-h-[40px] flex-1 resize-none rounded-2xl py-2"
                    disabled={
                      envoi
                    }
                  />

                  <button
                    type="submit"
                    disabled={
                      envoi ||
                      !nouveauMessage.trim()
                    }
                    aria-label="Envoyer le message"
                    className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-paper-light shadow-sm transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {envoi ? (
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                    ) : (
                      <Send
                        size={16}
                      />
                    )}
                  </button>
                </div>

                {erreurEnvoi && (
                  <p
                    role="alert"
                    className="mt-2 text-xs text-brique"
                  >
                    {
                      erreurEnvoi
                    }
                  </p>
                )}

                <p className="mt-2 hidden text-[10px] font-mono text-ink-soft/50 sm:block">
                  Entrée pour envoyer · Maj+Entrée pour une nouvelle ligne
                </p>
              </form>
            </>
          )}
        </section>

        {/* =================================================
            PANNEAU DROIT
            ================================================= */}

        {conversationActive &&
          panneauVisible && (
            <aside className="hidden w-[330px] shrink-0 flex-col gap-4 overflow-y-auto border-l border-ink/10 bg-paper p-4 xl:flex">
              <PanneauDetailsConversation
                conversation={
                  conversationActive
                }
                autreUtilisateur={
                  autreUtilisateur
                }
                profilEtudiant={
                  profilEtudiantAffiche
                }
                profilClient={
                  profilClientAffiche
                }
                profilHref={
                  profilHref
                }
                missionAffichee={
                  missionAffichee
                }
                piecesJointes={
                  piecesJointes
                }
              />
            </aside>
          )}
      </div>

      {/* =================================================
          PANNEAU MOBILE
          ================================================= */}

      {conversationActive &&
        detailsOuverts && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Détails de la conversation"
            className="fixed inset-0 z-50 flex justify-end bg-ink/50 xl:hidden"
            onClick={() =>
              setDetailsOuverts(
                false,
              )
            }
          >
            <div
              className="flex h-full w-full max-w-sm flex-col border-l border-ink/10 bg-paper shadow-xl"
              onClick={(e) =>
                e.stopPropagation()
              }
            >
              <div className="flex items-center justify-between border-b border-ink/10 px-4 py-3">
                <h2 className="font-display text-base font-semibold text-ink">
                  Détails de la conversation
                </h2>

                <button
                  type="button"
                  onClick={() =>
                    setDetailsOuverts(
                      false,
                    )
                  }
                  aria-label="Fermer les détails"
                  className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink"
                >
                  <X
                    size={18}
                  />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-4">
                <PanneauDetailsConversation
                  conversation={
                    conversationActive
                  }
                  autreUtilisateur={
                    autreUtilisateur
                  }
                  profilEtudiant={
                    profilEtudiantAffiche
                  }
                  profilClient={
                    profilClientAffiche
                  }
                  profilHref={
                    profilHref
                  }
                  missionAffichee={
                    missionAffichee
                  }
                  piecesJointes={
                    piecesJointes
                  }
                />
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

/* =========================================================
   PANNEAU DETAILS
   ========================================================= */

function PanneauDetailsConversation({
  conversation,
  autreUtilisateur,
  profilEtudiant,
  profilClient,
  profilHref,
  missionAffichee,
  piecesJointes,
}: {
  conversation: SelectionConversation;

  autreUtilisateur: NonNullable<
    MessageAvecUtilisateurs["expediteur"]
  > | null;

  profilEtudiant:
    | EtudiantProfile
    | null;

  profilClient:
    | ClientProfile
    | null;

  profilHref: string | null;

  missionAffichee:
    | Mission
    | null;

  piecesJointes:
    PieceJointeConversation[];
}) {
  const noteEtudiant =
    profilEtudiant?.noteMoyenne !=
    null
      ? Number(
          profilEtudiant.noteMoyenne,
        )
      : null;

  /* =========================================================
     GROUPE
     ========================================================= */

  if (
    conversation.type ===
    "GROUPE"
  ) {
    return (
      <>
        <section className="rounded-xl border border-ink/10 bg-paper-light p-4 shadow-sm">
          <h3 className="mb-3 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-soft">
            <Users
              size={13}
              aria-hidden="true"
            />
            Groupe
          </h3>

          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Users
                size={22}
              />
            </span>

            <div className="min-w-0">
              <p className="truncate font-display text-sm font-semibold text-ink">
                {
                  conversation.nom
                }
              </p>

              <p className="text-xs text-ink-soft">
                {conversation.nombreMembres !=
                null
                  ? `${conversation.nombreMembres} membre${conversation.nombreMembres > 1 ? "s" : ""}`
                  : "Groupe Kianja"}
              </p>
            </div>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-ink-soft/80">
            Discussion réservée aux membres actifs de ce groupe.
          </p>
        </section>

        {piecesJointes.length >
          0 && (
          <section className="rounded-xl border border-ink/10 bg-paper-light p-4 shadow-sm">
            <h3 className="mb-3 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-soft">
              <FileText
                size={13}
              />
              Pièces jointes (
              {
                piecesJointes.length
              }
              )
            </h3>

            <ul className="space-y-2">
              {piecesJointes.map(
                (piece) => (
                  <li
                    key={
                      piece.url
                    }
                    className="rounded-lg border border-ink/10 bg-paper p-2.5"
                  >
                    <PieceJointeAffichage
                      url={
                        piece.url
                      }
                      nom={
                        piece.nom
                      }
                    />

                    <p className="mt-1.5 text-[10px] font-mono text-ink-soft/60">
                      {
                        piece.auteur
                      }{" "}
                      ·{" "}
                      {formaterDateListe(
                        piece.dateEnvoi,
                      )}
                    </p>
                  </li>
                ),
              )}
            </ul>
          </section>
        )}
      </>
    );
  }

  /* =========================================================
     INDIVIDUEL
     ========================================================= */

  return (
    <>
      {missionAffichee && (
        <section className="rounded-xl border border-ink/10 bg-paper-light p-4 shadow-sm">
          <h3 className="mb-3 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-soft">
            <Briefcase
              size={13}
            />
            Mission liée
          </h3>

          {missionAffichee.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={
                getFileUrl(
                  missionAffichee.imageUrl,
                ) ?? ""
              }
              alt=""
              className="mb-3 h-28 w-full rounded-lg border border-ink/10 object-cover"
            />
          )}

          <p className="font-display text-sm font-semibold leading-snug text-ink">
            {
              missionAffichee.titre
            }
          </p>

          <dl className="mt-3 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-ink-soft/70">
                Statut
              </dt>

              <dd className="font-medium text-ink">
                {
                  statutMissionLabel[
                    missionAffichee.statut
                  ] ??
                  missionAffichee.statut
                }
              </dd>
            </div>

            <div className="flex items-center justify-between gap-2">
              <dt className="text-ink-soft/70">
                Budget
              </dt>

              <dd className="font-medium text-ink">
                {formatArgent(
                  missionAffichee.budget,
                )}
              </dd>
            </div>

            <div className="flex items-center justify-between gap-2">
              <dt className="text-ink-soft/70">
                Date limite
              </dt>

              <dd className="font-medium text-ink">
                {formatDate(
                  missionAffichee.dateLimite,
                )}
              </dd>
            </div>
          </dl>

          <Button
            href={`/missions/${missionAffichee.id}`}
            variant="ghost"
            size="sm"
            className="mt-3 w-full justify-center gap-1.5"
          >
            Voir la mission
            <ExternalLink
              size={13}
            />
          </Button>
        </section>
      )}

      <section className="rounded-xl border border-ink/10 bg-paper-light p-4 shadow-sm">
        <h3 className="mb-3 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-soft">
          <User
            size={13}
          />
          Correspondant
        </h3>

        <div className="flex items-center gap-3">
          <Avatar
            nom={
              conversation.nom
            }
            photoUrl={
              autreUtilisateur?.photoUrl
            }
            size={48}
          />

          <div className="min-w-0">
            <p className="truncate font-display text-sm font-semibold text-ink">
              {
                conversation.nom
              }
            </p>

            <p className="text-xs text-ink-soft">
              {autreUtilisateur
                ? afficherRole(
                    autreUtilisateur.role,
                  )
                : "Utilisateur Kianja"}
            </p>

            {noteEtudiant !=
              null &&
              !Number.isNaN(
                noteEtudiant,
              ) && (
                <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-ink-soft">
                  <Star
                    size={12}
                    className="text-ocre"
                  />

                  {noteEtudiant.toFixed(
                    1,
                  )}
                  /5
                </p>
              )}
          </div>
        </div>

        {profilEtudiant?.universite && (
          <p className="mt-2.5 text-xs text-ink-soft/80">
            Université:&nbsp;
            {
              profilEtudiant.universite
            }
          </p>
        )}

        {profilClient?.nomEntreprise && (
          <p className="mt-2.5 text-xs text-ink-soft/80">
            Entreprise:&nbsp;
            {
              profilClient.nomEntreprise
            }
          </p>
        )}

        {profilHref && (
          <Button
            href={
              profilHref
            }
            variant="ghost"
            size="sm"
            className="mt-3 w-full justify-center gap-1.5"
          >
            Voir le profil
            <ExternalLink
              size={13}
            />
          </Button>
        )}
      </section>

      {piecesJointes.length >
        0 && (
        <section className="rounded-xl border border-ink/10 bg-paper-light p-4 shadow-sm">
          <h3 className="mb-3 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-soft">
            <FileText
              size={13}
            />
            Pièces jointes (
            {
              piecesJointes.length
            }
            )
          </h3>

          <ul className="space-y-2">
            {piecesJointes.map(
              (piece) => (
                <li
                  key={
                    piece.url
                  }
                  className="rounded-lg border border-ink/10 bg-paper p-2.5"
                >
                  <PieceJointeAffichage
                    url={
                      piece.url
                    }
                    nom={
                      piece.nom
                    }
                  />

                  <p className="mt-1.5 text-[10px] font-mono text-ink-soft/60">
                    {
                      piece.auteur
                    }{" "}
                    ·{" "}
                    {formaterDateListe(
                      piece.dateEnvoi,
                    )}
                  </p>
                </li>
              ),
            )}
          </ul>
        </section>
      )}
    </>
  );
}