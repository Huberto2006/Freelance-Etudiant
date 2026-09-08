"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  BellOff,
  CheckCheck,
  Trash2,
} from "lucide-react";

import { api, ApiError } from "@/lib/api";
import type { NotificationItem } from "@/lib/types";
import { formatDateCourte } from "@/lib/format";

import { Button } from "@/components/ui/Button";
import {
  NoticeCard,
  PageHeader,
} from "@/components/ui/Notice";
import { BoutonRetour } from "@/components/ui/BoutonRetour";
import { SousNavigation } from "@/components/ui/SousNavigation";

import { clsx } from "clsx";

export default function NotificationsPage() {
  const [
    notifications,
    setNotifications,
  ] = useState<NotificationItem[]>([]);

  // Sous-menu actif : Toutes / Non lues / Lues
  const [ongletActif, setOngletActif] = useState(
    "toutes",
  );

  const [chargement, setChargement] =
    useState(true);

  const [erreur, setErreur] =
    useState<string | null>(null);

  // ==========================================================
  // CHARGEMENT INITIAL
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    async function chargerInitial() {
      try {
        setErreur(null);

        const data =
          await api.get<NotificationItem[]>(
            "/notifications",
          );

        if (!cancelled) {
          setNotifications(data);
        }
      } catch (error) {
        console.error(
          "Erreur lors du chargement des notifications :",
          error,
        );

        if (!cancelled) {
          setErreur(
            error instanceof ApiError
              ? error.message
              : "Impossible de charger les notifications.",
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

  // ==========================================================
  // MARQUER UNE NOTIFICATION COMME LUE
  // ==========================================================

  async function marquerLue(
    notification: NotificationItem,
  ) {
    if (notification.estLue) {
      return;
    }

    // Mise à jour immédiate de l'interface
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notification.id
          ? {
              ...n,
              estLue: true,
            }
          : n,
      ),
    );

    try {
      await api.patch(
        `/notifications/${notification.id}/lue`,
      );
    } catch (error) {
      console.error(
        "Erreur lors du marquage de la notification :",
        error,
      );

      // En cas d'échec, on remet l'état initial
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id
            ? {
                ...n,
                estLue: false,
              }
            : n,
        ),
      );
    }
  }

  // ==========================================================
  // TOUT MARQUER COMME LU
  // ==========================================================

  async function toutMarquerLu() {
    const anciennesNotifications =
      notifications;

    // Mise à jour optimiste
    setNotifications((prev) =>
      prev.map((n) => ({
        ...n,
        estLue: true,
      })),
    );

    try {
      await api.patch(
        "/notifications/lire-tout",
      );
    } catch (error) {
      console.error(
        "Erreur lors du marquage global :",
        error,
      );

      setNotifications(
        anciennesNotifications,
      );
    }
  }

  // ==========================================================
  // SUPPRIMER UNE NOTIFICATION
  // Permission côté backend : la suppression est toujours
  // restreinte au destinataire connecté (un utilisateur ne
  // peut jamais supprimer la notification d'un autre).
  // ==========================================================

  async function supprimerNotification(id: string) {
    const anciennesNotifications = notifications;

    // Suppression optimiste
    setNotifications((prev) =>
      prev.filter((n) => n.id !== id),
    );

    try {
      await api.delete(`/notifications/${id}`);
    } catch (error) {
      console.error(
        "Erreur lors de la suppression de la notification :",
        error,
      );
      setNotifications(anciennesNotifications);
    }
  }

  // ==========================================================
  // TOUT SUPPRIMER
  // ==========================================================

  async function toutSupprimer() {
    if (
      !window.confirm(
        "Supprimer toutes vos notifications ? Cette action est définitive.",
      )
    ) {
      return;
    }

    const anciennesNotifications = notifications;
    setNotifications([]);

    try {
      await api.delete("/notifications/tout-supprimer");
    } catch (error) {
      console.error(
        "Erreur lors de la suppression globale :",
        error,
      );
      setNotifications(anciennesNotifications);
    }
  }

  const nonLues =
    notifications.filter(
      (n) => !n.estLue,
    ).length;

  // ==========================================================
  // FILTRAGE PAR ONGLET (Toutes / Non lues / Lues)
  // ==========================================================

  const notificationsFiltrees =
    ongletActif === "non_lues"
      ? notifications.filter((n) => !n.estLue)
      : ongletActif === "lues"
        ? notifications.filter((n) => n.estLue)
        : notifications;

  // ==========================================================
  // AFFICHAGE
  // ==========================================================

  return (
    <div className="mx-auto max-w-2xl px-5 py-14">
      <div className="mb-4">
        <BoutonRetour repli="/tableau-de-bord" forcer />
      </div>

      <div className="mb-8 flex items-center justify-between gap-4">
        <PageHeader
          icon={Bell}
          eyebrow="Suivi"
          title="Notifications"
          className="mb-0"
        />

        <div className="flex shrink-0 items-center gap-2">
          {nonLues > 0 && (
            <Button
              variant="secondary"
              className="gap-2"
              onClick={toutMarquerLu}
            >
              <CheckCheck size={15} />
              Tout marquer lu
            </Button>
          )}

          {notifications.length > 0 && (
            <Button
              variant="danger"
              className="gap-2"
              onClick={toutSupprimer}
            >
              <Trash2 size={15} />
              Tout supprimer
            </Button>
          )}
        </div>
      </div>

      {/* Sous-menus : Toutes / Non lues / Lues */}

      <SousNavigation
        onglets={[
          { valeur: "toutes", label: "Toutes", compte: notifications.length },
          { valeur: "non_lues", label: "Non lues", compte: nonLues },
          {
            valeur: "lues",
            label: "Lues",
            compte: notifications.length - nonLues,
          },
        ]}
        actif={ongletActif}
        onChanger={setOngletActif}
      />

      {/* Erreur */}

      {erreur && (
        <NoticeCard className="mb-6">
          <p className="text-sm text-brique">
            {erreur}
          </p>
        </NoticeCard>
      )}

      {/* Chargement */}

      {chargement ? (
        <p className="text-sm text-ink-soft">
          Chargement…
        </p>
      ) : notificationsFiltrees.length === 0 ? (
        <NoticeCard className="flex flex-col items-center gap-3 py-10 text-center">
          <BellOff
            size={28}
            className="text-ink-soft/50"
          />

          <p className="text-sm text-ink-soft/70">
            {ongletActif === "toutes"
              ? "Vous n'avez pas encore de notification."
              : ongletActif === "non_lues"
                ? "Aucune notification non lue."
                : "Aucune notification lue."}
          </p>
        </NoticeCard>
      ) : (
        <div className="flex flex-col gap-3">
          {notificationsFiltrees.map(
            (notification) => {
              const contenu = (
                <NoticeCard
                  className={clsx(
                    "flex items-start gap-3 transition-colors",
                    !notification.estLue &&
                      "border-ocre-dark/50 bg-ocre/5",
                  )}
                >
                  <span
                    className={clsx(
                      "mt-1 h-2 w-2 shrink-0 rounded-full",
                      notification.estLue
                        ? "bg-ink/15"
                        : "bg-ocre-dark",
                    )}
                    aria-hidden="true"
                  />

                  <div className="flex-1">
                    <p className="font-display font-medium">
                      {notification.titre}
                    </p>

                    <p className="mt-0.5 text-sm text-ink-soft">
                      {notification.message}
                    </p>

                    <p className="mt-1.5 text-xs font-mono text-ink-soft/60">
                      {formatDateCourte(
                        notification.dateCreation,
                      )}
                    </p>
                  </div>

                  {/* Suppression individuelle (sa propre notification) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      // Évite le marquage comme lu / navigation déclenchés
                      // par le conteneur parent.
                      e.stopPropagation();
                      e.preventDefault();
                      void supprimerNotification(
                        notification.id,
                      );
                    }}
                    aria-label={`Supprimer : ${notification.titre}`}
                    className="
                      shrink-0 cursor-pointer rounded-lg p-1.5
                      text-ink-soft/40 transition-colors
                      hover:bg-brique/10 hover:text-brique
                    "
                  >
                    <Trash2 size={14} />
                  </button>
                </NoticeCard>
              );

              /*
               * IMPORTANT :
               * On utilise directement l'URL fournie
               * par le backend.
               *
               * Exemple attendu :
               * /tableau-de-bord/livraisons?candidature=123
               */
              if (notification.lienUrl) {
                return (
                  <Link
                    key={notification.id}
                    href={notification.lienUrl}
                    onClick={() =>
                      marquerLue(
                        notification,
                      )
                    }
                    className="block"
                  >
                    {contenu}
                  </Link>
                );
              }

              return (
                <div
                  key={notification.id}
                  onClick={() =>
                    marquerLue(
                      notification,
                    )
                  }
                >
                  {contenu}
                </div>
              );
            },
          )}
        </div>
      )}
    </div>
  );
}