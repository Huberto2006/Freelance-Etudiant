import type { EtudiantProfile } from "./utilisateurs";

export interface ServiceOffert {
  id: string;

  titre: string;

  description: string;

  categorie: string;

  prix: number | string;

  delai: number;

  competences: string[];

  imagesUrls: string[];

  disponible: boolean;

  /**
   * Service archivé par son propriétaire (suppression logique) :
   * absent du catalogue public et non commandable, mais conservé
   * pour l'historique des demandes de service.
   */
  estArchive?: boolean;

  etudiantId: string;

  etudiant?: EtudiantProfile;

  dateCreation: string;
}
