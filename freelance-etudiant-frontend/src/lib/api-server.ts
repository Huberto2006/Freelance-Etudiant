const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

/**
 * A utiliser uniquement dans des Server Components pour des routes
 * publiques (pas de JWT necessaire). Ne pas utiliser pour des donnees
 * specifiques a l'utilisateur connecte (voir lib/api.ts cote client).
 */
export async function fetchPublic<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
