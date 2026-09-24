/**
 * Roles disponibles sur la plateforme.
 * RG1 : Un utilisateur possede un role unique parmi Etudiant, Client, Admin.
 */
export enum Role {
  ETUDIANT = 'etudiant',
  CLIENT = 'client',
  ADMIN = 'admin',
  /**
   * Rôle transitoire réservé aux nouveaux comptes créés via Google :
   * l'utilisateur n'a pas encore choisi s'il utilise Kianja comme
   * étudiant ou client. Il est bloque sur l'ecran de choix de role
   * (/choix-role) jusqu'a une selection explicite validee cote backend.
   * Jamais attribue par l'inscription classique (cf. AuthService.register).
   */
  A_DEFINIR = 'a_definir',
}
