/**
 * RG11 : Un signalement doit etre traite par un administrateur avant cloture.
 */
export enum StatutSignalement {
  OUVERT = 'ouvert',
  EN_COURS = 'en_cours',
  TRAITE = 'traite',
}

export enum CibleSignalement {
  UTILISATEUR = 'utilisateur',
  SERVICE = 'service',
  MISSION = 'mission',
}
