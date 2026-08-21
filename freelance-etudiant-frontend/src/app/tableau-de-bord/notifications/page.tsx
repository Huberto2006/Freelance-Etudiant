"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, BellOff, CheckCheck } from "lucide-react";
import { api } from "@/lib/api";
import type { NotificationItem } from "@/lib/types";
import { formatDateCourte } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { NoticeCard, PageHeader } from "@/components/ui/Notice";
import { clsx } from "clsx";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [chargement, setChargement] = useState(true);

  const charger = useCallback(() => {
    api
      .get<NotificationItem[]>("/notifications")
      .then(setNotifications)
      .finally(() => setChargement(false));
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  async function marquerLue(notification: NotificationItem) {
    if (notification.estLue) return;
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, estLue: true } : n)),
    );
    await api.patch(`/notifications/${notification.id}/lue`);
  }

  async function toutMarquerLu() {
    setNotifications((prev) => prev.map((n) => ({ ...n, estLue: true })));
    await api.patch("/notifications/lire-tout");
  }

  const nonLues = notifications.filter((n) => !n.estLue).length;

  return (
    <div className="mx-auto max-w-2xl px-5 py-14">
      <div className="flex items-center justify-between gap-4 mb-8">
        <PageHeader icon={Bell} eyebrow="Suivi" title="Notifications" className="mb-0" />
        {nonLues > 0 && (
          <Button variant="secondary" className="gap-2 shrink-0" onClick={toutMarquerLu}>
            <CheckCheck size={15} />
            Tout marquer lu
          </Button>
        )}
      </div>

      {chargement ? (
        <p className="text-sm text-ink-soft">Chargement…</p>
      ) : notifications.length === 0 ? (
        <NoticeCard className="flex flex-col items-center gap-3 py-10 text-center">
          <BellOff size={28} className="text-ink-soft/50" />
          <p className="text-sm text-ink-soft/70">
            Vous n&apos;avez pas encore de notification.
          </p>
        </NoticeCard>
      ) : (
        <div className="flex flex-col gap-3">
          {notifications.map((notification) => {
            const contenu = (
              <NoticeCard
                className={clsx(
                  "flex items-start gap-3 transition-colors",
                  !notification.estLue && "border-ocre-dark/50 bg-ocre/5",
                )}
              >
                <span
                  className={clsx(
                    "mt-1 h-2 w-2 shrink-0 rounded-full",
                    notification.estLue ? "bg-ink/15" : "bg-ocre-dark",
                  )}
                  aria-hidden="true"
                />
                <div className="flex-1">
                  <p className="font-display font-medium">{notification.titre}</p>
                  <p className="text-sm text-ink-soft mt-0.5">{notification.message}</p>
                  <p className="text-xs font-mono text-ink-soft/60 mt-1.5">
                    {formatDateCourte(notification.dateCreation)}
                  </p>
                </div>
              </NoticeCard>
            );

            return (
              <div key={notification.id} onClick={() => marquerLue(notification)}>
                {notification.lienUrl ? (
                  <Link href={notification.lienUrl}>{contenu}</Link>
                ) : (
                  contenu
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
