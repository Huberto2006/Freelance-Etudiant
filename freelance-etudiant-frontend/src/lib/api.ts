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
  // Une API relative doit connecter Socket.IO a l'origine de la page.
  if (!API_ORIGIN && typeof window !== "undefined") {
    return window.location.origin;
  }
  return API_ORIGIN;
}

/**
 * Origine servant les fichiers /uploads. Par defaut celle de l'API ; peut
 * etre surchargee par NEXT_PUBLIC_FILES_URL (ex. CDN ou domaine dedie), ce
 * qui evite de casser les images quand NEXT_PUBLIC_API_URL est relative.
 */
const FILES_ORIGIN = (() => {
  const dedie = process.env.NEXT_PUBLIC_FILES_URL;
  if (dedie) {
    try {
      return new URL(dedie).origin;
    } catch {
      /* valeur invalide : repli sur l'origine de l'API */
    }
  }
  return API_ORIGIN;
})();

let avertissementFichiersAffiche = false;

/** Signale (une fois, en console) une origine de fichiers manifestement fausse. */
function avertirSiOrigineFichiersSuspecte(): void {
  if (avertissementFichiersAffiche || typeof window === "undefined") return;
  avertissementFichiersAffiche = true;
  try {
    const hoteFichiers = FILES_ORIGIN ? new URL(FILES_ORIGIN).hostname : "";
    const hotePage = window.location.hostname;
    const locale = (h: string) => h === "localhost" || h === "127.0.0.1";
    if (hoteFichiers && locale(hoteFichiers) && !locale(hotePage)) {
      console.warn(
        "[Kianja] Les images pointent vers " +
          FILES_ORIGIN +
          " alors que le site est servi depuis " +
          hotePage +
          ". Definissez NEXT_PUBLIC_API_URL (ou NEXT_PUBLIC_FILES_URL) au BUILD.",
      );
    }
  } catch {
    /* sans importance */
  }
}

export function getFileUrl(
  path?: string | null,
): string | null {
  if (!path) return null;

  const valeur = path.trim();

  if (!valeur) return null;

  avertirSiOrigineFichiersSuspecte();

  // URL absolue : http(s) uniquement. Les schemas javascript:, vbscript:,
  // file: ou data: arbitraires sont refuses (seule une petite image
  // data:image/... est tolérée, pour l'apercu local avant envoi).
  if (/^https?:\/\//i.test(valeur)) {
    return valeur;
  }
  if (/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(valeur)) {
    return valeur;
  }
  // Tout autre schema (xxx:) est rejete.
  if (/^[a-z][a-z0-9+.-]*:/i.test(valeur)) {
    return null;
  }

  /*
   * URL protocolaire sans domaine.
   * Exemple : //cdn.example.com/image.jpg
   */
  if (valeur.startsWith("//")) {
    if (typeof window !== "undefined") {
      return `${window.location.protocol}${valeur}`;
    }

    return `https:${valeur}`;
  }

  /*
   * Chemin relatif.
   *
   * API_BASE_URL :
   * https://kianja.arato.mg/api/v1
   *
   * API_ORIGIN :
   * https://kianja.arato.mg
   */
  const chemin = valeur.startsWith("/")
    ? valeur
    : `/${valeur}`;

  /*
   * Si le backend renvoie déjà :
   *
   * /api/v1/uploads/document/xxx.jpg
   *
   * on retire /api/v1 car les fichiers statiques
   * sont servis depuis l'origine du serveur.
   */
  const apiPrefix = new URL(
    API_BASE_URL,
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost",
  ).pathname.replace(/\/+$/, "");

  if (
    apiPrefix &&
    apiPrefix !== "/" &&
    chemin.startsWith(`${apiPrefix}/`)
  ) {
    return `${FILES_ORIGIN}${chemin.slice(
      apiPrefix.length,
    )}`;
  }

  return `${FILES_ORIGIN}${chemin}`;
}

/**
 * Jeton d'acces : conserve UNIQUEMENT en memoire (variable de module).
 * Il n'est plus ecrit dans localStorage, donc une faille XSS ne peut plus
 * le lire de facon durable. Il vit 15 minutes ; au rechargement de la page
 * il est reobtenu via /auth/refresh grace au cookie httpOnly (illisible
 * par JavaScript) depose par le serveur.
 */
