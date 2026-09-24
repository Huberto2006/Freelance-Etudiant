/**
 * Origine d'authentification d'un compte Kianja.
 * - LOCAL : inscription classique email + mot de passe (defaut, y compris
 *   pour tous les comptes pre-existants a la migration).
 * - GOOGLE : compte cree ou associe via Google OAuth 2.0 / OIDC.
 */
export enum AuthProvider {
  LOCAL = 'LOCAL',
  GOOGLE = 'GOOGLE',
}