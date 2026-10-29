import type { Groupe } from "./groupes";
import type { Livraison } from "./livraisons";
import type { Mission } from "./missions";
import type { EtudiantProfile } from "./utilisateurs";

export type StatutCandidature =
  | "en_attente"
  | "acceptee"
  | "refusee";

export interface Candidature {
  id: string;

  prixPropose: number | string;

  delaiPropose: number;

  message?: string | null;

  statut: StatutCandidature;

  missionId: string;

  mission?: Mission;

  etudiantId: string;

  etudiant?: EtudiantProfile;

  livraison?: Livraison | null;

  dateCandidature: string;

  /** Non nul : candidature deposee au nom d'un groupe (etudiantId = chef). */
  groupeId?: string | null;

  groupe?: Groupe | null;
}
