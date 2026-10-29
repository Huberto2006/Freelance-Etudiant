import type { Mission } from './entities/mission.entity';
import { projeterClient } from '../clients/client.projection';

/** Projection PUBLIQUE d'une mission (liste blanche des champs affiches). */
export function projeterMission(mission: Mission) {
  return {
    id: mission.id,
    titre: mission.titre,
    description: mission.description,
    budget: mission.budget,
    dateLimite: mission.dateLimite,
    categorie: mission.categorie,
    competencesRequises: mission.competencesRequises,
    statut: mission.statut,
    imageUrl: mission.imageUrl ?? null,
    clientId: mission.clientId,
    dateCreation: mission.dateCreation,
    client: projeterClient(mission.client),
  };
}
