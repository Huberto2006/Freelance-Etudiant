import {
  ArrowRightLeft,
  BriefcaseBusiness,
  GraduationCap,
} from "lucide-react";

import { SectionTitre } from "./SectionTitre";

interface EtapeFonctionnement {
  titre: string;
  detail: string;
}

const ETAPES_CLIENT: EtapeFonctionnement[] = [
  {
    titre: "Publiez votre besoin",
    detail: "Déposez une mission avec budget et échéance, ou parcourez les services étudiants.",
  },
  {
    titre: "Recevez des candidatures",
    detail: "Comparez les profils, les portfolios et les propositions des étudiants.",
  },
  {
    titre: "Choisissez votre étudiant",
    detail: "Sélectionnez le candidat qui correspond le mieux à vos exigences techniques.",
  },
  {
    titre: "Échangez par messagerie",
    detail: "Communiquez directement via la messagerie interne pour cadrer le travail.",
  },
  {
    titre: "Suivez la réalisation",
    detail: "Gardez une visibilité complète sur l'avancement jusqu'à la livraison finale.",
  },
  {
    titre: "Validez et évaluez",
    detail: "Réceptionnez les livrables, débloquez le paiement et notez le freelance.",
  },
];

const ETAPES_ETUDIANT: EtapeFonctionnement[] = [
  {
    titre: "Créez votre profil",
    detail: "Indiquez votre filière, votre spécialité et vos compétences clés.",
  },
  {
    titre: "Présentez vos services",
    detail: "Affichez des prestations prêtes à l'achat ou consultez les missions ouvertes.",
  },
  {
    titre: "Postulez aux missions",
    detail: "Envoyez votre candidature argumentée avec votre tarif et votre délai.",
  },
  {
    titre: "Échangez avec le client",
    detail: "Précisez le cahier des charges et fixez les livrables attendus.",
  },
  {
    titre: "Réalisez et livrez",
    detail: "Produisez un travail de qualité et déposez vos livrables sur la plateforme.",
  },
  {
    titre: "Bâtissez votre réputation",
    detail: "Obtenez un avis client vérifié qui valorise votre réputation et votre portfolio.",
  },
];

function Parcours({
  titre,
  etapes,
  accent,
}: {
  titre: string;
  etapes: EtapeFonctionnement[];
  accent: "bleu" | "ocre";
}) {
  const isBleu = accent === "bleu";

  return (
    <div className="flex h-full flex-col">
      <h3 className="font-display text-xl font-bold text-ink">{titre}</h3>

      <div className="mt-6 space-y-4">
        {etapes.map((etape, index) => (
          <div key={etape.titre} className="relative flex items-start gap-3.5">
            {/* Numérotation */}
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold ${
                isBleu
                  ? "bg-bleu/10 text-bleu-dark"
                  : "bg-ocre/10 text-ocre-dark"
              }`}
            >
              {index + 1}
            </span>

            <div className="min-w-0 pt-0.5">
              <h4 className="text-sm font-semibold text-ink">{etape.titre}</h4>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
                {etape.detail}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SectionFonctionnement() {
  return (
    <section id="fonctionnement" className="mt-16 scroll-mt-24 sm:mt-20">
      <SectionTitre
        icon={ArrowRightLeft}
        eyebrow="Processus simplifié"
        titre="Comment fonctionne la marketplace Kianja"
        sousTitre="Du premier contact à la validation finale, chaque étape est pensée pour garantir la réussite du projet."
      />

      <div className="grid gap-8 rounded-xl border border-ink/10 bg-paper-light p-6 sm:p-8 lg:grid-cols-2 lg:gap-12">
        {/* Volet Client */}
        <div className="flex flex-col">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-bleu/10 text-bleu-dark">
              <BriefcaseBusiness size={15} aria-hidden="true" />
            </span>
            <span className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-bleu-dark">
              Parcours Client
            </span>
          </div>

          <Parcours
            titre="De votre besoin à la livraison finale"
            etapes={ETAPES_CLIENT}
            accent="bleu"
          />
        </div>

        {/* Volet Étudiant */}
        <div className="flex flex-col border-t border-ink/10 pt-8 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ocre/10 text-ocre-dark">
              <GraduationCap size={15} aria-hidden="true" />
            </span>
            <span className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-ocre-dark">
              Parcours Étudiant
            </span>
          </div>

          <Parcours
            titre="De vos compétences à vos premiers revenus"
            etapes={ETAPES_ETUDIANT}
            accent="ocre"
          />
        </div>
      </div>
    </section>
  );
}