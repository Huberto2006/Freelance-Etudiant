"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  BellOff,
  CheckCheck,
} from "lucide-react";

import { api, ApiError } from "@/lib/api";
import type { NotificationItem } from "@/lib/types";
import { formatDateCourte } from "@/lib/format";

import { Button } from "@/components/ui/Button";
import {
  NoticeCard,
  PageHeader,
} from "@/components/ui/Notice";

import { clsx } from "clsx";

export default function NotificationsPage() {
  const [
    notifications,
    setNotifications,
  ] = useState<NotificationItem[]>([]);

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

  const nonLues =
    notifications.filter(
      (n) => !n.estLue,
    ).length;

  // ==========================================================
  // AFFICHAGE
  // ==========================================================

  return (
    <div className="mx-auto max-w-2xl px-5 py-14">
      <div className="mb-8 flex items-center justify-between gap-4">
        <PageHeader
          icon={Bell}
          eyebrow="Suivi"
          title="Notifications"
          className="mb-0"
        />

        {nonLues > 0 && (
          <Button
            variant="secondary"
            className="shrink-0 gap-2"
            onClick={toutMarquerLu}
          >
            <CheckCheck size={15} />
            Tout marquer lu
          </Button>
        )}
      </div>

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
      ) : notifications.length === 0 ? (
        <NoticeCard className="flex flex-col items-center gap-3 py-10 text-center">
          <BellOff
            size={28}
            className="text-ink-soft/50"
          />

          <p className="text-sm text-ink-soft/70">
            Vous n&apos;avez pas encore de
            notification.
          </p>
        </NoticeCard>
      ) : (
        <div className="flex flex-col gap-3">
          {notifications.map(
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