import Image from "next/image";
import { useTranslations } from "next-intl";
import { Briefcase, GraduationCap, UsersRound } from "lucide-react";

/**
 * Colonne de présentation des pages de connexion et d'inscription (desktop
 * uniquement). Purement informative : aucun chiffre, aucune donnée inventée.
 * Les formes sont décoratives (aria-hidden). Le titre et l'introduction
 * changent selon la page ; les trois points et l'illustration sont communs.
 */
export function PanneauPresentation({
  titre,
  intro,
}: {
  titre?: string;
  intro?: string;
}) {
  const t = useTranslations("auth.login");
  const th = useTranslations("home.hero");

  const points = [
    { icone: GraduationCap, titre: t("panel.students.title"), texte: t("panel.students.text") },
    { icone: Briefcase, titre: t("panel.clients.title"), texte: t("panel.clients.text") },
    { icone: UsersRound, titre: t("panel.community.title"), texte: t("panel.community.text") },
  ];

  return (
    <aside className="relative hidden overflow-hidden border-r border-ink/10 bg-ink/[0.03] lg:flex lg:items-center">
      {/* Formes douces décoratives */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-ocre/[0.07]" />
        <div className="absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-ink/[0.04]" />
        <div className="absolute bottom-24 left-12 h-24 w-24 rounded-3xl bg-ocre/[0.06] rotate-12" />
      </div>

      <div className="relative mx-auto flex w-full max-w-xl flex-col px-10 py-10 xl:px-16">

        <h2 className="animate-in font-display text-4xl font-semibold leading-tight tracking-tight text-ink xl:text-5xl">
          {titre ?? t("panel.title")}
        </h2>
        <p className="animate-in mt-4 max-w-md text-base leading-relaxed text-ink-soft [animation-delay:40ms]">
          {intro ?? t("panel.intro")}
        </p>

        <ul className="mt-9 flex flex-col gap-5">
          {points.map(({ icone: Icone, titre, texte }, i) => (
            <li
              key={titre}
              className="animate-in flex items-start gap-3.5"
              style={{ animationDelay: `${80 + i * 40}ms` }}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-ink/10 bg-paper-light text-ocre-dark">
                <Icone size={17} aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-ink">{titre}</span>
                <span className="block text-sm text-ink-soft">{texte}</span>
              </span>
            </li>
          ))}
        </ul>

        {/* Illustration détourée : sa forme bleue et ses badges sont incrustés
            dans l'image (aucune pastille HTML en doublon). Sa hauteur suit
            celle de l'écran pour que la colonne ne déborde jamais. */}
        <Image
          src="/images/heros-kianja.webp"
          alt={th("imageAlt")}
          width={1536}
          height={1024}
          sizes="(min-width: 1280px) 520px, 440px"
          className="animate-in mx-auto mt-8 h-auto max-h-[32dvh] w-auto max-w-full select-none object-contain [animation-delay:200ms]"
        />
      </div>
    </aside>
  );
}
