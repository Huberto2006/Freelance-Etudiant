import type { Metadata } from "next";
import { Users } from "lucide-react";

import { EnTetePagePublique } from "@/components/layout/EnTetePagePublique";
import { ListeFreelances } from "@/components/freelances/ListeFreelances";

export const metadata: Metadata = {
  title: "Freelances — Kianja",
  description:
    "Découvrez les compétences et les profils des étudiants freelances de Kianja.",
};

export default function PageFreelances() {
  return (
    <div className="mx-auto max-w-6xl px-5 pb-8 pt-10 sm:pt-14">
      <EnTetePagePublique
        icon={Users}
        eyebrow="Explorer"
        titre="Découvrir les freelances"
        introduction="Compétences, formation et disponibilité des étudiants qui proposent leurs services sur Kianja."
      />

      <ListeFreelances />
    </div>
  );
}
