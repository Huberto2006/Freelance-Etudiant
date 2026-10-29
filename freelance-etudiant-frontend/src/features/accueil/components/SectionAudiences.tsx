import Link from "next/link";
import { useTranslations } from "next-intl";
import { BriefcaseBusiness, GraduationCap, Layers } from "lucide-react";

import { SectionTitre } from "./SectionTitre";

interface Pilier {
  cle: string;
}

const PILIERS_CLIENT: Pilier[] = [{ cle: "publish" }, { cle: "find" }, { cle: "follow" }];

const PILIERS_ETUDIANT: Pilier[] = [{ cle: "offer" }, { cle: "find" }, { cle: "grow" }];

function Volet({
  ns,
  accent,
  icone: Icone,
  etiquette,
  titre,
  intro,
  piliers,
  lienHref,
  lienLabel,
}: {
  ns: "client" | "student";
  accent: "bleu" | "ocre";
  icone: typeof BriefcaseBusiness;
  etiquette: string;
  titre: string;
  intro: string;
  piliers: Pilier[];
  lienHref: string;
  lienLabel: string;
}) {
  const t = useTranslations("home.audiences");
  const couleur = accent === "bleu" ? "text-bleu-dark" : "text-ocre-dark";
  const fond = accent === "bleu" ? "bg-bleu/10" : "bg-ocre/10";

  return (
    <div className="flex flex-col rounded-lg border border-ink/10 bg-paper-light p-6 sm:p-8">
      <div className="flex items-center gap-2.5">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-md ${fond} ${couleur}`}
          aria-hidden="true"
        >
          <Icone size={16} />
        </span>
        <span
          className={`text-xs font-semibold uppercase tracking-[0.08em] ${couleur}`}
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
          <li key={pilier.cle} className="py-4">
            <h4 className="text-sm font-semibold text-ink">{t(`${ns}.pillars.${pilier.cle}.title` as never)}</h4>
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">
              {t(`${ns}.pillars.${pilier.cle}.description` as never)}
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
  const t = useTranslations("home.audiences");
  return (
    <section
      id="audiences"
      className="mx-auto max-w-6xl px-4 pb-12 pt-10 sm:px-5 sm:pb-16 sm:pt-14"
    >
      <SectionTitre
        icon={Layers}
        eyebrow={t("eyebrow")}
        titre={t("title")}
        sousTitre={t("subtitle")}
      />

      <div className="reveal-grille grid gap-6 lg:grid-cols-2">
        <Volet
          ns="client"
          accent="bleu"
          icone={BriefcaseBusiness}
          etiquette={t("client.label")}
          titre={t("client.title")}
          intro={t("client.intro")}
          piliers={PILIERS_CLIENT}
          lienHref="/services"
          lienLabel={t("client.link")}
        />
        <Volet
          ns="student"
          accent="ocre"
          icone={GraduationCap}
          etiquette={t("student.label")}
          titre={t("student.title")}
          intro={t("student.intro")}
          piliers={PILIERS_ETUDIANT}
          lienHref="/missions"
          lienLabel={t("student.link")}
        />
      </div>
    </section>
  );
}
