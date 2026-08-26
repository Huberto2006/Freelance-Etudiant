/**
 * RGds1 : une demande de service (commande passee par un client sur un
 * service publie par un etudiant) suit le meme cycle qu'une candidature :
 * en attente -> acceptee ou refusee par l'etudiant.
 */
export enum StatutDemandeService {
  EN_ATTENTE = 'en_attente',
  ACCEPTEE = 'acceptee',
  REFUSEE = 'refusee',
}
