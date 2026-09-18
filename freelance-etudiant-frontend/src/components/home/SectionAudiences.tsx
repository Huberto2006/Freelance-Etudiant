import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  GraduationCap,
  Layers,
  Search,
  Sparkles,
} from "lucide-react";

import type { Mission, ServiceOffert } from "@/lib/types";
import { CarteMission } from "@/components/ui/CarteMission";
import { CarteService } from "@/components/ui/CarteService";

import { SectionTitre } from "./SectionTitre";

interface Pilier {
  titre: string;
  description: string;
}

const PILIERS_CLIENT: Pilier[] = [
  {
    titre: "Publier des missions",
    description:
      "Décrivez vos besoins ponctuels ou récurrents, fixez votre budget et recevez des candidatures ciblées d'étudiants qualifiés.",
  },
  {
    titre: "Trouver des étudiants",
    description:
      "Explorez le catalogue de compétences, filtrez par filière ou domaine, et sélectionnez les meilleurs talents de l'EMIT.",
  },
  {
    titre: "Suivre leurs projets",
    description:
      "Collaborez via une messagerie intégrée, suivez chaque étape de réalisation et validez la livraison en toute transparence.",
  },
];

const PILIERS_ETUDIANT: Pilier[] = [
  {
    titre: "Proposer leurs services",
    description:
      "Mettez en valeur vos compétences techniques, définissez vos offres clés en main, vos tarifs et vos délais de livraison.",
  },
  {
    titre: "Trouver des missions",
    description:
      "Parcourez les besoins concrets publiés par des entreprises et particuliers, candidatez en un clic avec votre lettre de motivation.",
  },
  {
    titre: "Développer leur activité",
    description:
      "Bâtissez un portfolio certifié, gagnez des points de réputation grâce aux avis clients et financez vos études en toute indépendance.",
  },
];

export function SectionAudiences({
  missions = [],
  services = [],
}: {
  /** Quelques missions ouvertes réelles, mises en avant côté étudiant. */
  missions?: Mission[];
  /** Quelques services réels d'étudiants, mis en avant côté client. */
  services?: ServiceOffert[];
}) {
  return (
    <section id="audiences" className="mt-16 scroll-mt-24 sm:mt-20">
      <SectionTitre
        icon={Layers}
        eyebrow="Une marketplace bilatérale"
        titre="Deux parcours connectés pour réussir ensemble"
        sousTitre="Que vous ayez un besoin ponctuel ou des compétences à offrir, Kianja offre à chacun un cadre transparent et sécurisé."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ========================================================
            VOLET CLIENT
           ======================================================== */}
        <div className="notice-card relative flex flex-col p-6 sm:p-8">
          <span className="notice-pin" aria-hidden="true" />

          {/* En-tête de carte */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-bleu/10 text-bleu-dark">
                <BriefcaseBusiness size={24} aria-hidden="true" />
              </span>
              <div>
                <span className="inline-flex items-center rounded-full border border-bleu/20 bg-bleu/5 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-bleu-dark">
                  Côté Client
                </span>
                <h3 className="mt-1 font-display text-2xl font-bold text-ink">
                  Des étudiants prêts à vous aider
                </h3>
              </div>
            </div>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            Entreprises, startups, associations ou particuliers : accédez aux
            futurs diplômés de l&apos;EMIT Fianarantsoa pour donner vie à vos projets
            avec un excellent rapport qualité-prix.
          </p>

          {/* Les 3 piliers clients demandés */}
          <div className="mt-6 space-y-4">
            {PILIERS_CLIENT.map((pilier, idx) => (
              <div
                key={pilier.titre}
                className="flex items-start gap-3 rounded-lg border border-ink/5 bg-paper/60 p-3.5 transition-colors hover:border-bleu/20 hover:bg-paper-light"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bleu/10 font-mono text-xs font-semibold text-bleu-dark">
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-ink">
                    {pilier.titre}
                  </h4>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
                    {pilier.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Aperçu réel : profils, compétences, portfolio, évaluations */}
          {services.length > 0 && (
            <div className="mt-6">
              <p className="mb-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                Étudiants disponibles en ce moment
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {services.map((service) => (
                  <CarteService key={service.id} service={service} />
                ))}
              </div>
            </div>
          )}

          {/* Actions Côté Client */}
          <div className="mt-auto pt-6">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <Link
                href="/services"
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-bleu px-4 text-xs font-medium text-white transition hover:bg-bleu-dark"
              >
                <Search size={14} aria-hidden="true" />
                <span>Trouver un étudiant</span>
              </Link>

              <Link
                href="/missions"
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-ink/15 bg-paper-light px-4 text-xs font-medium text-ink transition hover:border-bleu/40 hover:text-bleu-dark"
              >
                <BriefcaseBusiness size={14} aria-hidden="true" />
                <span>Publier une mission</span>
              </Link>
            </div>
          </div>
        </div>

        {/* ========================================================
            VOLET ÉTUDIANT / FREELANCE
           ======================================================== */}
        <div className="notice-card relative flex flex-col p-6 sm:p-8">
          <span className="notice-pin" aria-hidden="true" />

          {/* En-tête de carte */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ocre/10 text-ocre-dark">
                <GraduationCap size={24} aria-hidden="true" />
              </span>
              <div>
                <span className="inline-flex items-center rounded-full border border-ocre/20 bg-ocre/5 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ocre-dark">
                  Côté Étudiant
                </span>
                <h3 className="mt-1 font-display text-2xl font-bold text-ink">
                  Des projets à réaliser
                </h3>
              </div>
            </div>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            Étudiants de l&apos;EMIT : mettez en pratique vos acquis académiques,
            générez des revenus durant votre cursus et démarrez votre carrière
            avec une expérience concrète et vérifiée.
          </p>

          {/* Les 3 piliers étudiants demandés */}
          <div className="mt-6 space-y-4">
            {PILIERS_ETUDIANT.map((pilier, idx) => (
              <div
                key={pilier.titre}
                className="flex items-start gap-3 rounded-lg border border-ink/5 bg-paper/60 p-3.5 transition-colors hover:border-ocre/20 hover:bg-paper-light"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ocre/10 font-mono text-xs font-semibold text-ocre-dark">
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-ink">
                    {pilier.titre}
                  </h4>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
                    {pilier.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Aperçu réel : missions, projets, clients, budgets */}
          {missions.length > 0 && (
            <div className="mt-6">
              <p className="mb-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                Missions ouvertes en ce moment
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {missions.map((mission) => (
                  <CarteMission key={mission.id} mission={mission} />
                ))}
              </div>
            </div>
          )}

          {/* Actions Côté Étudiant */}
          <div className="mt-auto pt-6">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <Link
                href="/missions"
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-ink px-4 text-xs font-medium text-paper-light transition hover:bg-ink/85"
              >
                <ArrowRight size={14} aria-hidden="true" />
                <span>Trouver des missions</span>
              </Link>

              <Link
                href="/inscription"
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-ink/15 bg-paper-light px-4 text-xs font-medium text-ink transition hover:border-ocre/40 hover:text-ocre-dark"
              >
                <Sparkles size={14} aria-hidden="true" />
                <span>Proposer mes services</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}