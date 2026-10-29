"use client";

import {
  Smartphone,
  Building2,
} from "lucide-react";
import { TypeMoyenPaiement } from "@/features/paiements/paiements.types";

// ============================================================
// ICONE D'UN MOYEN DE PAIEMENT
// ============================================================

export function IconeMoyenPaiement({
  type,
}: {
  type: TypeMoyenPaiement;
}) {
  if (type === "BANQUE") {
    return <Building2 size={18} />;
  }

  return <Smartphone size={18} />;
}
