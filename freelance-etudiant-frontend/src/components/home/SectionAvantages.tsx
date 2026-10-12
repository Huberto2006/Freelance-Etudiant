"use client";

import Link from "next/link";
import {
  GraduationCap,
  HandCoins,
  MessagesSquare,
  Rocket,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { NoticeCard } from "@/components/ui/Notice";
import { useAuth } from "@/lib/auth-context";
import { SectionTitre } from "./SectionTitre";

const AVANTAGES = [
  {
    icon: GraduationCap,
    titre: "Des talents étudiants qualifiés",
    texte:
      "Des étudiants formés aux standards actuels, aux compétences validées et notés par leurs clients après chaque livraison.",
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
  const { utilisateur, chargement } = useAuth();

  return (
    <section id="avantages" className="mx-auto max-w-6xl px-4 pb-8 sm:px-5 sm:pb-12">
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

      {/* Appel à l'action final : un seul bloc, masqué pour les connectés */}
      {!chargement && !utilisateur && (
        <div className="mt-14 rounded-2xl border border-ink/10 bg-paper-light px-6 py-10 text-center sm:px-10">
          <h3 className="font-display text-2xl font-semibold sm:text-3xl">
            Prêt à démarrer sur Kianja ?
          </h3>
          <p className="mx-auto mt-2 max-w-lg text-sm text-ink-soft">
            Confiez un besoin à des étudiants qualifiés ou valorisez vos
            compétences auprès de vrais clients.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
            <Button href="/inscription" size="lg">
              Créer un compte gratuitement
            </Button>
            <Link
              href="/publications"
              className="text-sm font-medium text-ink underline-offset-4 hover:underline"
            >
              Explorer les publications →
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}