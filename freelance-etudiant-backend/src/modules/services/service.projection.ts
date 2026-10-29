import type { ServiceOffert } from './entities/service.entity';
import { projeterEtudiant } from '../etudiants/etudiant.projection';

/** Projection PUBLIQUE d'un service (liste blanche des champs affiches). */
export function projeterService(service: ServiceOffert) {
  return {
    id: service.id,
    titre: service.titre,
    description: service.description,
    categorie: service.categorie,
    prix: service.prix,
    delai: service.delai,
    competences: service.competences,
    imagesUrls: service.imagesUrls,
    disponible: service.disponible,
    etudiantId: service.etudiantId,
    dateCreation: service.dateCreation,
    etudiant: projeterEtudiant(service.etudiant),
  };
}
