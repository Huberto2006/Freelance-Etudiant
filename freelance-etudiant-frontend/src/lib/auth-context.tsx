"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, getToken, setToken, setRefreshToken, clearTokens } from "./api";
import type { AuthResponse, Role, Utilisateur } from "./types";

interface RegisterPayload {
  nom: string;
  email: string;
  motDePasse: string;
  role: "etudiant" | "client";
  niveauEtude?: string;
  universite?: string;
  typeClient?: string;
  nomEntreprise?: string;
}

interface AuthContextValue {
  utilisateur: Utilisateur | null;
  chargement: boolean;
  connecter: (email: string, motDePasse: string) => Promise<void>;
  inscrire: (payload: RegisterPayload) => Promise<void>;
  deconnecter: () => void;
  rafraichirProfil: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null);
  const [chargement, setChargement] = useState(true);
  const router = useRouter();

  const rafraichirProfil = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUtilisateur(null);
      setChargement(false);
      return;
    }
    try {
      const moi = await api.get<Utilisateur>("/users/me");
      setUtilisateur(moi);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        // La requete a deja tente un rafraichissement : echec final,
        // on purge la session locale complete.
        clearTokens();
      }
      setUtilisateur(null);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    rafraichirProfil();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connecter = useCallback(
    async (email: string, motDePasse: string) => {
      const res = await api.post<AuthResponse>(
        "/auth/login",
        { email, motDePasse },
        { auth: false },
      );
      setToken(res.accessToken);
      setRefreshToken(res.refreshToken);
      await rafraichirProfil();
    },
    [rafraichirProfil],
  );

  const inscrire = useCallback(
    async (payload: RegisterPayload) => {
      const res = await api.post<AuthResponse>("/auth/register", payload, {
        auth: false,
      });
      setToken(res.accessToken);
      setRefreshToken(res.refreshToken);
      await rafraichirProfil();
    },
    [rafraichirProfil],
  );

  const deconnecter = useCallback(() => {
    clearTokens();
    setUtilisateur(null);
    router.push("/");
  }, [router]);

  const value = useMemo(
    () => ({ utilisateur, chargement, connecter, inscrire, deconnecter, rafraichirProfil }),
    [utilisateur, chargement, connecter, inscrire, deconnecter, rafraichirProfil],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit etre utilise dans un AuthProvider");
  return ctx;
}

export function roleLabel(role: Role): string {
  switch (role) {
    case "etudiant":
      return "Étudiant";
    case "client":
      return "Client";
    case "admin":
      return "Administrateur";
  }
}
