import { useTranslations } from "next-intl";
import {
  Briefcase,
  GraduationCap,
  Layers,
  Users,
  UsersRound,
} from "lucide-react";

/**
 * Colonne de présentation de la page de connexion (desktop uniquement).
 * Purement informative : aucun chiffre, aucune donnée inventée. Les formes
 * et pastilles sont décoratives (aria-hidden).
 */
export function PanneauPresentation() {
  const t = useTranslations("auth.login");

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

      <div className="relative mx-auto flex w-full max-w-xl flex-col px-10 py-14 xl:px-16">
        {/* Fond blanc fixe : le logo (texte bleu nuit) reste lisible en mode sombre. */}
        <div className="animate-in mb-10 flex h-24 w-fit items-center rounded-xl border border-ink/10 bg-white px-4 shadow-xs">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo-kianja.png"
            alt="Kianja"
            className="h-20 w-auto object-contain"
          />
        </div>

        <h2 className="animate-in font-display text-4xl font-semibold leading-tight tracking-tight text-ink xl:text-5xl">
          {t("panel.title")}
        </h2>
        <p className="animate-in mt-4 max-w-md text-base leading-relaxed text-ink-soft [animation-delay:40ms]">
          {t("panel.intro")}
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

        {/* Pastilles : composition décalée, sans donnée chiffrée */}
        <div aria-hidden="true" className="mt-12 flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-2 rounded-lg border border-ink/10 bg-paper-light px-3 py-2 text-xs font-medium text-ink shadow-xs">
            <Briefcase size={14} className="text-ocre-dark" />
            {t("panel.badgeMissions")}
          </span>
          <span className="flex translate-y-2 items-center gap-2 rounded-lg border border-ink/10 bg-paper-light px-3 py-2 text-xs font-medium text-ink shadow-xs">
            <Layers size={14} className="text-ocre-dark" />
            {t("panel.badgeServices")}
          </span>
          <span className="flex items-center gap-2 rounded-lg border border-ink/10 bg-paper-light px-3 py-2 text-xs font-medium text-ink shadow-xs">
            <Users size={14} className="text-ocre-dark" />
            {t("panel.badgeStudents")}
          </span>
        </div>
      </div>
    </aside>
  );
}
