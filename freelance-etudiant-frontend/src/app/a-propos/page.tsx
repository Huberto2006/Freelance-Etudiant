import type { Metadata } from "next";
import Link from "next/link";
import {
  Compass,
  Handshake,
  Info,
  Lock,
  Scale,
  Sprout,
} from "lucide-react";

import { EnTetePagePublique } from "@/components/layout/EnTetePagePublique";

export const metadata: Metadata = {
  title: "À propos — Kianja",
  description:
    "Kianja met en relation des étudiants freelances et des clients qui ont besoin de leurs compétences.",
};

const ETAPES = [
  {
    titre: "Un besoin ou une compétence",
    detail:
      "Un client publie une mission, ou un étudiant présente un service qu'il propose.",
  },
  {
    titre: "Une mise en relation",
    detail:
      "Les étudiants postulent aux missions, les clients examinent les candidatures ou demandent un service, et chacun échange par la messagerie de la plateforme.",
  },
  {
    titre: "Un travail livré et validé",
    detail:
      "L'étudiant dépose ses livrables, le client les valide, puis le paiement est libéré et chacun peut évaluer l'autre.",
  },
];

const VALEURS = [
  {
    icon: Sprout,
    titre: "Ouvrir des opportunités",
    detail:
      "Permettre à chaque étudiant de valoriser ses compétences dès ses études, quel que soit son établissement.",
  },
  {
    icon: Scale,
    titre: "Rester clair",
    detail:
      "Des missions, des services et des profils lisibles, pour que chacun sache ce qu'il propose ou ce qu'il attend.",
  },
  {
    icon: Lock,
    titre: "Protéger les données",
    detail:
      "Les profils ne montrent que des informations utiles à la collaboration ; les coordonnées privées ne sont pas affichées.",
  },
  {
    icon: Handshake,
    titre: "Bâtir la confiance",
    detail:
      "Paiement conservé jusqu'à la validation de la livraison, évaluations et signalements pour des échanges de confiance.",
  },
];

export default function PageAPropos() {
  return (
    <div className="mx-auto max-w-4xl px-5 pb-8 pt-10 sm:pt-14">
      <EnTetePagePublique
        icon={Info}
        eyebrow="À propos"
        titre="Kianja relie les compétences des étudiants aux besoins des clients"
        introduction="Une place de marché pensée pour tous les étudiants qui veulent proposer leurs compétences en freelance, et pour les clients qui cherchent des talents."
      />

      {/* ------------------------------------------------ MISSION */}
      <section aria-labelledby="mission" className="mb-12">
        <h2
          id="mission"
          className="font-display text-2xl font-semibold text-ink"
        >
          Notre mission
        </h2>
        <div className="mt-3 space-y-3 text-base leading-relaxed text-ink-soft">
          <p>
            Kianja a pour mission de faciliter la rencontre entre des
            étudiants freelances et des clients, particuliers ou
            organisations, qui ont besoin d&apos;un travail précis :
            développement, design, rédaction, traduction, marketing et
            bien d&apos;autres domaines.
          </p>
          <p>
            La plateforme s&apos;adresse à l&apos;ensemble des étudiants,
            sans distinction d&apos;établissement : ce qui compte, ce sont
            leurs compétences.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------ PROBLÈME */}
      <section aria-labelledby="probleme" className="mb-12">
        <h2
          id="probleme"
          className="font-display text-2xl font-semibold text-ink"
        >
          Le problème auquel nous répondons
        </h2>
        <div className="mt-3 space-y-3 text-base leading-relaxed text-ink-soft">
          <p>
            Beaucoup d&apos;étudiants ont des compétences utiles mais peu
            de moyens de les faire connaître ou de décrocher leurs
            premières missions. De leur côté, les clients ont du mal à
            trouver rapidement des profils fiables pour des besoins
            ponctuels.
          </p>
          <p>
            Kianja rassemble missions, services et profils au même endroit
            et encadre la collaboration, de la candidature jusqu&apos;à la
            livraison.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------ FONCTIONNEMENT */}
      <section aria-labelledby="fonctionnement" className="mb-12">
        <h2
          id="fonctionnement"
          className="font-display text-2xl font-semibold text-ink"
        >
          Comment ça fonctionne
        </h2>
        <ol className="mt-5 grid gap-4 sm:grid-cols-3">
          {ETAPES.map((etape, index) => (
            <li
              key={etape.titre}
              className="rounded-xl border border-ink/10 bg-paper-light p-5 shadow-xs"
            >
              <span
                aria-hidden="true"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-ink font-mono text-xs font-semibold text-paper-light"
              >
                {index + 1}
              </span>
              <h3 className="mt-3 text-sm font-semibold text-ink">
                {etape.titre}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                {etape.detail}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* ------------------------------------------------ VALEURS */}
      <section aria-labelledby="valeurs" className="mb-12">
        <h2
          id="valeurs"
          className="font-display text-2xl font-semibold text-ink"
        >
          Nos valeurs
        </h2>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          {VALEURS.map((valeur) => {
            const Icone = valeur.icon;
            return (
              <li
                key={valeur.titre}
                className="flex gap-3 rounded-xl border border-ink/10 bg-paper-light p-5 shadow-xs"
              >
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ocre/10 text-ocre-dark"
                >
                  <Icone size={17} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-ink">
                    {valeur.titre}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                    {valeur.detail}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ------------------------------------------------ VISION */}
      <section aria-labelledby="vision" className="mb-12">
        <h2
          id="vision"
          className="font-display text-2xl font-semibold text-ink"
        >
          Notre vision
        </h2>
        <p className="mt-3 text-base leading-relaxed text-ink-soft">
          Faire de Kianja un point de rencontre de référence où les
          étudiants construisent leur expérience professionnelle et où les
          clients trouvent les compétences dont ils ont besoin.
        </p>
      </section>

      {/* ------------------------------------------------ APPEL À L'ACTION */}
      <section
        aria-labelledby="rejoindre"
        className="rounded-2xl border border-ink/10 bg-paper-light p-6 text-center shadow-sm sm:p-8"
      >
        <span
          aria-hidden="true"
          className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-bleu-soft text-bleu-dark"
        >
          <Compass size={20} />
        </span>
        <h2
          id="rejoindre"
          className="mt-3 font-display text-xl font-semibold text-ink"
        >
          Envie d&apos;en savoir plus ?
        </h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-ink-soft">
          Parcourez les publications ou créez votre compte pour proposer vos
          compétences ou publier un besoin.
        </p>
        <div className="mt-5 flex flex-col justify-center gap-2.5 sm:flex-row">
          <Link
            href="/publications"
            className="inline-flex items-center justify-center rounded-lg border border-ink/30 px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink hover:bg-ink/5"
          >
            Explorer les publications
          </Link>
          <Link
            href="/inscription"
            className="inline-flex items-center justify-center rounded-lg border border-ink bg-ink px-4 py-2.5 text-sm font-medium text-paper-light transition-colors hover:bg-ink-soft"
          >
            Rejoindre Kianja
          </Link>
        </div>
      </section>
    </div>
  );
}
