"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { api } from "@/lib/api";

/**
 * Cloche de notifications affichée dans la Navbar une fois connecté.
 * Interroge le compteur de non-lues toutes les 30s (pas de websocket
 * dans ce projet, un polling léger suffit pour l'usage académique).
 */
export function NotificationBell() {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let annule = false;

    function charger() {
      api
        .get<{ total: number }>("/notifications/non-lues/compteur")
        .then((res) => {
          if (!annule) setTotal(res.total);
        })
        .catch(() => {});
    }

    charger();
    const intervalle = setInterval(charger, 30_000);
    return () => {
      annule = true;
      clearInterval(intervalle);
    };
  }, []);

  return (
    <Link
      href="/tableau-de-bord/notifications"
      title="Notifications"
      aria-label={`Notifications${total > 0 ? ` (${total} non lues)` : ""}`}
      className="relative flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink"
    >
      <Bell size={18} />
      {total > 0 && (
        <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brique px-1 font-mono text-[10px] font-bold leading-none text-paper-light">
          {total > 9 ? "9+" : total}
        </span>
      )}
    </Link>
  );
}
