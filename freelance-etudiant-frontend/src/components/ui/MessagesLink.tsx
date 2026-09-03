"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useSocket } from "@/lib/socket-context";
import { useAuth } from "@/lib/auth-context";

/**
 * Composant de lien vers la messagerie dans la Navbar.
 *
 * Responsabilité exclusive : afficher l'icône 💬 Messages et le
 * badge du nombre de MESSAGES NON LUS (GET /messages/non-lus/compteur,
 * socket message:compteur).
 *
 * Totalement indépendant du système de notifications 🔔 (table notifications).
 */
export function MessagesLink() {
  const [total, setTotal] = useState(0);
  const { socket } = useSocket();
  const { utilisateur } = useAuth();
  const pathname = usePathname();

  // 1. Récupération initiale du compteur de messages non lus
  useEffect(() => {
    if (!utilisateur) {
      return;
    }

    let annule = false;

    api
      .get<{ total: number }>("/messages/non-lus/compteur")
      .then((res) => {
        if (!annule) {
          setTotal(res.total);
        }
      })
      .catch(() => {});

    return () => {
      annule = true;
    };
  }, [utilisateur, pathname]);

  // 2. Synchronisation en temps réel via Socket.IO (événement message:compteur)
  useEffect(() => {
    if (!socket) return;

    function onCompteur(payload: { total: number }) {
      setTotal(payload.total);
    }

    socket.on("message:compteur", onCompteur);

    return () => {
      socket.off("message:compteur", onCompteur);
    };
  }, [socket]);

  const estActif = pathname === "/tableau-de-bord/messages";

  return (
    <Link
      href="/tableau-de-bord/messages"
      aria-label={`Messages${total > 0 ? ` (${total} non lus)` : ""}`}
      title="Messages"
      className={`
        relative
        flex
        h-9
        w-9
        items-center
        justify-center
        rounded-lg
        transition-colors
        ${
          estActif
            ? "bg-ink/5 text-ink"
            : "text-ink-soft hover:bg-ink/5 hover:text-ink"
        }
      `}
    >
      <MessageCircle
        size={18}
        strokeWidth={total > 0 ? 2.4 : 2}
      />

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
          {total > 9 ? "9+" : total}
        </span>
      )}
    </Link>
  );
}

