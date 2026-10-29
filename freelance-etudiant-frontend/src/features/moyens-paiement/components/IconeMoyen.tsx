"use client";

import {
  Building2,
  Smartphone,
} from "lucide-react";
import { TypeMoyenPaiement } from "@/features/moyens-paiement/moyens-paiement.types";

// ============================================================
// ICONE
// ============================================================

export function IconeMoyen({
  type,
}: {
  type: TypeMoyenPaiement;
}) {
  if (type === "BANQUE") {
    return <Building2 size={20} />;
  }

  return <Smartphone size={20} />;
}
