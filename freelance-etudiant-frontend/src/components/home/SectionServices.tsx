"use client";

import Link from "next/link";
import { Sparkles, Wrench } from "lucide-react";

import type { ServiceOffert } from "@/lib/types";

import { CarteService } from "@/components/ui/CarteService";
import { NoticeCard } from "@/components/ui/Notice";
import { SectionTitre } from "./SectionTitre";

/**
 * Section « Services populaires » : les prestations des étudiants les
 * mieux notés, présentées sous forme de catalogue.
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
    <section id="services" className="mt-16 scroll-mt-24 sm:mt-20">
      <SectionTitre
        icon={Wrench}
        eyebrow="Compétences étudiantes · Prestations"
        titre="Services prêts à l&apos;emploi"
        sousTitre="Explorez les prestations directes proposées par les talents de l'EMIT : développement, graphisme, rédaction et plus."
        lienHref="/services"
        lienLabel="Voir tous les services"
      />

      {populaires.length === 0 ? (
        <NoticeCard>
          <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ocre/10 text-ocre-dark">
              <Wrench size={20} aria-hidden="true" />
            </span>
            <p className="max-w-md text-sm text-ink-soft">
              Aucun service n&apos;est encore publié. Étudiants de l&apos;EMIT : publiez votre premier service pour être visible auprès des clients.
            </p>
            <Link
              href="/inscription"
              className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3.5 py-2 text-xs font-medium text-paper-light transition hover:bg-ink/85"
            >
              <Sparkles size={14} aria-hidden="true" />
              <span>Proposer un service</span>
            </Link>
          </div>
        </NoticeCard>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {populaires.map((service) => (
              <CarteService key={service.id} service={service} />
            ))}
          </div>

          <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-xl border border-ink/10 bg-paper-light px-5 py-3.5 text-center sm:flex-row sm:text-left">
            <p className="text-xs text-ink-soft">
              Vous êtes étudiant à l&apos;EMIT et vous souhaitez proposer vos services ?
            </p>
            <Link
              href="/inscription"
              className="inline-flex shrink-0 items-center gap-1.5 font-mono text-xs font-semibold text-ocre-dark transition hover:text-ocre"
            >
              <Sparkles size={13} aria-hidden="true" />
              <span>Créer mon offre de service →</span>
            </Link>
          </div>
        </>
      )}
    </section>
  );
}