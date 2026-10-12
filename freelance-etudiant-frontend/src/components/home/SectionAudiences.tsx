import Link from "next/link";
import { BriefcaseBusiness, GraduationCap, Layers } from "lucide-react";

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
      "Explorez le catalogue de compétences, filtrez par filière ou domaine, et sélectionnez les meilleurs talents étudiants.",
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

function Volet({
  accent,
  icone: Icone,
  etiquette,
  titre,
  intro,
  piliers,
  lienHref,
  lienLabel,
}: {
  accent: "bleu" | "ocre";
  icone: typeof BriefcaseBusiness;
  etiquette: string;
  titre: string;
  intro: string;
  piliers: Pilier[];
  lienHref: string;
  lienLabel: string;
}) {
  const couleur = accent === "bleu" ? "text-bleu-dark" : "text-ocre-dark";
  const fond = accent === "bleu" ? "bg-bleu/10" : "bg-ocre/10";

  return (
    <div className="flex flex-col rounded-xl border border-ink/10 bg-paper-light p-6 sm:p-8">
      <div className="flex items-center gap-2.5">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${fond} ${couleur}`}
          aria-hidden="true"
        >
          <Icone size={16} />
        </span>
        <span
          className={`font-mono text-[11px] font-semibold uppercase tracking-[0.18em] ${couleur}`}
        >
          {etiquette}
        </span>
      </div>

      <h3 className="mt-4 font-display text-2xl font-semibold text-ink">
        {titre}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{intro}</p>

      <ul className="mt-6 divide-y divide-ink/10 border-y border-ink/10">
        {piliers.map((pilier) => (
          <li key={pilier.titre} className="py-4">
            <h4 className="text-sm font-semibold text-ink">{pilier.titre}</h4>
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">
              {pilier.description}
            </p>
          </li>
        ))}
      </ul>

      <Link
        href={lienHref}
        className={`mt-6 text-sm font-medium underline-offset-4 hover:underline ${couleur}`}
      >
        {lienLabel} →
      </Link>
    </div>
  );
}

/**
 * Les deux côtés de la marketplace, présentés sans bouton : une liste
 * de bénéfices et un unique lien par côté. Les aperçus de missions et de
 * services vivent dans leurs sections dédiées juste en dessous.
 */
export function SectionAudiences() {
  return (
    <section
      id="audiences"
      className="mx-auto max-w-6xl px-4 pb-12 pt-10 sm:px-5 sm:pb-16 sm:pt-14"
    >
      <SectionTitre
        icon={Layers}
        eyebrow="Une marketplace bilatérale"
        titre="Deux parcours connectés pour réussir ensemble"
        sousTitre="Que vous ayez un besoin ponctuel ou des compétences à offrir, Kianja offre à chacun un cadre transparent et sécurisé."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Volet
          accent="bleu"
          icone={BriefcaseBusiness}
          etiquette="Côté client"
          titre="Des étudiants prêts à vous aider"
          intro="Entreprises, startups, associations ou particuliers : accédez aux futurs diplômés pour donner vie à vos projets avec un excellent rapport qualité-prix."
          piliers={PILIERS_CLIENT}
          lienHref="/services"
          lienLabel="Trouver un étudiant"
        />
        <Volet
          accent="ocre"
          icone={GraduationCap}
          etiquette="Côté étudiant"
          titre="Des projets à réaliser"
          intro="Mettez en pratique vos acquis académiques, générez des revenus durant votre cursus et démarrez votre carrière avec une expérience concrète et vérifiée."
          piliers={PILIERS_ETUDIANT}
          lienHref="/missions"
          lienLabel="Trouver une mission"
        />
      </div>
    </section>
  );
}
