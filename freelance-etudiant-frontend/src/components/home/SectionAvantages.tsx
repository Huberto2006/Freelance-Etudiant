"use client";

import Link from "next/link";
import {
  BriefcaseBusiness,
  GraduationCap,
  HandCoins,
  MessagesSquare,
  Rocket,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { NoticeCard } from "@/components/ui/Notice";
import { SectionTitre } from "./SectionTitre";

const AVANTAGES = [
  {
    icon: GraduationCap,
    titre: "Des talents étudiants qualifiés",
    texte:
      "Des étudiants de l'EMIT formés aux standards actuels, aux compétences validées et notés par leurs clients après chaque livraison.",
  },
  {
    icon: Rocket,
    titre: "Un tremplin professionnel réel",
    texte:
      "Chaque mission réalisée enrichit concrètement le portfolio, développe le réseau et consolide le score de réputation certifié.",
  },
  {
    icon: MessagesSquare,
    titre: "Un cadre d'échange sécurisé",
    texte:
      "Une messagerie interne dédiée s'active dès l'acceptation de la candidature pour cadrer les échanges, fichiers et livrables.",
  },
  {
    icon: HandCoins,
    titre: "Des budgets adaptés et équitables",
    texte:
      "Des tarifs compétitifs et transparents pour les clients, et une juste rémunération pour financer les études des freelances.",
  },
] as const;

export function SectionAvantages() {
  return (
    <section id="avantages" className="mt-16 scroll-mt-24 sm:mt-20">
      <SectionTitre
        icon={ShieldCheck}
        eyebrow="Garanties & Valeurs"
        titre="Pourquoi choisir la marketplace Kianja ?"
        sousTitre="Étudiants en quête d'expérience, clients en quête d'expertise : une plateforme pensée pour la réussite mutuelle."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {AVANTAGES.map((avantage) => {
          const Icone = avantage.icon;

          return (
            <NoticeCard key={avantage.titre} className="flex items-start gap-4">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bleu/10 text-bleu-dark"
                aria-hidden="true"
              >
                <Icone size={19} />
              </span>

              <div>
                <h3 className="font-display font-semibold text-ink">
                  {avantage.titre}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                  {avantage.texte}
                </p>
              </div>
            </NoticeCard>
          );
        })}
      </div>

      {/* Appel à l'action final : les deux parcours, à égalité */}
      <div className="mt-12 rounded-2xl border border-ink/15 bg-paper p-6 sm:p-10">
        <div className="text-center">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-bleu-dark">
            Passez à l&apos;action
          </p>
          <h3 className="mt-1 font-display text-2xl font-bold sm:text-3xl">
            Prêt à démarrer sur Kianja ?
          </h3>

          <p className="mx-auto mt-2 max-w-lg text-sm text-ink-soft">
            Rejoignez dès maintenant la communauté : confiez un besoin ou
            valorisez vos compétences étudiantes.
          </p>
        </div>

        <div className="mx-auto mt-8 grid max-w-3xl gap-5 sm:grid-cols-2">
          {/* ------------------------------------------ CÔTÉ CLIENT */}
          <div className="flex flex-col justify-between rounded-xl border border-ink/10 bg-paper-light p-6 shadow-xs transition hover:border-bleu/30">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-bleu/10 text-bleu-dark">
                  <BriefcaseBusiness size={14} aria-hidden="true" />
                </span>
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-bleu-dark">
                  Côté client
                </span>
              </div>

              <h4 className="mt-3 font-display text-lg font-semibold text-ink">
                Vous cherchez un talent ?
              </h4>

              <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                Publiez votre besoin pour recevoir des offres ou parcourez directement le catalogue de services étudiants.
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/missions" className="flex-1 min-w-[120px]">
                <Button size="sm" variant="primary" className="w-full text-xs">
                  Publier une mission
                </Button>
              </Link>

              <Link href="/services" className="flex-1 min-w-[120px]">
                <Button variant="secondary" size="sm" className="w-full text-xs">
                  Trouver un étudiant
                </Button>
              </Link>
            </div>
          </div>

          {/* ---------------------------------------- CÔTÉ ÉTUDIANT */}
          <div className="flex flex-col justify-between rounded-xl border border-ink/10 bg-paper-light p-6 shadow-xs transition hover:border-ocre/30">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ocre/10 text-ocre-dark">
                  <GraduationCap size={14} aria-hidden="true" />
                </span>
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-ocre-dark">
                  Côté étudiant
                </span>
              </div>

              <h4 className="mt-3 font-display text-lg font-semibold text-ink">
                Vous proposez vos compétences ?
              </h4>

              <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                Proposez vos prestations ou parcourez les missions publiées par les clients pour décrocher votre premier projet.
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/inscription" className="flex-1 min-w-[120px]">
                <Button size="sm" variant="primary" className="w-full text-xs">
                  Proposer mes services
                </Button>
              </Link>

              <Link href="/missions" className="flex-1 min-w-[120px]">
                <Button variant="secondary" size="sm" className="w-full text-xs">
                  Trouver une mission
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}