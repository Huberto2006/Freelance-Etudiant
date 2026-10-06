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
import {
  api,
  ApiError,
  clearTokens,
  restaurerSession,
  setOnSessionExpired,
  setToken,
  terminerSessionServeur,
} from "./api";
import type { AuthResponse, CompletionProfil, ReponseInscription, Role, Utilisateur } from "./types";

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
  /**
   * État de complétion du profil (calculé côté serveur), rafraîchi en
   * même temps que `utilisateur`. Null pour les rôles sans questionnaire
   * (client, admin) tant que leur parcours n'existe pas, ou avant le
   * premier chargement.
   */
  completionProfil: CompletionProfil | null;
  connecter: (
    email: string,
    motDePasse: string,
  ) => Promise<CompletionProfil | null>;
  inscrire: (payload: RegisterPayload) => Promise<ReponseInscription>;
  deconnecter: () => void;
  rafraichirProfil: () => Promise<CompletionProfil | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null);
  const [chargement, setChargement] = useState(true);
  const [completionProfil, setCompletionProfil] =
    useState<CompletionProfil | null>(null);
  const router = useRouter();

  const rafraichirProfil = useCallback(
    async (): Promise<CompletionProfil | null> => {
      // Le jeton d'acces n'existe qu'en memoire : apres un rechargement on le
      // reobtient via le cookie httpOnly (refresh). Sans session : deconnecte.
      const sessionOk = await restaurerSession();
      if (!sessionOk) {
        setUtilisateur(null);
        setCompletionProfil(null);
        setChargement(false);
        return null;
      }
      let completionChargee: CompletionProfil | null = null;
      try {
        const moi = await api.get<Utilisateur>("/users/me");
        setUtilisateur(moi);

        // Seul le parcours étudiant existe pour l'instant (ÉTAPE G) : on ne
        // charge la complétion que pour ce rôle, pour ne rien changer au
        // comportement des clients/admins.
        if (moi.role === "etudiant") {
          try {
            const completion = await api.get<CompletionProfil>(
              "/users/me/profile-completion",
            );
            completionChargee = completion;
            setCompletionProfil(completion);
          } catch {
            setCompletionProfil(null);
          }
        } else {
          setCompletionProfil(null);
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          // La requete a deja tente un rafraichissement : echec final,
          // on purge la session locale complete.
          clearTokens();
        }
        setUtilisateur(null);
        setCompletionProfil(null);
      } finally {
        setChargement(false);
      }
      return completionChargee;
    },
    [],
  );

  useEffect(() => {
    // Differre l'appel hors du corps synchrone de l'effet (react-hooks/
    // set-state-in-effect) : sans jeton, rafraichirProfil() met a jour
    // l'etat immediatement.
    void Promise.resolve().then(() => {
      rafraichirProfil();
    });
  }, [rafraichirProfil]);

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
      // Le refresh token est pose par le serveur en cookie httpOnly : il
      // n'apparait jamais dans la reponse ni dans le JavaScript.
      setToken(res.accessToken);
      return rafraichirProfil();
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
    // Revocation de la session cote serveur (en tache de fond) + purge locale.
    void terminerSessionServeur();
    clearTokens();
    setUtilisateur(null);
    setCompletionProfil(null);
    router.push("/");
  }, [router]);

  const value = useMemo(
    () => ({
      utilisateur,
      chargement,
      completionProfil,
      connecter,
      inscrire,
      deconnecter,
      rafraichirProfil,
    }),
    [
      utilisateur,
      chargement,
      completionProfil,
      connecter,
      inscrire,
      deconnecter,
      rafraichirProfil,
    ],
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
