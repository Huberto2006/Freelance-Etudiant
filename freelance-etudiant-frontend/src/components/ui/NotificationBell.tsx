"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  ChevronRight,
  X,
} from "lucide-react";

import { api } from "@/lib/api";
import type { NotificationItem } from "@/lib/types";
import { useSocket } from "@/lib/socket-context";

/**
 * Le type vient du catalogue central de types du projet
 * (@/lib/types) : meme structure que l'entite Notification du
 * backend, meme union TypeNotification. Le composant ne manipule
 * QUE des notifications provenant du systeme de notifications
 * (GET /notifications, socket notification:nouvelle) -- jamais
 * des messages.
 */
type Notification = NotificationItem;

function formatDate(date: string) {
  const valeur = new Date(date);
  if (Number.isNaN(valeur.getTime())) {
    return "";
  }
  const maintenant = Date.now();
  const difference = maintenant - valeur.getTime();
  const minutes = Math.floor(difference / 60000);
  if (minutes < 1) {
    return "À l'instant";
  }
  if (minutes < 60) {
    return `Il y a ${minutes} min`;
  }
  const heures = Math.floor(minutes / 60);
  if (heures < 24) {
    return `Il y a ${heures} h`;
  }
  const jours = Math.floor(heures / 24);
  if (jours < 7) {
    return `Il y a ${jours} j`;
  }
  return valeur.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getIcon(type: string) {
  const valeur = type.toLowerCase();
  if (valeur.includes("candidature")) return "📋";
  if (valeur.includes("message")) return "💬";
  if (valeur.includes("livraison")) return "📦";
  if (valeur.includes("paiement")) return "💰";
  if (valeur.includes("evaluation") || valeur.includes("évaluation")) return "⭐";
  if (valeur.includes("commentaire")) return "💬";
  if (valeur.includes("reaction") || valeur.includes("réaction")) return "👍";
  return "🔔";
}

export function NotificationBell() {
  const [total, setTotal] = useState(0);

  const [ouvert, setOuvert] = useState(false);

  const [notifications, setNotifications] =
    useState<Notification[]>([]);

  const [chargement, setChargement] =
    useState(false);

  const { socket } = useSocket();

  const containerRef =
    useRef<HTMLDivElement>(null);

  /**
   * ==========================================================
   * COMPTEUR INITIAL
   * ==========================================================
   *
   * On conserve exactement ton endpoint actuel.
   */

  useEffect(() => {
    let annule = false;

    api
      .get<{ total: number }>(
        "/notifications/non-lues/compteur",
      )
      .then((res) => {
        if (!annule) {
          setTotal(res.total);
        }
      })
      .catch(() => {});

    return () => {
      annule = true;
    };
  }, []);

  /**
   * ==========================================================
   * SOCKET.IO — NOUVELLE NOTIFICATION
   * ==========================================================
   *
   * Deux evenements DISTINCTS pousses par le backend :
   *
   * - notification:compteur -> met a jour le badge 🔔
   * - notification:nouvelle -> insere la notification dans le
   *   panneau s'il est deja ouvert (source : backend, apres
   *   enregistrement en base -- jamais derivee des messages).
   */

  useEffect(() => {
    if (!socket) return;

    function onCompteur(payload: {
      total: number;
    }) {
      setTotal(payload.total);
    }

    socket.on(
      "notification:compteur",
      onCompteur,
    );

    return () => {
      socket.off(
        "notification:compteur",
        onCompteur,
      );
    };
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    function onNouvelle(notification: Notification) {
      setNotifications((ancien) =>
        ancien.some((item) => item.id === notification.id)
          ? ancien
          : [notification, ...ancien].slice(0, 8),
      );
    }

    socket.on(
      "notification:nouvelle",
      onNouvelle,
    );

    return () => {
      socket.off(
        "notification:nouvelle",
        onNouvelle,
      );
    };
  }, [socket]);

  /**
   * ==========================================================
   * CHARGER LES NOTIFICATIONS
   * ==========================================================
   *
   * Le panneau est chargé uniquement lorsqu'on l'ouvre.
   */

  async function chargerNotifications() {
    setChargement(true);

    try {
      const res =
        await api.get<Notification[]>(
          "/notifications",
        );

      setNotifications(
        Array.isArray(res)
          ? res.slice(0, 8)
          : [],
      );
    } catch (error) {
      console.error(
        "Erreur chargement notifications :",
        error,
      );
    } finally {
      setChargement(false);
    }
  }

  /**
   * ==========================================================
   * OUVRIR / FERMER
   * ==========================================================
   */

  async function toggleNotifications() {
    const prochainEtat = !ouvert;

    setOuvert(prochainEtat);

    if (prochainEtat) {
      await chargerNotifications();
    }
  }

  /**
   * ==========================================================
   * CLIC À L'EXTÉRIEUR
   * ==========================================================
   */

  useEffect(() => {
    function handleClickOutside(
      event: MouseEvent,
    ) {
      if (
        containerRef.current &&
        !containerRef.current.contains(
          event.target as Node,
        )
      ) {
        setOuvert(false);
      }
    }

    function handleEscape(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        setOuvert(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside,
    );

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );

      document.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, []);

  /**
   * ==========================================================
   * MARQUER UNE NOTIFICATION COMME LUE
   * ==========================================================
   *
   * On met à jour l'interface immédiatement.
   */

  async function marquerCommeLue(
    notification: Notification,
  ) {
    if (notification.estLue) {
      return;
    }

    setNotifications((ancien) =>
      ancien.map((item) =>
        item.id === notification.id
          ? {
              ...item,
              estLue: true,
            }
          : item,
      ),
    );

    setTotal((ancien) =>
      Math.max(0, ancien - 1),
    );

    try {
      await api.patch(
        `/notifications/${notification.id}/lue`,
        {},
      );
    } catch (error) {
      console.error(
        "Erreur marquage notification :",
        error,
      );

      /**
       * En cas d'erreur, on recharge
       * le compteur réel.
       */
      api
        .get<{ total: number }>(
          "/notifications/non-lues/compteur",
        )
        .then((res) => {
          setTotal(res.total);
        })
        .catch(() => {});
    }
  }

  /**
   * ==========================================================
   * TOUT MARQUER COMME LU
   * ==========================================================
   */

  async function marquerToutCommeLu() {
    if (total === 0) {
      return;
    }

    setNotifications((ancien) =>
      ancien.map((item) => ({
        ...item,
        estLue: true,
      })),
    );

    setTotal(0);

    try {
      await api.patch(
        "/notifications/lire-tout",
        {},
      );
    } catch (error) {
      console.error(
        "Erreur marquage notifications :",
        error,
      );

      /**
       * Récupération du vrai compteur
       * si l'appel échoue.
       */
      api
        .get<{ total: number }>(
          "/notifications/non-lues/compteur",
        )
        .then((res) => {
          setTotal(res.total);
        })
        .catch(() => {});
    }
  }

  /**
   * ==========================================================
   * RENDU
   * ==========================================================
   */

  return (
    <div
      ref={containerRef}
      className="relative"
    >
      {/* =====================================================
          BOUTON NOTIFICATION
      ===================================================== */}

      <button
        type="button"
        onClick={
          toggleNotifications
        }
        title="Notifications"
        aria-label={`Notifications${
          total > 0
            ? ` (${total} non lues)`
            : ""
        }`}
        aria-expanded={ouvert}
        aria-haspopup="dialog"
        className={`
          relative
          flex
          h-9
          w-9
          items-center
          justify-center
          rounded-full
          transition-colors

          ${
            ouvert
              ? "bg-ink/10 text-ink"
              : "text-ink-soft hover:bg-ink/5 hover:text-ink"
          }
        `}
      >
        <Bell
          size={18}
          strokeWidth={
            total > 0 ? 2.4 : 2
          }
        />

        {/* Badge */}

        {total > 0 && (
          <span
            className="
              absolute
              right-0.5
              top-0.5
              flex
              h-4
              min-w-4
              items-center
              justify-center
              rounded-full
              bg-brique
              px-1
              font-mono
              text-[9px]
              font-bold
              leading-none
              text-paper-light
              ring-2
              ring-paper
            "
          >
            {total > 9
              ? "9+"
              : total}
          </span>
        )}
      </button>

      {/* =====================================================
          PANNEAU FLOTTANT
      ===================================================== */}

      {ouvert && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="
            absolute
            right-0
            top-full
            z-[100]
            mt-3
            w-[calc(100vw-2rem)]
            max-w-[390px]
            overflow-hidden
            rounded-2xl
            border
            border-ink/10
            bg-paper
            shadow-2xl
            ring-1
            ring-black/5
          "
        >
          {/* =================================================
              HEADER
          ================================================= */}

          <div
            className="
              flex
              items-center
              justify-between
              border-b
              border-ink/10
              px-4
              py-3.5
            "
          >
            <div>
              <div
                className="
                  flex
                  items-center
                  gap-2
                "
              >
                <h2
                  className="
                    text-sm
                    font-semibold
                    text-ink
                  "
                >
                  Notifications
                </h2>

                {total > 0 && (
                  <span
                    className="
                      rounded-full
                      bg-brique/10
                      px-2
                      py-0.5
                      font-mono
                      text-[9px]
                      font-semibold
                      text-brique
                    "
                  >
                    {total}
                  </span>
                )}
              </div>

              <p
                className="
                  mt-0.5
                  text-[10px]
                  text-ink-soft
                "
              >
                Vos dernières
                notifications
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setOuvert(false)
              }
              aria-label="Fermer"
              className="
                flex
                h-8
                w-8
                items-center
                justify-center
                rounded-full
                text-ink-soft
                transition-colors
                hover:bg-ink/5
                hover:text-ink
              "
            >
              <X size={16} />
            </button>
          </div>

          {/* =================================================
              ACTION TOUT LIRE
          ================================================= */}

          {total > 0 && (
            <div
              className="
                flex
                justify-end
                border-b
                border-ink/5
                px-4
                py-2
              "
            >
              <button
                type="button"
                onClick={
                  marquerToutCommeLu
                }
                className="
                  flex
                  items-center
                  gap-1.5
                  text-[10px]
                  font-medium
                  text-ink-soft
                  transition-colors
                  hover:text-ink
                "
              >
                <CheckCheck
                  size={14}
                />

                Tout marquer comme lu
              </button>
            </div>
          )}

          {/* =================================================
              LISTE
          ================================================= */}

          <div
            className="
              max-h-[430px]
              overflow-y-auto
            "
          >
            {chargement ? (
              <div
                className="
                  flex
                  min-h-[180px]
                  items-center
                  justify-center
                "
              >
                <div
                  className="
                    h-6
                    w-6
                    animate-spin
                    rounded-full
                    border-2
                    border-ink/10
                    border-t-ink
                  "
                />
              </div>
            ) : notifications.length ===
              0 ? (
              <div
                className="
                  px-5
                  py-12
                  text-center
                "
              >
                <div
                  className="
                    mx-auto
                    mb-3
                    flex
                    h-12
                    w-12
                    items-center
                    justify-center
                    rounded-full
                    bg-ink/5
                  "
                >
                  <Bell
                    size={21}
                    className="
                      text-ink-soft/50
                    "
                  />
                </div>

                <p
                  className="
                    text-sm
                    font-medium
                    text-ink
                  "
                >
                  Aucune notification
                </p>

                <p
                  className="
                    mt-1
                    text-xs
                    text-ink-soft
                  "
                >
                  Vous êtes à jour.
                </p>
              </div>
            ) : (
              <div>
                {notifications.map(
                  (notification) => {
                    const contenu = (
                      <>
                        {/* Icône */}

                        <div
                          className={`
                            flex
                            h-9
                            w-9
                            shrink-0
                            items-center
                            justify-center
                            rounded-full
                            text-base

                            ${
                              notification.estLue
                                ? "bg-ink/5"
                                : "bg-ocre/10"
                            }
                          `}
                        >
                          {getIcon(
                            notification.type,
                          )}
                        </div>

                        {/* Texte */}

                        <div className="min-w-0 flex-1">
                          <div
                            className="
                              flex
                              items-start
                              gap-2
                            "
                          >
                            <p
                              className={`
                                flex-1
                                text-xs
                                leading-5

                                ${
                                  notification.estLue
                                    ? "font-medium text-ink-soft"
                                    : "font-semibold text-ink"
                                }
                              `}
                            >
                              {
                                notification.titre
                              }
                            </p>

                            {!notification.estLue && (
                              <span
                                className="
                                  mt-1.5
                                  h-2
                                  w-2
                                  shrink-0
                                  rounded-full
                                  bg-brique
                                "
                              />
                            )}
                          </div>

                          <p
                            className="
                              mt-0.5
                              line-clamp-2
                              text-[11px]
                              leading-4
                              text-ink-soft
                            "
                          >
                            {
                              notification.message
                            }
                          </p>

                          <p
                            className="
                              mt-1.5
                              font-mono
                              text-[9px]
                              uppercase
                              tracking-wide
                              text-ink-soft/50
                            "
                          >
                            {formatDate(
                              notification.dateCreation,
                            )}
                          </p>
                        </div>
                      </>
                    );

                    if (
                      notification.lienUrl
                    ) {
                      return (
                        <Link
                          key={
                            notification.id
                          }
                          href={
                            notification.lienUrl
                          }
                          onClick={() =>
                            marquerCommeLue(
                              notification,
                            )
                          }
                          className={`
                            flex
                            gap-3
                            border-b
                            border-ink/5
                            px-4
                            py-3
                            text-left
                            transition-colors

                            ${
                              notification.estLue
                                ? "hover:bg-ink/[0.025]"
                                : "bg-ocre/[0.025] hover:bg-ocre/[0.05]"
                            }
                          `}
                        >
                          {contenu}
                        </Link>
                      );
                    }

                    return (
                      <button
                        key={
                          notification.id
                        }
                        type="button"
                        onClick={() =>
                          marquerCommeLue(
                            notification,
                          )
                        }
                        className={`
                          flex
                          w-full
                          gap-3
                          border-b
                          border-ink/5
                          px-4
                          py-3
                          text-left
                          transition-colors

                          ${
                            notification.estLue
                              ? "hover:bg-ink/[0.025]"
                              : "bg-ocre/[0.025] hover:bg-ocre/[0.05]"
                          }
                        `}
                      >
                        {contenu}
                      </button>
                    );
                  },
                )}
              </div>
            )}
          </div>

          {/* =================================================
              FOOTER
          ================================================= */}

          <div
            className="
              border-t
              border-ink/10
              p-2
            "
          >
            <Link
              href="/tableau-de-bord/notifications"
              onClick={() =>
                setOuvert(false)
              }
              className="
                flex
                w-full
                items-center
                justify-center
                gap-1.5
                rounded-lg
                px-3
                py-2.5
                text-xs
                font-medium
                text-ink-soft
                transition-colors
                hover:bg-ink/5
                hover:text-ink
              "
            >
              Voir toutes les notifications

              <ChevronRight
                size={14}
              />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
