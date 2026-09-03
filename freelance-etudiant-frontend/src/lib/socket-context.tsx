"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "./auth-context";
import { getApiOrigin, getToken } from "./api";

interface SocketContextValue {
  socket: Socket | null;
  connecte: boolean;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  connecte: false,
});

/**
 * Fournisseur Socket.IO centralisé : une seule connexion partagée par
 * toute l'application, pilotée par l'état d'authentification.
 *
 * - Se connecte dès qu'un utilisateur est authentifié (jeton disponible).
 * - Se déconnecte proprement à la déconnexion (évite de laisser un socket
 *   authentifié "orphelin" ouvert après un logout).
 * - La reconnexion automatique après coupure réseau est gérée nativement
 *   par socket.io-client (reconnection: true par défaut).
 */
export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { utilisateur } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connecte, setConnecte] = useState(false);

  useEffect(() => {
    if (!utilisateur) return;

    const token = getToken();
    if (!token) return;

    const nouveauSocket = io(getApiOrigin(), {
      auth: { token },
      withCredentials: true,
    });

    nouveauSocket.on("connect", () => setConnecte(true));
    nouveauSocket.on("disconnect", () => setConnecte(false));

    // Differre la mise a jour d'etat hors du corps synchrone de l'effet
    // (react-hooks/set-state-in-effect) : la connexion socket.io, elle,
    // est creee et nettoyee de facon synchrone dans l'effet.
    void Promise.resolve().then(() => {
      setSocket(nouveauSocket);
    });

    return () => {
      nouveauSocket.disconnect();
      setSocket(null);
      setConnecte(false);
    };
    // On ne dépend que de l'identité de l'utilisateur : un changement de
    // rôle/nom ne doit pas rouvrir la connexion.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [utilisateur?.id]);

  return (
    <SocketContext.Provider value={{ socket, connecte }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextValue {
  return useContext(SocketContext);
}
