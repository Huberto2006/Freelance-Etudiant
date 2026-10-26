"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { definirLangue } from "@/i18n/actions";
import { isLocale } from "@/i18n/config";
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

/** En-tete portant le jeton Turnstile (verifie cote serveur). */
function enteteTurnstile(jeton: string): Record<string, string> {
  return { "X-Turnstile-Token": jeton };
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
    turnstileToken: string,
  ) => Promise<{
    completionProfil: CompletionProfil | null;
    premiereConnexion: boolean;
  }>;
  /** Connexion / creation de compte via le jeton d'identite Google. */
  connecterAvecGoogle: (
    idToken: string,
    turnstileToken: string,
  ) => Promise<{
    role: Role;
    completionProfil: CompletionProfil | null;
    premiereConnexion: boolean;
  }>;
  /** Choix etudiant/client d'un compte Google tout juste cree. */
  choisirRole: (
    role: "etudiant" | "client",
  ) => Promise<{ completionProfil: CompletionProfil | null }>;
  inscrire: (
    payload: RegisterPayload,
    turnstileToken: string,
  ) => Promise<ReponseInscription>;
  deconnecter: () => void;
  rafraichirProfil: (apresConnexion?: boolean) => Promise<CompletionProfil | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null);
  const [chargement, setChargement] = useState(true);
  const [completionProfil, setCompletionProfil] =
    useState<CompletionProfil | null>(null);
  const router = useRouter();
  const locale = useLocale();
  const localeRef = useRef(locale);
  useEffect(() => {
    localeRef.current = locale;
  }, [locale]);

  /**
   * Langue du compte <-> langue du navigateur.
   * - Par defaut le compte fait foi : la langue du compte est appliquee (autre
   *   appareil, nouvelle session) puis la page est rafraichie.
   * - Exception a la connexion : si le visiteur avait choisi une langue autre
   *   que le francais et que le compte est reste sur le francais (valeur par
   *   defaut), son choix est enregistre dans le compte plutot que d'etre perdu.
   * Un echec reseau n'empeche jamais la connexion.
   */
  const synchroniserLangue = useCallback(
    async (moi: Utilisateur, apresConnexion: boolean) => {
      const compte = moi.langue;
      if (!isLocale(compte)) return;
      const courante = localeRef.current;
      if (compte === courante) return;
      try {
        if (apresConnexion && isLocale(courante) && courante !== "fr" && compte === "fr") {
          await api.patch("/users/me/langue", { langue: courante });
          return;
        }
        await definirLangue(compte);
        router.refresh();
      } catch {
        /* la langue reste celle du navigateur */
      }
    },
    [router],
  );

  const rafraichirProfil = useCallback(
    async (apresConnexion = false): Promise<CompletionProfil | null> => {
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
        void synchroniserLangue(moi, apresConnexion);

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
    [synchroniserLangue],
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
    async (email: string, motDePasse: string, turnstileToken: string) => {
      const res = await api.post<AuthResponse>(
        "/auth/login",
        { email, motDePasse },
        { auth: false, headers: enteteTurnstile(turnstileToken) },
      );
      // Le refresh token est pose par le serveur en cookie httpOnly : il
      // n'apparait jamais dans la reponse ni dans le JavaScript.
      setToken(res.accessToken);
      const profil = await rafraichirProfil(true);
      return {
        completionProfil: profil,
        premiereConnexion: res.premiereConnexion,
      };
    },
    [rafraichirProfil],
  );

  const connecterAvecGoogle = useCallback(
    async (idToken: string, turnstileToken: string) => {
      // Le backend verifie le jeton Google (signature, audience, email
      // verifie) ET le jeton Turnstile ; rien d'autre n'est envoye.
      const res = await api.post<AuthResponse>(
        "/auth/google",
        { idToken },
        { auth: false, headers: enteteTurnstile(turnstileToken) },
      );
      setToken(res.accessToken);
      const profil = await rafraichirProfil(true);
      return {
        role: res.utilisateur.role,
        completionProfil: profil,
        premiereConnexion: res.premiereConnexion,
      };
    },
    [rafraichirProfil],
  );

  const choisirRole = useCallback(
    async (role: "etudiant" | "client") => {
      // Le role est valide et applique cote serveur ; une nouvelle session
      // est emise car le role est porte par le jeton d'acces.
      const res = await api.post<AuthResponse>("/auth/choose-role", { role });
      setToken(res.accessToken);
      const profil = await rafraichirProfil();
      return { completionProfil: profil };
    },
    [rafraichirProfil],
  );

  const inscrire = useCallback(
    async (
      payload: RegisterPayload,
      turnstileToken: string,
    ): Promise<ReponseInscription> => {
      /*
       * Verification d'email : le backend cree le compte mais ne delivre
       * AUCUN jeton tant que l'adresse n'est pas confirmee. On retourne la
       * reponse (email concerne) pour que la page d'inscription affiche
       * l'ecran "Un email de verification a ete envoye".
       */
      return api.post<ReponseInscription>("/auth/register", payload, {
        auth: false,
        headers: enteteTurnstile(turnstileToken),
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
      connecterAvecGoogle,
      choisirRole,
      inscrire,
      deconnecter,
      rafraichirProfil,
    }),
    [
      utilisateur,
      chargement,
      completionProfil,
      connecter,
      connecterAvecGoogle,
      choisirRole,
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
    case "a_definir":
      return "Rôle à choisir";
  }
}
