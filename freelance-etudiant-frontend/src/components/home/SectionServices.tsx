"use client";

import { Wrench } from "lucide-react";

import type { ServiceOffert } from "@/lib/types";

import { CarteService } from "@/components/ui/CarteService";
import { NoticeCard } from "@/components/ui/Notice";
import { SectionTitre } from "./SectionTitre";

/**
 * Section « Services populaires » : les prestations des etudiants les
 * mieux notes, presentees sous forme de catalogue. Le tri combine la
 * note moyenne puis le score de reputation.
 */
export function SectionServices({ services }: { services: ServiceOffert[] }) {
  const populaires = [...services]
    .sort(
      (a, b) =>
        Number(b.etudiant?.noteMoyenne ?? 0) -
          Number(a.etudiant?.noteMoyenne ?? 0) ||
        Number(b.etudiant?.scoreReputation ?? 0) -
          Number(a.etudiant?.scoreReputation ?? 0),
    )
    .slice(0, 8);

  return (
    <section id="services" className="mt-16 scroll-mt-24">
      <SectionTitre
        icon={Wrench}
        eyebrow="Étals du kianja"
        titre="Services populaires"
        sousTitre="Les prestations proposées par les étudiants les mieux notés de la plateforme."
        lienHref="/services"
        lienLabel="Voir tous les services"
      />

      {populaires.length === 0 ? (
        <NoticeCard>
          <p className="text-sm text-ink-soft">
            Aucun service n&apos;est encore publié. Les étudiants peuvent
            mettre leurs compétences en avant depuis leur tableau de bord.
          </p>
        </NoticeCard>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {populaires.map((service) => (
            <CarteService key={service.id} service={service} />
          ))}
        </div>
      )}
    </section>
  );
}