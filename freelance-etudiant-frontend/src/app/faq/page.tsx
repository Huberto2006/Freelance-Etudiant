import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown, CircleHelp, LifeBuoy } from "lucide-react";

import { EnTetePagePublique } from "@/components/layout/EnTetePagePublique";

export const metadata: Metadata = {
  title: "FAQ — Kianja",
  description:
    "Réponses aux questions fréquentes sur l'inscription, les publications, les candidatures, les livraisons et les paiements sur Kianja.",
};

interface Question {
  question: string;
  reponse: string;
}

interface Theme {
  id: string;
  titre: string;
  questions: Question[];
}

/**
 * Chaque réponse décrit uniquement ce que la plateforme fait réellement
 * aujourd'hui (vérifié sur le code frontend et backend). À mettre à jour
 * en même temps que les fonctionnalités concernées.
 */
const THEMES: Theme[] = [
  {
    id: "inscription",
    titre: "Inscription et compte",
    questions: [
      {
        question: "Qui peut rejoindre Kianja ?",
        reponse:
          "Les étudiants qui souhaitent proposer leurs compétences en freelance, et les clients (particuliers ou organisations) qui cherchent des talents. Vous choisissez votre profil au moment de l'inscription.",
      },
      {
        question: "Dois-je confirmer mon adresse e-mail ?",
        reponse:
          "Oui. Après l'inscription, un e-mail de vérification est envoyé : vous devez cliquer sur le lien reçu avant de pouvoir vous connecter. Si le lien a expiré, un nouvel e-mail peut être demandé depuis la page de connexion.",
      },
      {
        question: "J'ai oublié mon mot de passe, que faire ?",
        reponse:
          "Utilisez le lien « Mot de passe oublié » de la page de connexion : un e-mail vous permettra de choisir un nouveau mot de passe.",
      },
    ],
  },
  {
    id: "profils",
    titre: "Profils",
    questions: [
      {
        question: "Que dois-je renseigner dans mon profil étudiant ?",
        reponse:
          "Après l'inscription, un questionnaire vous aide à compléter votre profil : filière, spécialités, compétences, langues, tarifs, portfolio et description. Un profil complet aide les clients à mieux vous identifier.",
      },
      {
        question: "Qui peut consulter les profils des étudiants ?",
        reponse:
          "Les fiches des étudiants sont réservées aux utilisateurs connectés. Elles n'affichent pas l'e-mail ni le numéro de téléphone : on y trouve les informations utiles à la collaboration (compétences, formation, disponibilité, évaluations, portfolio).",
      },
    ],
  },
  {
    id: "publications",
    titre: "Publications",
    questions: [
      {
        question: "Quelle est la différence entre une mission et un service ?",
        reponse:
          "Une mission est un besoin publié par un client (budget, échéance, compétences recherchées). Un service est une prestation proposée par un étudiant. Les deux sont réunis dans la page Publications.",
      },
      {
        question: "Faut-il un compte pour parcourir les publications ?",
        reponse:
          "Non, vous pouvez consulter les missions et les services sans être connecté. Un compte est nécessaire pour agir : postuler, publier, échanger par messagerie ou consulter un profil étudiant.",
      },
    ],
  },
  {
    id: "candidatures",
    titre: "Candidatures",
    questions: [
      {
        question: "Comment postuler à une mission ?",
        reponse:
          "Connecté en tant qu'étudiant, ouvrez la mission qui vous intéresse et envoyez votre candidature. Vous la retrouvez ensuite dans « Mes candidatures » de votre tableau de bord.",
      },
      {
        question: "Comment un client choisit-il un étudiant ?",
        reponse:
          "Le client examine les candidatures reçues sur sa mission, consulte les profils et accepte la candidature qui lui convient. Les échanges se poursuivent ensuite par la messagerie de la plateforme.",
      },
    ],
  },
  {
    id: "services",
    titre: "Services",
    questions: [
      {
        question: "Comment proposer un service en tant qu'étudiant ?",
        reponse:
          "Depuis votre tableau de bord, la section « Mes services » vous permet de publier une prestation avec sa description, sa catégorie, son prix et son délai.",
      },
      {
        question: "Comment un client peut-il demander un service ?",
        reponse:
          "Un client connecté peut adresser une demande à l'étudiant depuis la page du service. Les demandes sont suivies dans la section « Demandes de service » du tableau de bord.",
      },
    ],
  },
  {
    id: "livraisons",
    titre: "Livraisons",
    questions: [
      {
        question: "Comment se passe la livraison d'un travail ?",
        reponse:
          "L'étudiant dépose ses livrables sur la plateforme depuis la section « Livraisons ». Le client les examine puis les valide, ce qui clôt la livraison et déclenche la libération du paiement.",
      },
    ],
  },
  {
    id: "paiements",
    titre: "Paiements",
    questions: [
      {
        question: "Comment fonctionne le paiement ?",
        reponse:
          "Le paiement peut être effectué dès qu'une candidature est acceptée. Les fonds sont conservés par la plateforme jusqu'à la validation de la livraison par le client, puis ils sont libérés au profit de l'étudiant.",
      },
      {
        question: "Quels moyens de paiement sont disponibles ?",
        reponse:
          "Le paiement en ligne est disponible via MVola. Un virement effectué hors plateforme peut aussi être déclaré ; il reste en attente jusqu'à sa vérification par l'équipe d'administration. Orange Money et Airtel Money ne sont pas encore disponibles en paiement en ligne.",
      },
      {
        question: "Que dois-je configurer pour être payé en tant qu'étudiant ?",
        reponse:
          "Vous devez enregistrer au moins un moyen de paiement actif dans les paramètres de votre tableau de bord : sans cela, un paiement ne peut pas être initié en votre faveur.",
      },
    ],
  },
  {
    id: "securite",
    titre: "Sécurité",
    questions: [
      {
        question: "Mes coordonnées privées sont-elles visibles ?",
        reponse:
          "Non. Les pages publiques et les fiches de profil n'affichent ni votre e-mail ni votre numéro de téléphone. Les documents échangés (livrables, pièces jointes) ne sont accessibles qu'aux personnes concernées.",
      },
      {
        question: "Comment signaler un comportement abusif ?",
        reponse:
          "Un bouton « Signaler » est disponible sur les profils des étudiants et des clients pour les utilisateurs connectés. Les signalements sont examinés par l'équipe d'administration.",
      },
    ],
  },
];

