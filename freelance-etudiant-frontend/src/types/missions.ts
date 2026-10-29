import type { Candidature } from "./candidatures";
import type { ClientProfile } from "./utilisateurs";

export type StatutMission =
  | "ouverte"
  | "en_cours"
  | "terminee"
  | "fermee"
  | "expiree";

export interface Mission {
  id: string;

  titre: string;

  description: string;

  budget: number | string;

  dateLimite: string;

  categorie: string;

  competencesRequises: string[];

  statut: StatutMission;

  imageUrl?: string | null;

  /**
   * Fausse pour une mission privee creee automatiquement lors de
   * l'acceptation d'une commande de service (RGds3) : elle n'apparait
   * jamais dans le panneau d'affichage public ni dans « Mes publications ».
   */
  estModere?: boolean;

  clientId: string;

  /**
   * Le backend charge le client de la mission.
   *
   * client.utilisateur permet notamment de récupérer
   * le nom et l'id de l'utilisateur client.
   */
  client?: ClientProfile;

  candidatures?: Candidature[];

  dateCreation: string;
}
