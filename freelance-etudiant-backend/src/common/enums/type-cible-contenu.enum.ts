/**
 * Type de contenu publie pouvant recevoir des commentaires et des
 * reactions (distinct de TypeCibleFavori qui inclut aussi 'etudiant').
 * Partage entre le module commentaires et le module reactions-contenu
 * pour eviter toute duplication.
 */
export enum TypeCibleContenu {
  MISSION = 'mission',
  SERVICE = 'service',
}
