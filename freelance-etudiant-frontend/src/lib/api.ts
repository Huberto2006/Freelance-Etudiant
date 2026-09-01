const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

/**
 * Origine du serveur (sans le prefixe /api/v1), utilisee pour
 * resoudre les chemins de fichiers statiques (ex. /uploads/profiles/xxx.jpg)
 * renvoyes par l'API.
 */
const API_ORIGIN = (() => {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return "";
  }
})();

/**
 * Origine du serveur (sans /api/v1), reutilisee par socket-context.tsx
 * pour se connecter au meme serveur que l'API REST.
 */
export function getApiOrigin(): string {
  return API_ORIGIN;
}

/**
 * Transforme un chemin relatif renvoye par l'API (ex. "/uploads/profiles/x.jpg")
 * en URL absolue exploitable dans un <img src>.
 */
export function getFileUrl(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_ORIGIN}${path}`;
}

const TOKEN_KEY = "kianja_access_token";
const REFRESH_TOKEN_KEY = "kianja_refresh_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_KEY);
  }
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

/** Purge complete de la session locale (access + refresh). */
export function clearTokens(): void {
  setToken(null);
  setRefreshToken(null);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Callback optionnel enregistré par AuthContext pour être informé
 * immédiatement lorsque la session devient réellement invalide (le
 * rafraîchissement du jeton a échoué). Sans ce hook, l'état React
 * `utilisateur` resterait "connecté" jusqu'au prochain rechargement,
 * alors que toutes les requêtes échoueraient silencieusement.
 */
let onSessionExpired: (() => void) | null = null;

export function setOnSessionExpired(callback: (() => void) | null): void {
  onSessionExpired = callback;
}

interface RequestOptions extends RequestInit {
  auth?: boolean;
}

/**
 * Rafraichissement de jeton : plusieurs requetes concurrentes en 401
 * partagent la meme promesse (evite la tempete d'appels /auth/refresh).
 * Retourne le nouvel access token, ou null si le rafraichissement echoue.
 */
let rafraichissementEnCours: Promise<string | null> | null = null;

async function rafraichirToken(): Promise<string | null> {
  rafraichissementEnCours ??= (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) return null;

      const data = parseBody(await response.text()) as {
        accessToken?: string;
        refreshToken?: string;
      } | null;

      if (!data?.accessToken) return null;

      setToken(data.accessToken);
      if (data.refreshToken) {
        setRefreshToken(data.refreshToken);
      }
      return data.accessToken;
    } catch {
      return null;
    }
  })().finally(() => {
    rafraichissementEnCours = null;
  });

  return rafraichissementEnCours;
}

/** Analyse le corps d'une reponse en tolerant un contenu non JSON. */
function parseBody(text: string): unknown {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

/** Extrait un message lisible d'une reponse d'erreur de l'API. */
function extraireMessage(data: unknown): string {
  const message = (data as { message?: string | string[] } | null)?.message;
  if (Array.isArray(message)) return message.join(", ");
  return message ?? "Une erreur est survenue";
}

/** Construit la requete avec les en-tetes d'authentification si besoin. */
async function executerRequete(
  path: string,
  options: RequestOptions,
): Promise<Response> {
  const { auth = true, headers, ...rest } = options;
  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string>),
  };

  if (auth) {
    const token = getToken();
    if (token) {
      finalHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  return fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
  });
}

/** Convertit la reponse en donnees ou leve une ApiError explicite. */
async function convertirReponse<T>(response: Response): Promise<T> {
  const data = parseBody(await response.text());
  if (!response.ok) {
    throw new ApiError(response.status, extraireMessage(data));
  }
  return data as T;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response = await executerRequete(path, options);

  // Session expiree : on tente UN rafraichissement puis on rejoue la
  // requete. Un echec du rafraichissement purge la session locale.
  if (response.status === 401 && options.auth !== false) {
    const nouveauToken = await rafraichirToken();
    if (nouveauToken) {
      response = await executerRequete(path, options);
    } else {
      clearTokens();
      onSessionExpired?.();
    }
  }

  return convertirReponse<T>(response);
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, {
      ...options,
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, {
      ...options,
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
  /**
   * Envoi d'un fichier en multipart/form-data (ex. photo de profil).
   * Ne pas fixer Content-Type manuellement : le navigateur doit
   * generer lui-meme la boundary du formulaire.
   * Beneficie du meme mecanisme de rafraichissement de session que
   * les autres methodes.
   */
  upload: async <T>(path: string, formData: FormData): Promise<T> => {
    const envoyer = () => {
      const token = getToken();
      return fetch(`${API_BASE_URL}${path}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });
    };

    let response = await envoyer();

    if (response.status === 401) {
      const nouveauToken = await rafraichirToken();
      if (nouveauToken) {
        response = await envoyer();
      } else {
        clearTokens();
        onSessionExpired?.();
      }
    }

    const data = parseBody(await response.text());
    if (!response.ok) {
      throw new ApiError(response.status, extraireMessage(data));
    }
    return data as T;
  },
};
