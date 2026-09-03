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
import { api, ApiError, getToken, setToken, setRefreshToken, clearTokens, setOnSessionExpired } from "./api";
import type { AuthResponse, ReponseInscription, Role, Utilisateur } from "./types";

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
  inscrire: (payload: RegisterPayload) => Promise<ReponseInscription>;
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
    // Differre l'appel hors du corps synchrone de l'effet (react-hooks/
    // set-state-in-effect) : sans jeton, rafraichirProfil() met a jour
    // l'etat immediatement.
    void Promise.resolve().then(() => {
      rafraichirProfil();
    });
  }, []);

  // Synchronise immédiatement l'état React quand api.ts détecte qu'un
  // rafraîchissement de jeton a définitivement échoué (session expirée).
  useEffect(() => {
    setOnSessionExpired(() => setUtilisateur(null));
    return () => setOnSessionExpired(null);
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
    async (payload: RegisterPayload): Promise<ReponseInscription> => {
      /*
       * Verification d'email : le backend cree le compte mais ne delivre
       * AUCUN jeton tant que l'adresse n'est pas confirmee. On retourne la
       * reponse (email concerne) pour que la page d'inscription affiche
       * l'ecran "Un email de verification a ete envoye".
       */
      return api.post<ReponseInscription>("/auth/register", payload, {
        auth: false,
      });
    },
    [],
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
