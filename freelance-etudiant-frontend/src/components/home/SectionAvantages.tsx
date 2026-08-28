"use client";

import Link from "next/link";
import {
  GraduationCap,
  HandCoins,
  MessagesSquare,
  Rocket,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { NoticeCard } from "@/components/ui/Notice";
import { SectionTitre } from "./SectionTitre";

const AVANTAGES = [
  {
    icon: GraduationCap,
    titre: "Des talents étudiants qualifiés",
    texte:
      "Des étudiants de l'EMIT Fianarantsoa aux compétences vérifiées, notés par leurs clients après chaque projet livré.",
  },
  {
    icon: Rocket,
    titre: "Une première expérience qui compte",
    texte:
      "Chaque mission réalisée enrichit le portfolio et le score de réputation de l'étudiant, projet après projet.",
  },
  {
    icon: MessagesSquare,
    titre: "Un échange encadré",
    texte:
      "La messagerie s'ouvre dès qu'une candidature est acceptée : des discussions utiles, dans un cadre sûr.",
  },
  {
    icon: HandCoins,
    titre: "Des budgets adaptés",
    texte:
      "Des tarifs étudiants, un paiement déclaré par le client puis vérifié par l'équipe avant d'être libéré.",
  },
] as const;

export function SectionAvantages() {
  return (
    <section id="avantages" className="mt-16 scroll-mt-24">
      <SectionTitre
        icon={Rocket}
        eyebrow="Pourquoi Kianja ?"
        titre="Une place de marché pensée pour vous"
        sousTitre="Étudiants en quête d'expérience, clients en quête de compétences : tout le monde y gagne."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {AVANTAGES.map((avantage) => {
          const Icone = avantage.icon;

          return (
            <NoticeCard key={avantage.titre} className="flex items-start gap-4">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ocre/10 text-ocre-dark"
                aria-hidden="true"
              >
                <Icone size={19} />
              </span>

              <div>
                <h3 className="font-display font-semibold">{avantage.titre}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                  {avantage.texte}
                </p>
              </div>
            </NoticeCard>
          );
        })}
      </div>

      {/* Appel a l'action final */}
      <div className="mt-10 rounded-xl border border-ink/15 bg-gradient-to-br from-rice/10 via-paper-light to-ocre/15 px-6 py-10 text-center sm:px-10">
        <h3 className="font-display text-2xl font-semibold sm:text-3xl">
          Prêt à démarrer votre projet ?
        </h3>

        <p className="mx-auto mt-3 max-w-lg text-sm text-ink-soft">
          Créez votre compte en quelques minutes : publiez une mission,
          commandez un service, ou proposez vos compétences dès aujourd&apos;hui.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href="/inscription">
            <Button size="lg">Créer mon compte</Button>
          </Link>

          <Link href="/services">
            <Button variant="ghost" size="lg">
              Découvrir les services
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}