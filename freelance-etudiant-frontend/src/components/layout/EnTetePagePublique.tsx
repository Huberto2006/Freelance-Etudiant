import type { ComponentType, ReactNode } from "react";
import type { LucideProps } from "lucide-react";

/**
 * En-tête commun des pages d'information publiques (À propos, FAQ,
 * Contact, Freelances) : médaillon-icône, eyebrow mono, titre display et
 * introduction. Même rythme visuel que SectionTitre / PageHeader.
 */
export function EnTetePagePublique({
  icon: Icon,
  eyebrow,
  titre,
  introduction,
}: {
  icon: ComponentType<LucideProps>;
  eyebrow: string;
  titre: ReactNode;
  introduction?: ReactNode;
}) {
  return (
    <header className="animate-in mb-10">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ocre/10 text-ocre-dark"
        >
          <Icon size={20} />
        </span>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-ocre-dark">
          {eyebrow}
        </p>
      </div>

      <h1 className="mt-4 font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
        {titre}
      </h1>

      {introduction && (
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-soft">
          {introduction}
        </p>
      )}
    </header>
  );
}
