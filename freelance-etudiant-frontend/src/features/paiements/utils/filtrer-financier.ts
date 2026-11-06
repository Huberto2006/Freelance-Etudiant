import type { ValeursFiltresFinanciers } from "../components/FiltresFinanciers";
import { dateDansPeriode } from "@/components/ui/data-table/utils";
import type { MethodePaiement, StatutTransaction } from "@/types/paiements";

export function filtrerFinancier<T>(
  lignes: T[],
  filtres: ValeursFiltresFinanciers,
  valeurs: {
    statut?: (ligne: T) => StatutTransaction;
    methode: (ligne: T) => MethodePaiement | string;
    date: (ligne: T) => string;
  },
): T[] {
  return lignes.filter((ligne) => {
    if (filtres.statut && valeurs.statut?.(ligne) !== filtres.statut) {
      return false;
    }
    if (filtres.methode && valeurs.methode(ligne) !== filtres.methode) {
      return false;
    }
    if (
      (filtres.depuis || filtres.jusqua) &&
      !dateDansPeriode(valeurs.date(ligne), filtres.depuis, filtres.jusqua)
    ) {
      return false;
    }
    return true;
  });
}

export function filtresFinanciersActifs(
  filtres: ValeursFiltresFinanciers,
): boolean {
  return Boolean(
    filtres.statut || filtres.methode || filtres.depuis || filtres.jusqua,
  );
}
