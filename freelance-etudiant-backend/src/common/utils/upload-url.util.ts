/**
 * Format accepte pour une image referencee par une mission ou un service :
 * uniquement un fichier image envoye via l'API d'upload (jamais une URL
 * externe ni un document quelconque du serveur).
 */
export const REGEX_URL_IMAGE_UPLOAD =
  /^\/uploads\/(documents|images)\/[A-Za-z0-9-]+\.(jpe?g|png|webp)$/i;

export const MESSAGE_URL_IMAGE_UPLOAD =
  "L'image doit provenir de l'envoi de fichier de la plateforme (JPG, PNG ou WebP).";