export default function PageFaq() {
  return (
    <div className="mx-auto max-w-4xl px-5 pb-8 pt-10 sm:pt-14">
      <EnTetePagePublique
        icon={CircleHelp}
        eyebrow="Centre d'aide"
        titre="Questions fréquentes"
        introduction="Retrouvez les réponses aux questions les plus courantes sur le fonctionnement de Kianja."
      />

      {/* Sommaire : ancres vers chaque thème */}
      <nav
        aria-label="Thèmes de la FAQ"
        className="mb-10 flex flex-wrap gap-2"
      >
        {THEMES.map((theme) => (
          <a
            key={theme.id}
            href={`#${theme.id}`}
            className="rounded-full border border-ink/15 bg-paper-light px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-bleu/40 hover:bg-bleu/10 hover:text-bleu-dark"
          >
            {theme.titre}
          </a>
        ))}
      </nav>

      <div className="space-y-10">
        {THEMES.map((theme) => (
          <section
            key={theme.id}
            id={theme.id}
            aria-labelledby={`${theme.id}-titre`}
            className="scroll-mt-24"
          >
            <h2
              id={`${theme.id}-titre`}
              className="font-display text-xl font-semibold text-ink"
            >
              {theme.titre}
            </h2>

            <div className="mt-4 divide-y divide-ink/10 overflow-hidden rounded-xl border border-ink/10 bg-paper-light shadow-xs">
              {theme.questions.map((element) => (
                <details key={element.question} className="group">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-sm font-medium text-ink marker:content-none hover:bg-ink/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-bleu [&::-webkit-details-marker]:hidden">
                    <span>{element.question}</span>
                    <ChevronDown
                      size={16}
                      aria-hidden="true"
                      className="shrink-0 text-ink-soft transition-transform group-open:rotate-180 motion-reduce:transition-none"
                    />
                  </summary>
                  <p className="px-4 pb-4 text-sm leading-relaxed text-ink-soft">
                    {element.reponse}
                  </p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Renvoi vers le contact */}
      <aside className="mt-12 flex flex-col items-start gap-4 rounded-2xl border border-ink/10 bg-paper-light p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bleu-soft text-bleu-dark"
          >
            <LifeBuoy size={18} />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">
              Vous ne trouvez pas votre réponse ?
            </p>
            <p className="mt-0.5 text-sm text-ink-soft">
              Écrivez-nous, nous vous répondrons dès que possible.
            </p>
          </div>
        </div>
        <Link
          href="/contact"
          className="inline-flex shrink-0 items-center justify-center rounded-lg border border-ink bg-ink px-4 py-2.5 text-sm font-medium text-paper-light transition-colors hover:bg-ink-soft"
        >
          Contact et assistance
        </Link>
      </aside>
    </div>
  );
}
