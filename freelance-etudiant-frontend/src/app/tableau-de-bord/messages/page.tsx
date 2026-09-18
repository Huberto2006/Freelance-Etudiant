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
  X,
} from "lucide-react";
import { clsx } from "clsx";

import { roleLabel, useAuth } from "@/lib/auth-context";
import { api, ApiError, getFileUrl } from "@/lib/api";
import { useSocket } from "@/lib/socket-context";
import { formatArgent, formatDate, statutMissionLabel } from "@/lib/format";

import type { MessageAvecUtilisateurs } from "@/lib/message-types";
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

/**
 * Ligne de la liste des conversations : dérivée des messages réels
 * renvoyés par GET /messages (aucune donnée fabriquée).
 */
interface ContactConversation {
  id: string;
  nom: string;
  photoUrl?: string | null;
  role?: Role | null;
  dernierContenu: string;
  dernierDate: string | null;
  dernierEstMoi: boolean;
  conversationVide: boolean;
  nonLus: number;
}

/** Pièce jointe partagée dans la conversation ouverte. */
interface PieceJointeConversation {
  url: string;
  nom: string | null;
  auteur: string;
  dateEnvoi: string;
}

/* =========================================================
   HELPERS D'AFFICHAGE (dates, aperçus)
   ========================================================= */

/** Heure d'un message (ex. « 14:32 »). */
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

/**
 * Date compacte pour la liste des conversations :
 * « 14:32 » aujourd'hui, « Hier », « 12 sept. » (année si différente).
 */
function formaterDateListe(date: string): string {
  const jour = new Date(date);
  if (Number.isNaN(jour.getTime())) return "";

  const aujourdhui = new Date();
  if (jour.toDateString() === aujourdhui.toDateString()) {
    return formaterHeure(date);
  }

  const hier = new Date(aujourdhui);
  hier.setDate(aujourdhui.getDate() - 1);
  if (jour.toDateString() === hier.toDateString()) {
    return "Hier";
  }

  const memeAnnee = jour.getFullYear() === aujourdhui.getFullYear();
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
      ...(memeAnnee ? {} : { year: "numeric" }),
    }).format(jour);
  } catch {
    return "";
  }
}

/** Étiquette de séparation par jour dans le fil (ex. « lundi 12 septembre »). */
function formaterJourSeparateur(date: string): string {
  const jour = new Date(date);
  if (Number.isNaN(jour.getTime())) return "";

  const memeAnnee = jour.getFullYear() === new Date().getFullYear();
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      ...(memeAnnee ? {} : { year: "numeric" }),
    }).format(jour);
  } catch {
    return "";
  }
}

