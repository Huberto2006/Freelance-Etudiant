export enum StatutMission {
  OUVERTE = 'ouverte',
  EN_COURS = 'en_cours',
  TERMINEE = 'terminee',
  FERMEE = 'fermee',
  /**
   * Mission publique dont la date limite de candidature est depassee.
   * La transition OUVERTE -> EXPIREE est effectuee cote backend par
   * ExpirationMissionsService (balayage periodique + rattrapage au
   * demarrage). Une mission expiree :
   *  - n'apparait plus dans l'annuaire des missions disponibles ;
   *  - n'apparait plus dans les recommandations / matching ;
   *  - n'accepte plus de nouvelle candidature (RG3) ;
   *  - reste visible dans l'historique du client proprietaire ;
   *  - n'est jamais supprimee automatiquement.
   */
  EXPIREE = 'expiree',
}
