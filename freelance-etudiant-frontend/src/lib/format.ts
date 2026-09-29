export function formatArgent(valeur: number | string): string {
  const nombre = typeof valeur === "string" ? parseFloat(valeur) : valeur;
  if (Number.isNaN(nombre)) return "—";
  return `${new Intl.NumberFormat("fr-FR").format(nombre)} Ar`;
}

/**
 * Convertit une date en objet Date. Une date seule ("2026-09-30", colonne
 * SQL `date`) est lue comme un jour CALENDAIRE local : new Date("2026-09-30")
 * la lirait en UTC et l'afficherait la veille sous un fuseau negatif.
 */
export function versDate(date: string): Date {
  const jour = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.slice(0, 10));
  if (jour && (date.length === 10 || date.length > 10 && date[10] === "T" && /T00:00:00(\.0+)?Z?$/.test(date.slice(10)))) {
    return new Date(Number(jour[1]), Number(jour[2]) - 1, Number(jour[3]));
  }
  return new Date(date);
}

/**
 * Vrai si le JOUR de la date limite est strictement passe. La date limite
 * est inclusive : elle reste valable jusqu'a la fin de ce jour (meme regle
 * que le backend).
 */
export function dateLimiteDepassee(dateLimite: string): boolean {
  const limite = versDate(dateLimite);
  const finDuJour = new Date(
    limite.getFullYear(),
    limite.getMonth(),
    limite.getDate() + 1,
  );
  return Date.now() >= finDuJour.getTime();
}

export function formatDate(date: string): string {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(versDate(date));
  } catch {
    return date;
  }
}

export function formatDateCourte(date: string): string {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
    }).format(versDate(date));
  } catch {
    return date;
  }
}

export const statutMissionLabel: Record<string, string> = {
  ouverte: "Ouverte",
  en_cours: "En cours",
  terminee: "Terminée",
  fermee: "Fermée",
  expiree: "Expirée",
};

export const statutCandidatureLabel: Record<string, string> = {
  en_attente: "En attente",
  acceptee: "Acceptée",
  refusee: "Refusée",
};

export const statutLivraisonLabel: Record<string, string> = {
  en_attente: "En attente de validation",
  validee: "Validée",
  correction_demandee: "Correction demandée",
};

export const statutTransactionLabel: Record<string, string> = {
  en_attente: "En attente de vérification",
  confirmee: "Confirmé",
  liberee: "Libéré",
  annulee: "Annulé",
};

export const methodePaiementLabel: Record<string, string> = {
  mvola: "Mvola",
  orange_money: "Orange Money",
  airtel_money: "Airtel Money",
  virement: "Virement bancaire",
};

export const statutSignalementLabel: Record<string, string> = {
  ouvert: "Ouvert",
  en_cours: "En cours de traitement",
  traite: "Traité",
};

export const statutDemandeServiceLabel: Record<string, string> = {
  en_attente: "En attente de réponse",
  acceptee: "Acceptée",
  refusee: "Refusée",
};

export const statutInvitationGroupeLabel: Record<string, string> = {
  en_attente: "En attente",
  acceptee: "Acceptée",
  refusee: "Refusée",
  annulee: "Annulée",
};

export const roleMembreGroupeLabel: Record<string, string> = {
  chef: "Chef",
  membre: "Membre",
};