function estMemeJournee(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

/** Aperçu du dernier message pour la liste des conversations. */
function apercuMessage(message: MessageAvecUtilisateurs): string {
  if (message.estSupprime) return "Message supprimé";
  if (message.contenu?.trim()) return message.contenu.trim();
  if (message.pieceJointeUrl) return "Pièce jointe";
  return "Nouvelle conversation";
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
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
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

  /*
   * Erreur specifique a l'envoi du message en cours, distincte de
   * `erreur` (chargement des conversations / suppression) : affichee
   * au plus pres du champ de saisie pour rester claire pour
   * l'utilisateur, sans se confondre avec les autres erreurs de la
   * page.
   */
  const [
    erreurEnvoi,
    setErreurEnvoi,
  ] = useState<string | null>(null);

  /*
   * Ref du formulaire d'envoi : permet a `Enter` (via onKeyDown sur le
   * textarea) de declencher exactement le meme chemin de soumission
   * que le clic sur le bouton "Envoyer" (form.requestSubmit()),
   * pour eviter toute logique d'envoi dupliquee.
   */
  const formEnvoiRef = useRef<HTMLFormElement>(null);

  /*
   * Verrou synchrone anti-double-envoi : plus fiable qu'un test sur
   * le seul state `envoi` en cas d'appuis tres rapproches (l'etat
   * React ne se met a jour qu'au prochain rendu).
   */
  const envoiEnCoursRef = useRef(false);

  // Zone defilante des messages : pour rester en bas du fil.
  const zoneMessagesRef = useRef<HTMLDivElement>(null);

  // Champ de saisie : pour ajuster sa hauteur a son contenu.
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Onglet actif de la liste : Toutes / Non lues.
  const [ongletMessages, setOngletMessages] = useState("toutes");

  // Recherche client-side dans la liste des conversations.
  const [recherche, setRecherche] = useState("");

  /*
   * Mobile : vue affichee (liste <-> conversation). On arrive sur la
   * conversation si l'URL pointe deja vers un contact (?contact=...).
   */
  const [
    conversationOuverteMobile,
    setConversationOuverteMobile,
  ] = useState(Boolean(contactIdParam));

  /*
   * Panneau de details (mission, profil, pieces jointes) :
   * - xl+        : colonne de droite, masquable via le bouton menu ;
   * - en dessous : panneau lateral affiche en superposition.
   */
  const [panneauVisible, setPanneauVisible] = useState(true);
  const [detailsOuverts, setDetailsOuverts] = useState(false);

  // Contexte de mission lie a la conversation (GET /missions/:id public).
  const [mission, setMission] = useState<Mission | null>(null);

  // Fiches publiques du correspondant (note, universite, entreprise…).
  const [profilEtudiant, setProfilEtudiant] = useState<EtudiantProfile | null>(null);
  const [profilClient, setProfilClient] = useState<ClientProfile | null>(null);

  const [
    messageEnSuppression,
    setMessageEnSuppression,
  ] = useState<string | null>(null);

  /*
   * Si l'URL change (ex. clic sur un autre lien « Contacter »), on
   * réajuste la vue mobile pendant le rendu (patron React documenté :
   * ajustement d'état lors d'un changement de prop), sans effet de bord.
   */
  const [dernierContactIdUrl, setDernierContactIdUrl] = useState(contactIdParam);
  if (contactIdParam !== dernierContactIdUrl) {
    setDernierContactIdUrl(contactIdParam);
    setConversationOuverteMobile(Boolean(contactIdParam));
  }

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

  // Mobile : conversation affichee a la place de la liste.
  const voirConversationMobile =
    conversationOuverteMobile && Boolean(contactActif);

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

    void chargerInitial();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =========================================================
     CONSTRUCTION DES CONTACTS (liste des conversations)
     ========================================================= */

  /*
   * Dérivé des messages réels renvoyés par GET /messages (triés du
   * plus récent au plus ancien par le backend) : la première
   * occurrence d'un contact porte donc son message le plus récent.
   *
   * Les conversations « virtuelles » (contacts issus d'une candidature
   * acceptée, sans message envoyé) affichent « Nouvelle conversation ».
   */
  const contacts = useMemo<ContactConversation[]>(() => {
    if (!utilisateur) {
      return [];
    }

    const map = new Map<string, ContactConversation>();

    for (const message of conversations) {
      const autre =
        message.expediteurId === utilisateur.id
          ? message.destinataire
          : message.expediteur;

      if (!autre) {
        continue;
      }

      if (map.has(autre.id)) {
        continue;
      }

      map.set(autre.id, {
        id: autre.id,
        nom: autre.nom,
        photoUrl: autre.photoUrl ?? null,
        role: autre.role ?? null,
        dernierContenu: apercuMessage(message),
        dernierDate: message.dateEnvoi,
        dernierEstMoi:
          message.expediteurId === utilisateur.id,
        conversationVide:
          !message.contenu?.trim() &&
          !message.estSupprime &&
          !message.pieceJointeUrl,
        nonLus: 0,
      });
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
      map.set(contactDepuisUrl.id, {
        id: contactDepuisUrl.id,
        nom: contactDepuisUrl.nom,
        photoUrl: null,
        role: null,
        dernierContenu: "Nouvelle conversation",
        dernierDate: null,
        dernierEstMoi: false,
        conversationVide: true,
        nonLus: 0,
      });
    }

    /*
     * Indicateurs de MESSAGES non lus (champ estLu de la table
     * messages). Totalement indépendant du compteur de
     * notifications 🔔.
     */
    for (const message of conversations) {
      if (
        message.destinataireId === utilisateur.id &&
        !message.estLu
      ) {
        const ligne = map.get(message.expediteurId);
        if (ligne) {
          ligne.nonLus += 1;
        }
      }
    }

    return Array.from(map.values());
  }, [conversations, utilisateur, contactDepuisUrl]);

  /* =========================================================
     RECHERCHE + ONGLETS (filtrage client-side)
     ========================================================= */

  const rechercheNormalisee = recherche.trim().toLowerCase();

  const contactsFiltres = useMemo(() => {
    if (!rechercheNormalisee) {
      return contacts;
    }

    return contacts.filter(
      (contact) =>
        contact.nom.toLowerCase().includes(rechercheNormalisee) ||
        contact.dernierContenu.toLowerCase().includes(rechercheNormalisee),
    );
  }, [contacts, rechercheNormalisee]);

  // Onglet « Non lues » : uniquement les contacts avec des messages non lus.
  const contactsAffiches =
    ongletMessages === "non_lus"
      ? contactsFiltres.filter(
          (contact) => contact.nonLus > 0,
        )
      : contactsFiltres;

  const compteNonLus = contacts.filter(
    (contact) => contact.nonLus > 0,
  ).length;

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
    setErreurEnvoi(null);
    setConversationOuverteMobile(true);

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

  /*
   * Suppression logique poussée par le serveur (événement
   * `message:supprime` émis par le backend aux deux participants) :
   * le message devient un tombstone « Message supprimé » dans le fil.
   */
  useEffect(() => {
    if (!socket) return;

    function onMessageSupprime(payload: { id: string }) {
      setFil((prev) =>
        prev.map((message) =>
          message.id === payload.id
            ? {
                ...message,
                estSupprime: true,
                contenu: "",
                pieceJointeUrl: null,
                pieceJointeNom: null,
              }
            : message,
        ),
      );
    }

    socket.on("message:supprime", onMessageSupprime);

    return () => {
      socket.off("message:supprime", onMessageSupprime);
    };
  }, [socket]);

  /* =========================================================
     CORRESPONDANT (photo, rôle) DÉRIVÉ DES MESSAGES RÉELS
     ========================================================= */

  const autreUtilisateur = useMemo(() => {
    if (!utilisateur || !contactActif) {
      return null;
    }

    // Le fil est prioritaire, puis la liste des conversations.
    for (const message of fil) {
      if (message.expediteurId === contactActif.id && message.expediteur) {
        return message.expediteur;
      }
      if (message.destinataireId === contactActif.id && message.destinataire) {
        return message.destinataire;
      }
    }

    for (const message of conversations) {
      if (message.expediteurId === contactActif.id && message.expediteur) {
        return message.expediteur;
      }
      if (message.destinataireId === contactActif.id && message.destinataire) {
        return message.destinataire;
      }
    }

    return null;
  }, [utilisateur, contactActif, fil, conversations]);

  const autreUtilisateurId = autreUtilisateur?.id ?? null;
  const autreUtilisateurRole = autreUtilisateur?.role ?? null;

  /* =========================================================
     CONTEXTE DE MISSION DE LA CONVERSATION (données réelles)
     ========================================================= */

  /*
   * Un message peut être rattaché à une mission (missionId) :
   * le contexte affiché est celui de la mission la plus récemment
   * mentionnée dans la conversation. Le détail est chargé via
   * l'endpoint public existant GET /missions/:id.
   */
  const missionIdActif = useMemo(() => {
    for (let i = fil.length - 1; i >= 0; i--) {
      const id = fil[i]?.missionId;
      if (id) return id;
    }

    if (utilisateur && contactActif) {
      for (const message of conversations) {
        const implique =
          message.expediteurId === contactActif.id ||
          message.destinataireId === contactActif.id;

        if (implique && message.missionId) {
          return message.missionId;
        }
      }
    }

    return null;
  }, [fil, conversations, utilisateur, contactActif]);

  // Seule la mission correspondant au contexte courant est affichée.
  const missionAffichee =
    mission && mission.id === missionIdActif ? mission : null;

  useEffect(() => {
    if (!missionIdActif) return;

    let cancelled = false;

    async function chargerMission() {
      try {
        const data = await api.get<Mission>(
          `/missions/${missionIdActif}`,
          { auth: false },
        );

        if (!cancelled) {
          setMission(data);
        }
      } catch {
        // Mission inaccessible (supprimée, droits…) : aucun contexte
        // de mission n'est affiché, la conversation reste utilisable.
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
     FICHE PUBLIQUE DU CORRESPONDANT (note, université…)
     ========================================================= */

  useEffect(() => {
    let cancelled = false;

    async function chargerProfil() {
      const id = autreUtilisateurId;
      if (!id) return;

      try {
        if (autreUtilisateurRole === "etudiant") {
          const data = await api.get<EtudiantProfile>(
            `/etudiants/${id}`,
            { auth: false },
          );

          if (!cancelled) {
            setProfilEtudiant(data);
          }
        } else if (autreUtilisateurRole === "client") {
          const data = await api.get<ClientProfile>(
            `/clients/${id}`,
            { auth: false },
          );

          if (!cancelled) {
            setProfilClient(data);
          }
        }
      } catch {
        // Fiche publique indisponible : l'interface reste basée sur
        // les informations déjà connues (nom, rôle, photo).
      }
    }

    void chargerProfil();

    return () => {
      cancelled = true;
    };
  }, [autreUtilisateurId, autreUtilisateurRole]);

  // Seule la fiche correspondant au correspondant courant est affichée.
  const profilEtudiantAffiche =
    profilEtudiant &&
    profilEtudiant.utilisateurId === autreUtilisateurId
      ? profilEtudiant
      : null;

  const profilClientAffiche =
    profilClient &&
    profilClient.utilisateurId === autreUtilisateurId
      ? profilClient
      : null;

  // Lien « Voir le profil » selon le rôle réel du correspondant.
  const profilHref =
    autreUtilisateurRole === "etudiant" && autreUtilisateurId
      ? `/etudiants/${autreUtilisateurId}`
      : autreUtilisateurRole === "client" && autreUtilisateurId
        ? `/clients/${autreUtilisateurId}`
        : null;

  /* =========================================================
     PIÈCES JOINTES DE LA CONVERSATION (du plus récent au plus ancien)
     ========================================================= */

  const piecesJointes = useMemo<PieceJointeConversation[]>(() => {
    if (!utilisateur) return [];

    const liste: PieceJointeConversation[] = [];
    const urlsVues = new Set<string>();

    for (let i = fil.length - 1; i >= 0; i--) {
      const message = fil[i];

      if (!message?.pieceJointeUrl || message.estSupprime) continue;
      if (urlsVues.has(message.pieceJointeUrl)) continue;

      urlsVues.add(message.pieceJointeUrl);

      liste.push({
        url: message.pieceJointeUrl,
        nom: message.pieceJointeNom ?? null,
        auteur:
          message.expediteurId === utilisateur.id
            ? "Vous"
            : message.expediteur?.nom ?? contactActif?.nom ?? "",
        dateEnvoi: message.dateEnvoi,
      });
    }

    return liste;
  }, [fil, utilisateur, contactActif]);

  /* =========================================================
     ENVOYER UN MESSAGE
     ========================================================= */

  async function envoyer(
    e: React.FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();

    /*
     * Le contenu n'est nettoye (trim) qu'ici, au moment de l'envoi :
     * `nouveauMessage` conserve tous les retours a la ligne saisis
     * par l'utilisateur (Shift+Enter) pendant la redaction. `.trim()`
     * ne retire que les espaces/retours a la ligne en debut et fin,
     * jamais les lignes vides internes.
     */
    const contenu = nouveauMessage.trim();

    /*
     * Verrou synchrone (ref) en plus du state `envoi` : protege
     * contre des appuis tres rapides sur Enter avant meme que React
     * n'ait re-rendu avec `envoi = true`. Bloque aussi les messages
     * vides ou constitues uniquement d'espaces/retours a la ligne.
     */
    if (
      !contactActif ||
      !contenu ||
      envoiEnCoursRef.current
    ) {
      return;
    }

    envoiEnCoursRef.current = true;
    setEnvoi(true);
    setErreurEnvoi(null);

    try {
      await api.post(
        "/messages",
        {
          destinataireId:
            contactActif.id,

          contenu,

          pieceJointeUrl:
            pieceJointe?.url,

          pieceJointeNom:
            pieceJointe?.nom,
        },
      );

      // Le champ n'est vide qu'apres confirmation du succes de l'envoi.
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

      /*
       * Le texte saisi (`nouveauMessage`) n'est pas touche ici : il
       * reste dans le champ pour que l'utilisateur puisse reessayer
       * sans tout retaper.
       */
      setErreurEnvoi(
        error instanceof ApiError
          ? error.message
          : "Impossible d'envoyer le message. Vérifiez votre connexion et réessayez.",
      );
    } finally {
      envoiEnCoursRef.current = false;
      setEnvoi(false);
    }
  }

  /* =========================================================
     CLAVIER — CHAMP DE SAISIE DU MESSAGE
     ========================================================= */

  /*
   * - Enter seul       -> envoie le message (jamais de saut de ligne).
   * - Shift+Enter      -> comportement natif du textarea : nouvelle
   *                        ligne, n'envoie jamais le message.
   * - Composition IME  -> une touche Enter utilisee pour valider une
   *                        composition (saisie chinois/japonais/…)
   *                        ne doit pas declencher l'envoi.
   *
   * L'envoi passe par `form.requestSubmit()`, qui declenche le meme
   * `onSubmit={envoyer}` que le clic sur le bouton : un seul chemin
   * de soumission, donc aucun risque de double logique d'envoi.
   */
  function gererToucheTextarea(
    e: React.KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (e.key !== "Enter") {
      return;
    }

    if (e.shiftKey || e.nativeEvent.isComposing) {
      return;
    }

    e.preventDefault();
    formEnvoiRef.current?.requestSubmit();
  }

  /**
   * Suppression logique d'un message (RG : seul l'expéditeur peut
   * supprimer son propre message ; le backend transforme le contenu
   * en tombstone « Message supprimé », jamais de suppression physique).
   */
  async function supprimerMessage(messageId: string) {
    if (messageEnSuppression) return;

    setMessageEnSuppression(messageId);
    setErreur(null);

    try {
      await api.delete(`/messages/${messageId}`);

      setFil((precedent) =>
        precedent.map((m) =>
          m.id === messageId
            ? { ...m, estSupprime: true, contenu: "Message supprimé" }
            : m,
        ),
      );

      await chargerConversations();
    } catch (error) {
      console.error(
        "Erreur lors de la suppression du message :",
        error,
      );

      setErreur(
        error instanceof ApiError
          ? error.message
          : "Impossible de supprimer ce message.",
      );
    } finally {
      setMessageEnSuppression(null);
    }
  }

  /* =========================================================
     ERGONOMIE — DÉFILEMENT ET CHAMP DE SAISIE
     ========================================================= */

  // Rester en bas du fil à l'ouverture et à l'arrivée d'un message.
  useEffect(() => {
    const zone = zoneMessagesRef.current;
    if (!zone) return;

    zone.scrollTop = zone.scrollHeight;
  }, [fil, chargementFil, contactActif?.id]);

  // Le champ de saisie s'ajuste à son contenu (max 140px).
  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;

    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 140)}px`;
  }, [nouveauMessage]);

  /* =========================================================
     NAVIGATION PANNEAU DE DÉTAILS / VUE MOBILE
     ========================================================= */

  /*
   * Bouton menu de l'en-tête :
   * - xl+  : affiche/masque la colonne de droite ;
   * - < xl : ouvre le panneau en superposition.
   */
  function gererBoutonMenu() {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1280px)").matches
    ) {
      setPanneauVisible((precedent) => !precedent);
    } else {
      setDetailsOuverts(true);
    }
  }

  // Retour à la liste des conversations (mobile uniquement).
  function fermerConversationMobile() {
    setConversationOuverteMobile(false);
  }

  /* =========================================================
     AFFICHAGE
     ========================================================= */

  return (
    <div className="flex h-[calc(100dvh-8rem)] min-h-[560px] flex-col overflow-hidden md:h-[calc(100dvh-9rem)]">
      {/* =====================================================
          ERREUR GLOBALE
          ===================================================== */}

      {erreur && (
        <div
          role="alert"
          className="mb-3 rounded-xl border border-brique/40 bg-brique/10 px-4 py-2.5 text-sm text-brique"
        >
          {erreur}
        </div>
      )}

      {/* =====================================================
          GRILLE : LISTE | CONVERSATION | DÉTAILS
          ===================================================== */}

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-ink/10 bg-paper-light shadow-sm">
        {/* =================================================
            COLONNE GAUCHE — LISTE DES CONVERSATIONS
            ================================================= */}

        <aside
          className={clsx(
            "w-full shrink-0 flex-col border-r border-ink/10 bg-paper lg:flex lg:w-[320px]",
            voirConversationMobile ? "hidden" : "flex",
          )}
        >
          {/* En-tête */}
          <div className="flex items-center gap-2.5 border-b border-ink/10 px-4 py-4">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary"
              aria-hidden="true"
            >
              <MessageCircle size={18} />
            </span>

            <div className="min-w-0 flex-1">
              <h1 className="font-display text-lg font-semibold leading-tight text-ink">
                Messages
              </h1>

              <p className="text-xs text-ink-soft">
                {compteNonLus > 0
                  ? `${compteNonLus} conversation${compteNonLus > 1 ? "s" : ""} avec des non lus`
                  : `${contacts.length} conversation${contacts.length > 1 ? "s" : ""}`}
              </p>
            </div>
          </div>

          {/* Recherche */}
          {contacts.length > 0 && (
            <div className="px-3 pt-3">
              <div className="relative">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft/60"
                  aria-hidden="true"
                />
                <Input
                  type="search"
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  placeholder="Rechercher…"
                  aria-label="Rechercher une conversation"
                  className="w-full rounded-full border-ink/20 bg-paper-light py-2 pl-9 pr-3 text-sm"
                />
              </div>
            </div>
          )}

          {/* Onglets : Toutes / Non lues */}
          {contacts.length > 0 && (
            <div
              className="flex gap-2 px-3 pb-3 pt-2.5"
              role="tablist"
              aria-label="Filtrer les conversations"
            >
              {[
                { valeur: "toutes", label: "Toutes", compte: contacts.length },
                { valeur: "non_lus", label: "Non lues", compte: compteNonLus },
              ].map((onglet) => {
                const estActif = ongletMessages === onglet.valeur;

                return (
                  <button
                    key={onglet.valeur}
                    type="button"
                    role="tab"
                    aria-selected={estActif}
                    onClick={() => setOngletMessages(onglet.valeur)}
                    className={clsx(
                      "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors",
                      estActif
                        ? "border-ink bg-ink text-paper-light"
                        : "border-ink/20 bg-paper-light text-ink-soft hover:border-ink/50 hover:text-ink",
                    )}
                  >
                    {onglet.label}

                    <span
                      className={clsx(
                        "rounded-full px-1.5 py-px text-[10px] leading-none",
                        estActif
                          ? "bg-paper-light/20 text-paper-light"
                          : "bg-ink/10 text-ink-soft",
                      )}
                    >
                      {onglet.compte}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Liste défilante */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {chargement ? (
              <div className="space-y-2 p-3" aria-hidden="true">
                {[0, 1, 2, 3].map((index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 rounded-xl border border-ink/5 bg-paper-light p-3"
                  >
                    <Skeleton rond className="h-11 w-11" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-28" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : contacts.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary"
                  aria-hidden="true"
                >
                  <MessageCircle size={22} />
                </span>

                <p className="text-sm font-medium text-ink">
                  Aucune conversation pour l&apos;instant
                </p>

                <p className="text-xs leading-relaxed text-ink-soft/80">
                  La messagerie est disponible après l&apos;acceptation
                  d&apos;une candidature entre un client et un étudiant.
                  Le contact apparaît automatiquement ici, même si aucun
                  message n&apos;a encore été envoyé.
                </p>
              </div>
            ) : contactsAffiches.length === 0 ? (
              <div className="flex h-full items-center justify-center p-6 text-center">
                <p className="text-sm text-ink-soft">
                  {recherche.trim()
                    ? `Aucune conversation ne correspond à « ${recherche.trim()} »`
                    : "Aucune conversation avec des messages non lus."}
                </p>
              </div>
            ) : (
              <ul className="flex flex-col">
                {contactsAffiches.map((contact) => {
                  const estSelectionne =
                    contactActif?.id === contact.id;

                  return (
                    <li key={contact.id}>
                      <button
                        type="button"
                        onClick={() => selectionnerContact(contact)}
                        aria-current={estSelectionne ? "true" : undefined}
                        className={clsx(
                          "flex w-full cursor-pointer items-center gap-3 border-b border-ink/5 px-4 py-3 text-left transition-colors",
                          estSelectionne
                            ? "bg-primary-soft"
                            : "hover:bg-ink/[0.04]",
                        )}
                      >
                        <span className="relative shrink-0">
                          <Avatar
                            nom={contact.nom}
                            photoUrl={contact.photoUrl}
                            size={44}
                          />

                          {contact.nonLus > 0 && (
                            <span
                              className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brique px-1 font-mono text-[9px] font-bold leading-none text-paper-light ring-2 ring-paper"
                              title={`${contact.nonLus} message(s) non lu(s)`}
                              aria-label={`${contact.nonLus} message(s) non lu(s)`}
                            >
                              {contact.nonLus > 9 ? "9+" : contact.nonLus}
                            </span>
                          )}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span
                              className={clsx(
                                "truncate text-sm text-ink",
                                contact.nonLus > 0
                                  ? "font-semibold"
                                  : "font-medium",
                              )}
                            >
                              {contact.nom}
                            </span>

                            {contact.dernierDate &&
                              !contact.conversationVide && (
                                <span className="shrink-0 text-[10px] font-mono text-ink-soft/60">
                                  {formaterDateListe(contact.dernierDate)}
                                </span>
                              )}
                          </span>

                          <span
                            className={clsx(
                              "mt-0.5 block truncate text-xs",
                              contact.nonLus > 0
                                ? "text-ink-soft"
                                : "text-ink-soft/70",
                            )}
                          >
                            {contact.conversationVide
                              ? "Nouvelle conversation"
                              : `${contact.dernierEstMoi ? "Vous : " : ""}${contact.dernierContenu}`}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* =================================================
            COLONNE CENTRALE — CONVERSATION
            ================================================= */}

        <section
          className={clsx(
            "min-w-0 flex-1 flex-col bg-paper-light lg:flex",
            voirConversationMobile ? "flex" : "hidden",
          )}
        >
          {!contactActif ? (
            /*
             * Aucune conversation sélectionnée : état d'accueil.
             */
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <span
                className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary"
                aria-hidden="true"
              >
                <MessageCircle size={26} />
              </span>

              <p className="font-display text-lg font-semibold text-ink">
                Sélectionnez une conversation
              </p>

              <p className="max-w-sm text-sm text-ink-soft/80">
                Choisissez un contact dans la liste pour afficher vos
                échanges.
              </p>
            </div>
          ) : (
            <>
              {/* En-tête de conversation */}
              <header className="flex items-center gap-3 border-b border-ink/10 bg-paper-light px-4 py-3">
                <button
                  type="button"
                  onClick={fermerConversationMobile}
                  aria-label="Retour à la liste des conversations"
                  className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink lg:hidden"
                >
                  <ArrowLeft size={18} />
                </button>

                <Avatar
                  nom={contactActif.nom}
                  photoUrl={autreUtilisateur?.photoUrl}
                  size={40}
                  href={profilHref ?? undefined}
                  className="hidden sm:inline-flex"
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-base font-semibold leading-tight text-ink">
                    {contactActif.nom}
                  </p>

                  <p className="text-xs text-ink-soft">
                    {autreUtilisateur
                      ? roleLabel(autreUtilisateur.role ?? "client")
                      : "Utilisateur Kianja"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={gererBoutonMenu}
                  aria-label="Détails de la conversation"
                  title="Détails de la conversation (mission, profil, pièces jointes)"
                  className={clsx(
                    "inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors",
                    panneauVisible
                      ? "bg-primary-soft text-primary"
                      : "text-ink-soft hover:bg-ink/5 hover:text-ink",
                  )}
                >
                  <MoreVertical size={18} />
                </button>
              </header>

              {/* Bandeau contexte mission (données réelles) */}
              {missionAffichee && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-ink/10 bg-paper px-4 py-2.5 text-xs">
                  <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-soft">
                    <Briefcase size={13} aria-hidden="true" />
                    Mission
                  </span>

                  <Link
                    href={`/missions/${missionAffichee.id}`}
                    className="max-w-full truncate font-medium text-ink underline-offset-2 hover:underline"
                  >
                    {missionAffichee.titre}
                  </Link>

                  <span className="text-ink-soft">
                    Statut&nbsp;:{" "}
                    <span className="font-medium text-ink">
                      {statutMissionLabel[missionAffichee.statut] ??
                        missionAffichee.statut}
                    </span>
                  </span>

                  <span className="text-ink-soft">
                    Budget&nbsp;:{" "}
                    <span className="font-medium text-ink">
                      {formatArgent(missionAffichee.budget)}
                    </span>
                  </span>

                  <Link
                    href={`/missions/${missionAffichee.id}`}
                    className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/30 bg-primary-soft px-2.5 py-1 font-medium text-primary transition-colors hover:border-primary/60"
                  >
                    Voir la mission
                    <ExternalLink size={12} aria-hidden="true" />
                  </Link>
                </div>
              )}

              {/* Fil des messages */}
              <div
                ref={zoneMessagesRef}
                className="min-h-0 flex-1 space-y-1.5 overflow-y-auto bg-paper px-4 py-4"
              >
                {chargementFil ? (
                  <div className="flex h-full items-center justify-center gap-2 text-sm text-ink-soft">
                    <Loader2
                      size={16}
                      className="animate-spin"
                      aria-hidden="true"
                    />
                    Chargement de la conversation…
                  </div>
                ) : fil.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                    <p className="text-sm text-ink-soft">
                      Aucun message dans cette conversation.
                    </p>

                    <p className="text-xs text-ink-soft/70">
                      Envoyez le premier message pour démarrer les échanges.
                    </p>
                  </div>
                ) : (
                  fil.map((message, index) => {
                    const estMoi =
                      message.expediteurId === utilisateur?.id;

                    const nouveauJour =
                      index === 0 ||
                      !estMemeJournee(
                        fil[index - 1].dateEnvoi,
                        message.dateEnvoi,
                      );

                    return (
                      <div key={message.id}>
                        {nouveauJour && (
                          <div className="flex justify-center py-2">
                            <span className="rounded-full bg-ink/5 px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-ink-soft/70">
                              {formaterJourSeparateur(message.dateEnvoi)}
                            </span>
                          </div>
                        )}

                        <div
                          className={clsx(
                            "group flex w-full items-end gap-2",
                            estMoi ? "justify-end" : "justify-start",
                          )}
                        >
                          {!estMoi && (
                            <Avatar
                              nom={
                                message.expediteur?.nom ?? contactActif.nom
                              }
                              photoUrl={
                                message.expediteur?.photoUrl ??
                                autreUtilisateur?.photoUrl
                              }
                              size={26}
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
                                    {message.contenu}
                                  </p>
                                )}

                                {message.pieceJointeUrl && (
                                  <div
                                    className={clsx(
                                      message.contenu ? "mt-2" : "",
                                      estMoi &&
                                        "[&_a]:border-paper-light/40 [&_a]:bg-paper-light/10 [&_a]:text-paper-light [&_a:hover]:bg-paper-light/20",
                                    )}
                                  >
                                    <PieceJointeAffichage
                                      url={message.pieceJointeUrl}
                                      nom={message.pieceJointeNom}
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
                                {formaterHeure(message.dateEnvoi)}
                              </span>

                              {estMoi &&
                                !message.estSupprime &&
                                (message.estLu ? (
                                  <CheckCheck
                                    size={13}
                                    aria-label="Message lu"
                                  />
                                ) : (
                                  <Check
                                    size={13}
                                    aria-label="Message envoyé"
                                  />
                                ))}
                            </div>

                            {estMoi && !message.estSupprime && (
                              <button
                                type="button"
                                onClick={() =>
                                  supprimerMessage(message.id)
                                }
                                disabled={
                                  messageEnSuppression === message.id
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
                  })
                )}
              </div>

              {/* Zone de saisie (fixe en bas de la conversation) */}
              <form
                ref={formEnvoiRef}
                onSubmit={envoyer}
                className="border-t border-ink/10 bg-paper-light px-4 py-3"
              >
                <div className="flex items-end gap-2">
                  <SelecteurPieceJointe
                    compact
                    valeur={pieceJointe}
                    onChange={setPieceJointe}
                    disabled={envoi}
                  />

                  <Textarea
                    ref={textareaRef}
                    rows={1}
                    value={nouveauMessage}
                    onChange={(e) =>
                      setNouveauMessage(e.target.value)
                    }
                    onKeyDown={gererToucheTextarea}
                    placeholder="Écrivez votre message…"
                    aria-label="Votre message"
                    className="max-h-[140px] min-h-[40px] flex-1 resize-none rounded-2xl py-2"
                    disabled={envoi}
                  />

                  <button
                    type="submit"
                    disabled={envoi || !nouveauMessage.trim()}
                    aria-label="Envoyer le message"
                    className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-paper-light shadow-sm transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {envoi ? (
                      <Loader2
                        size={17}
                        className="animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <Send size={16} aria-hidden="true" />
                    )}
                  </button>
                </div>

                {erreurEnvoi && (
                  <p role="alert" className="mt-2 text-xs text-brique">
                    {erreurEnvoi}
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
            COLONNE DROITE — DÉTAILS (mission, profil, PJ)
            ================================================= */}

        {contactActif && panneauVisible && (
          <aside className="hidden w-[330px] shrink-0 flex-col gap-4 overflow-y-auto border-l border-ink/10 bg-paper p-4 xl:flex">
            <PanneauDetailsConversation
              contact={contactActif}
              autreUtilisateur={autreUtilisateur}
              profilEtudiant={profilEtudiantAffiche}
              profilClient={profilClientAffiche}
              profilHref={profilHref}
              missionAffichee={missionAffichee}
              piecesJointes={piecesJointes}
              utilisateurId={utilisateur?.id ?? null}
            />
          </aside>
        )}
      </div>

      {/* =====================================================
          PANNEAU DE DÉTAILS EN SUPERPOSITION (< xl)
          ===================================================== */}

      {contactActif && detailsOuverts && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Détails de la conversation"
          className="fixed inset-0 z-50 flex justify-end bg-ink/50 xl:hidden"
          onClick={() => setDetailsOuverts(false)}
        >
          <div
            className="flex h-full w-full max-w-sm flex-col border-l border-ink/10 bg-paper shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-ink/10 px-4 py-3">
              <h2 className="font-display text-base font-semibold text-ink">
                Détails de la conversation
              </h2>

              <button
                type="button"
                onClick={() => setDetailsOuverts(false)}
                aria-label="Fermer les détails"
                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              <PanneauDetailsConversation
                contact={contactActif}
                autreUtilisateur={autreUtilisateur}
                profilEtudiant={profilEtudiantAffiche}
                profilClient={profilClientAffiche}
                profilHref={profilHref}
                missionAffichee={missionAffichee}
                piecesJointes={piecesJointes}
                utilisateurId={utilisateur?.id ?? null}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   PANNEAU DE DÉTAILS (mission · correspondant · pièces jointes)
   ========================================================= */

/*
 * N'affiche QUE des données réelles : une section absente signifie
 * simplement que la donnée n'existe pas (aucune conversation liée à
 * une mission, aucune pièce jointe partagée…).
 */
function PanneauDetailsConversation({
  contact,
  autreUtilisateur,
  profilEtudiant,
  profilClient,
  profilHref,
  missionAffichee,
  piecesJointes,
  utilisateurId,
}: {
  contact: { id: string; nom: string };
  autreUtilisateur: NonNullable<
    MessageAvecUtilisateurs["expediteur"]
  > | null;
  profilEtudiant: EtudiantProfile | null;
  profilClient: ClientProfile | null;
  profilHref: string | null;
  missionAffichee: Mission | null;
  piecesJointes: PieceJointeConversation[];
  utilisateurId: string | null;
}) {
  const noteEtudiant =
    profilEtudiant?.noteMoyenne != null
      ? Number(profilEtudiant.noteMoyenne)
      : null;

  const missionClientNom = missionAffichee?.client
    ? missionAffichee.client.utilisateur?.id === utilisateurId
      ? "Vous"
      : missionAffichee.client.utilisateur?.nom ?? null
    : null;

  return (
    <>
      {missionAffichee && (
        <section className="rounded-xl border border-ink/10 bg-paper-light p-4 shadow-sm">
          <h3 className="mb-3 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-soft">
            <Briefcase size={13} aria-hidden="true" />
            Mission liée
          </h3>

          {missionAffichee.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={getFileUrl(missionAffichee.imageUrl) ?? ""}
              alt=""
              className="mb-3 h-28 w-full rounded-lg border border-ink/10 object-cover"
            />
          )}

          <p className="font-display text-sm font-semibold leading-snug text-ink">
            {missionAffichee.titre}
          </p>

          <dl className="mt-3 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-ink-soft/70">Statut</dt>
              <dd className="font-medium text-ink">
                {statutMissionLabel[missionAffichee.statut] ??
                  missionAffichee.statut}
              </dd>
            </div>

            <div className="flex items-center justify-between gap-2">
              <dt className="text-ink-soft/70">Budget</dt>
              <dd className="font-medium text-ink">
                {formatArgent(missionAffichee.budget)}
              </dd>
            </div>

            <div className="flex items-center justify-between gap-2">
              <dt className="text-ink-soft/70">Date limite</dt>
              <dd className="font-medium text-ink">
                {formatDate(missionAffichee.dateLimite)}
              </dd>
            </div>

            {missionClientNom && (
              <div className="flex items-center justify-between gap-2">
                <dt className="text-ink-soft/70">Client</dt>
                <dd className="max-w-[60%] truncate font-medium text-ink">
                  {missionClientNom}
                </dd>
              </div>
            )}
          </dl>

          <Button
            href={`/missions/${missionAffichee.id}`}
            variant="ghost"
            size="sm"
            className="mt-3 w-full justify-center gap-1.5"
          >
            Voir la mission
            <ExternalLink size={13} aria-hidden="true" />
          </Button>
        </section>
      )}

      <section className="rounded-xl border border-ink/10 bg-paper-light p-4 shadow-sm">
        <h3 className="mb-3 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-soft">
          <User size={13} aria-hidden="true" />
          Correspondant
        </h3>

        <div className="flex items-center gap-3">
          <Avatar
            nom={contact.nom}
            photoUrl={autreUtilisateur?.photoUrl}
            size={48}
          />

          <div className="min-w-0">
            <p className="truncate font-display text-sm font-semibold text-ink">
              {contact.nom}
            </p>

            <p className="text-xs text-ink-soft">
              {autreUtilisateur
                ? roleLabel(autreUtilisateur.role ?? "client")
                : "Utilisateur Kianja"}
            </p>

            {noteEtudiant != null && !Number.isNaN(noteEtudiant) && (
              <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-ink-soft">
                <Star size={12} className="text-ocre" aria-hidden="true" />
                {noteEtudiant.toFixed(1)}/5
              </p>
            )}
          </div>
        </div>

        {profilEtudiant?.universite && (
          <p className="mt-2.5 text-xs text-ink-soft/80">
            Université&nbsp;: {profilEtudiant.universite}
          </p>
        )}

        {profilClient?.nomEntreprise && (
          <p className="mt-2.5 text-xs text-ink-soft/80">
            Entreprise&nbsp;: {profilClient.nomEntreprise}
          </p>
        )}

        {profilHref && (
          <Button
            href={profilHref}
            variant="ghost"
            size="sm"
            className="mt-3 w-full justify-center gap-1.5"
          >
            Voir le profil
            <ExternalLink size={13} aria-hidden="true" />
          </Button>
        )}
      </section>

      {piecesJointes.length > 0 && (
        <section className="rounded-xl border border-ink/10 bg-paper-light p-4 shadow-sm">
          <h3 className="mb-3 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-soft">
            <FileText size={13} aria-hidden="true" />
            Pièces jointes ({piecesJointes.length})
          </h3>

          <ul className="space-y-2">
            {piecesJointes.map((piece) => (
              <li
                key={piece.url}
                className="rounded-lg border border-ink/10 bg-paper p-2.5"
              >
                <PieceJointeAffichage url={piece.url} nom={piece.nom} />

                <p className="mt-1.5 text-[10px] font-mono text-ink-soft/60">
                  {piece.auteur} · {formaterDateListe(piece.dateEnvoi)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