let accessTokenMemoire: string | null = null;

/** Nettoyage des anciennes cles (sessions creees avant ce correctif). */
function purgerAnciensJetons(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem("kianja_access_token");
    window.localStorage.removeItem("kianja_refresh_token");
  } catch {
    /* stockage indisponible : sans importance */
  }
}
purgerAnciensJetons();

export function getToken(): string | null {
  return accessTokenMemoire;
}

export function setToken(token: string | null): void {
  accessTokenMemoire = token;
}

/** Purge locale de la session (le cookie est efface par POST /auth/logout). */
export function clearTokens(): void {
  accessTokenMemoire = null;
}

/**
 * En-tete exige par l'API sur les routes authentifiees par cookie
 * (refresh, logout) : protection CSRF (un site tiers ne peut pas l'ajouter).
 */
const ENTETES_COOKIE = {
  "Content-Type": "application/json",
  "X-Kianja-Csrf": "1",
};

/** Termine la session cote serveur (revocation + suppression du cookie). */
export async function terminerSessionServeur(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      headers: ENTETES_COOKIE,
      credentials: "include",
    });
  } catch {
    /* hors ligne : la session locale est purgee de toute facon */
  }
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
    try {
      // Le refresh token est dans un cookie httpOnly : on ne le voit ni ne
      // l'envoie nous-memes, le navigateur le joint (credentials: include).
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: ENTETES_COOKIE,
        credentials: "include",
        body: "{}",
      });

      if (!response.ok) return null;

      const data = parseBody(await response.text()) as {
        accessToken?: string;
      } | null;

      if (!data?.accessToken) return null;

      setToken(data.accessToken);
      return data.accessToken;
    } catch {
      return null;
    }
  })().finally(() => {
    rafraichissementEnCours = null;
  });

  return rafraichissementEnCours;
}

/**
 * Restaure la session au chargement de la page : sans jeton en memoire, on
 * tente un refresh via le cookie httpOnly. Retourne true si une session
 * valide a ete retablie.
 */
export async function restaurerSession(): Promise<boolean> {
  if (getToken()) return true;
  return (await rafraichirToken()) !== null;
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
    // Necessaire pour que le navigateur accepte le cookie httpOnly pose par
    // /auth/login (API sur une autre origine). Le cookie est limite par
    // Path a /api/v1/auth : il n'est pas joint aux autres routes.
    credentials: "include",
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

/**
 * Ouvre un document prive (livrable, piece jointe) : demande d'abord au
 * serveur un lien signe valable 60 s (controle d'acces cote serveur), puis
 * l'ouvre dans un nouvel onglet. Les documents ne sont plus accessibles
 * par une URL statique publique.
 */
export async function ouvrirDocument(url: string): Promise<void> {
  // L'onglet est ouvert tout de suite (geste utilisateur) pour ne pas etre
  // bloque par le navigateur, puis redirige vers le lien signe.
  const onglet = typeof window !== "undefined" ? window.open("", "_blank") : null;
  try {
    if (onglet) onglet.opener = null;
    const lien = await api.post<{ url: string }>("/uploads/document/lien", { url });
    const cible = `${getApiOrigin()}${lien.url}`;
    if (onglet) {
      onglet.location.href = cible;
    } else {
      window.location.href = cible;
    }
  } catch (error) {
    onglet?.close();
    throw error;
  }
}

/**
 * Retourne l'URL uniquement si elle est http(s) ; sinon null. A utiliser
 * pour tout lien externe saisi par un utilisateur (portfolio, depot...)
 * avant de l'injecter dans un href.
 */
export function lienExterneSur(url?: string | null): string | null {
  if (!url) return null;
  const valeur = url.trim();
  try {
    const u = new URL(valeur);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Lien interne (notification...) : chemin relatif au site uniquement. */
export function lienInterneSur(url?: string | null): string | null {
  if (!url) return null;
  const valeur = url.trim();
  // "/chemin" accepte ; "//hote" (protocole relatif) et "/\\hote" refuses.
  return /^\/(?![/\\])/.test(valeur) ? valeur : null;
}
