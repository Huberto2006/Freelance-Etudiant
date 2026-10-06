/**
 * Format accepte pour une image referencee par une mission ou un service :
 * uniquement un fichier image envoye via l'API d'upload (jamais une URL
 * externe ni un document quelconque du serveur).
 */
export const REGEX_URL_IMAGE_UPLOAD =
  /^\/uploads\/(documents|images)\/[A-Za-z0-9-]+\.(jpe?g|png|webp)$/i;

export const MESSAGE_URL_IMAGE_UPLOAD =
  "L'image doit provenir de l'envoi de fichier de la plateforme (JPG, PNG ou WebP).";

/**
 * Document (piece jointe, livrable) envoye via POST /uploads/document :
 * chemin relatif <uuid>.<extension> uniquement. Aucune URL externe, aucun
 * schema data:/javascript:, aucune remontee de repertoire.
 */
export const REGEX_URL_DOCUMENT_UPLOAD =
  /^\/uploads\/documents\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]{2,5}$/i;

export const MESSAGE_URL_DOCUMENT_UPLOAD =
  "Le fichier doit provenir de l'envoi de fichier de la plateforme.";

/**
 * Photo de profil : fichier envoye via POST /uploads/profile, ou URL https
 * (photo fournie par un fournisseur d'identite).
 */
export const REGEX_URL_PHOTO_PROFIL =
  /^(\/uploads\/profiles\/[A-Za-z0-9-]+\.(jpe?g|png|webp)|https:\/\/[^\s<>"']+)$/i;
