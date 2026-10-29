import { clsx } from "clsx";
import { useTranslations } from "next-intl";
import type { ComponentType, MouseEvent, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import type { LucideProps } from "lucide-react";

import { CompteurAnime } from "./CompteurAnime";

/**
 * Surface standard (carte, panneau, ligne de liste). Statique par défaut :
 * bordure fine, ombre quasi nulle. `interactif` ajoute le retour au survol
 * (élévation de 1 px) et ne doit être posé que sur une surface qui est
 * réellement cliquable en entier.
 */
export function NoticeCard({
  children,
  className,
  onClick,
  interactif = false,
}: {
  children: ReactNode;
  className?: string;
  onClick?: (event: MouseEvent<HTMLDivElement>) => void;
  interactif?: boolean;
}) {
  return (
    <div
      className={clsx(
        "notice-card p-5",
        interactif && "card-link cursor-pointer",
        className,
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function StampBadge({
  score,
  size = 64,
}: {
  score: number;
  size?: number;
}) {
  const t = useTranslations("extras.shared");
  const arrondi = Math.round(score);
  return (
    <div
      className="stamp shrink-0"
      style={{ width: size, height: size }}
      title={t("reputationScore", { score: arrondi })}
    >
      <span className="text-lg font-bold leading-none">{arrondi}</span>
      <span className="text-[0.625rem] uppercase tracking-wider mt-0.5">{t("score")}</span>
    </div>
  );
}

export type ToneTag = "ink" | "ocre" | "rice" | "brique" | "bleu";

export function Tag({
  children,
  tone = "ink",
  className,
}: {
  children: ReactNode;
  tone?: ToneTag;
  className?: string;
}) {
  const tones: Record<ToneTag, string> = {
    ink: "border-ink/20 text-ink-soft bg-ink/[0.03]",
    ocre: "border-ocre-dark/35 text-ocre-dark bg-ocre/10",
    rice: "border-rice/35 text-rice bg-rice/10",
    brique: "border-brique/35 text-brique bg-brique/10",
    bleu: "border-bleu-dark/30 text-bleu-dark bg-bleu-soft",
  };
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium leading-5",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/*
 * ============================================================
 * BADGES DE STATUT — source unique pour toute l'application
 * ============================================================
 */

/**
 * Correspondance statut métier -> ton visuel du badge.
 * Aucune statut n'est créée ici : uniquement la mise en forme des
 * statuts déjà définis par le backend (types.ts / format.ts).
 *
 * Convention Kianja :
 * - attente / neutre        -> "ocre"
 * - positif / en cours      -> "rice"
 * - négatif / erreur        -> "brique"
 * - ouvert / disponible     -> "bleu" (interaction disponible)
 * - terminé / archivé       -> "ink"
 */
const TONS_PAR_STATUT: Record<string, ToneTag> = {
  // --- Missions ---
  ouverte: "bleu",
  en_cours: "rice",
  terminee: "ink",
  fermee: "ink",
  expiree: "brique",

  // --- Candidatures / demandes de service / invitations ---
  en_attente: "ocre",
  acceptee: "rice",
  refusee: "brique",

  // --- Livraisons ---
  validee: "rice",
  correction_demandee: "brique",

  // --- Transactions / paiements ---
  confirmee: "rice",
  liberee: "rice",
  annulee: "brique",

  // --- Services ---
  disponible: "bleu",

  // --- Signalements (admin) ---
  ouvert: "bleu",
  traite: "rice",
};

export function toneStatut(statut: string): ToneTag {
  return TONS_PAR_STATUT[statut] ?? "ink";
}

/**
 * Badge de statut standard : ton automatique selon le statut métier
 * (toneStatut) + libellé français issu des cartes de format.ts.
 * Réutilisée par missions, services, candidatures, livraisons,
 * paiements, évaluations, groupes… pour une mise en forme homogène.
 */
export function BadgeStatut({
  statut,
  labels,
  className,
}: {
  statut: string;
  /** Carte de libellés (ex. statutCandidatureLabel). */
  labels: Record<string, string>;
  className?: string;
}) {
  return (
    <Tag tone={toneStatut(statut)} className={className}>
      {/* Pastille : le statut ne repose jamais sur la couleur seule, le
          libellé textuel reste toujours présent. */}
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full bg-current"
        aria-hidden="true"
      />
      {labels[statut] ?? statut}
    </Tag>
  );
}

/**
 * Intertitre standard des pages publiques (profil étudiant, profil client…)
 * : une seule source de vérité pour l'échelle de texte et la marge basse,
 * évite les h2 aux tailles/espacements disparates.
 *
 * À ne pas confondre avec components/home/SectionTitre.tsx, qui est
 * l'en-tête de bloc illustré de la page d'accueil (médaillon + eyebrow).
 */
export function SousTitreSection({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2 className={clsx("mb-4 font-display text-lg font-semibold", className)}>
      {children}
    </h2>
  );
}

/**
 * Message d'état vide standard (« Aucun avis pour le moment. », etc.),
 * réutilisé par toutes les listes potentiellement vides.
 */
export function MessageVide({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <p className={clsx("text-sm text-ink-soft/70", className)}>{children}</p>;
}

/**
 * En-tête de page standard : rubrique (petite icône + intitulé), titre,
 * description facultative et zone d'actions facultative alignée à droite.
 * L'icône sert de repère de rubrique à 14 px ; elle ne forme plus de
 * médaillon, pour que l'en-tête ne concurrence pas le contenu.
 */
export function PageHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
  actions,
  tone = "ocre",
  className,
}: {
  icon: ComponentType<LucideProps>;
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  /** Actions principales de la page (ex. « Publier une mission »). */
  actions?: ReactNode;
  tone?: "ocre" | "rice" | "brique" | "ink";
  className?: string;
}) {
  const icones: Record<string, string> = {
    ocre: "text-ocre-dark",
    rice: "text-rice",
    brique: "text-brique",
    ink: "text-ink",
  };
  return (
    <header
      className={clsx(
        "animate-in mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.08em] text-ink-soft">
          <Icon size={14} className={icones[tone]} aria-hidden="true" />
          {eyebrow}
        </p>
        <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-soft">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  );
}

/**
 * État vide standard (liste sans résultat) : médaillon-icône + texte
 * centré, dans une NoticeCard. Avant ce composant, ce même geste visuel
 * (icône dans un médaillon `bg-ink/5`, texte `text-ink-soft/70`, `py-8
 * text-center`) était réécrit à la main dans chaque page — avec de
 * légères variations (icône nue vs médaillon, tailles différentes) qui
 * le rendaient visuellement moins cohérent d'une page à l'autre.
 * `MessageVide` ci-dessus reste approprié pour une simple ligne de texte
 * dans un contexte déjà encadré (ex. sous un `SousTitreSection`) ; ce
 * composant-ci est pour un état vide qui occupe toute la zone de liste.
 */
export function EtatVide({
  icon: Icon,
  children,
  action,
  className,
}: {
  icon: ComponentType<LucideProps>;
  children: ReactNode;
  /** Bouton optionnel sous le texte (ex. « Publier une mission »). */
  action?: ReactNode;
  className?: string;
}) {
  return (
    <NoticeCard
      className={clsx(
        "animate-in flex flex-col items-center gap-3 py-8 text-center",
        className,
      )}
    >
      <span
        className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink/5 text-ink-soft"
        aria-hidden="true"
      >
        <Icon size={20} />
      </span>
      <p className="max-w-sm text-sm text-ink-soft">{children}</p>
      {action}
    </NoticeCard>
  );
}

/**
 * Écran de chargement standard (page ou section en attente de données).
 * Avant ce composant, le même `<p className="text-sm text-ink-soft">
 * Chargement…</p>` était répété tel quel dans une vingtaine de fichiers —
 * toute évolution (icône animée, délai avant affichage...) aurait dû être
 * appliquée partout à la main.
 */
export function ChargementPage({ className }: { className?: string }) {
  const t = useTranslations("common.states");
  return (
    // Apparition retardée de 200 ms : un chargement quasi instantané
    // n'affiche donc aucun indicateur qui clignote.
    <p
      role="status"
      aria-live="polite"
      style={{ animationDelay: "200ms" }}
      className={clsx(
        "animate-in-fade flex items-center gap-2 text-sm text-ink-soft",
        className,
      )}
    >
      <LoaderCircle
        size={15}
        aria-hidden="true"
        className="shrink-0 motion-safe:animate-spin"
      />
      {t("loading")}
    </p>
  );
}

/**
 * Carte de statistique "punaisee" : icone dans un medaillon,
 * label mono, grande valeur en display, et une sous-legende
 * optionnelle. Base de toutes les tuiles de statistiques.
 */
export function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  tone = "ocre",
  className,
}: {
  icon: ComponentType<LucideProps>;
  label: string;
  value: ReactNode;
  sublabel?: ReactNode;
  tone?: "ocre" | "rice" | "brique" | "ink";
  className?: string;
}) {
  const icones: Record<string, string> = {
    ocre: "text-ocre-dark",
    rice: "text-rice",
    brique: "text-brique",
    ink: "text-ink-soft",
  };
  return (
    <NoticeCard className={clsx("flex flex-col gap-2", className)}>
      <p className="flex items-center gap-2 text-xs font-medium text-ink-soft">
        <Icon
          size={15}
          strokeWidth={2}
          className={clsx("shrink-0", icones[tone])}
          aria-hidden="true"
        />
        {label}
      </p>
      <p className="font-display text-3xl font-semibold leading-none tabular-nums">
        {typeof value === "number" && Number.isInteger(value) ? (
          <CompteurAnime valeur={value} />
        ) : (
          value
        )}
      </p>
      {sublabel && <p className="text-xs text-ink-soft/80">{sublabel}</p>}
    </NoticeCard>
  );
}
