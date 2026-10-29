import type { Mission } from "./missions";
import type { EtudiantProfile } from "./utilisateurs";

export type RoleMembreGroupe = "chef" | "membre";

export type StatutInvitationGroupe =
  | "en_attente"
  | "acceptee"
  | "refusee"
  | "annulee";

export interface Groupe {
  id: string;

  nom: string;

  description?: string | null;

  createurId: string;

  createur?: EtudiantProfile;

  missionId?: string | null;

  mission?: Mission | null;

  membres?: MembreGroupe[];

  dateCreation: string;
}

export interface MembreGroupe {
  id: string;

  groupeId: string;

  etudiantId: string;

  etudiant?: EtudiantProfile;

  role: RoleMembreGroupe;

  dateAdhesion: string;
}

export interface InvitationGroupe {
  id: string;

  groupeId: string;

  groupe?: Groupe;

  inviteurId: string;

  inviteur?: EtudiantProfile;

  inviteId: string;

  invite?: EtudiantProfile;

  statut: StatutInvitationGroupe;

  dateCreation: string;
}
