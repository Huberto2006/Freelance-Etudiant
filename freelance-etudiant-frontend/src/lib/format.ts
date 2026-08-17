export function formatArgent(valeur: number | string): string {
  const nombre = typeof valeur === "string" ? parseFloat(valeur) : valeur;
  if (Number.isNaN(nombre)) return "—";
  return `${new Intl.NumberFormat("fr-FR").format(nombre)} Ar`;
}

export function formatDate(date: string): string {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(date));
  } catch {
    return date;
  }
}

export function formatDateCourte(date: string): string {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
    }).format(new Date(date));
  } catch {
    return date;
  }
}

export const statutMissionLabel: Record<string, string> = {
  ouverte: "Ouverte",
  en_cours: "En cours",
  terminee: "Terminée",
  fermee: "Fermée",
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
