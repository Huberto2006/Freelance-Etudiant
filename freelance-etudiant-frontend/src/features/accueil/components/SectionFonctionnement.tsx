import { useTranslations } from "next-intl";
import {
  ArrowRightLeft,
  BriefcaseBusiness,
  GraduationCap,
} from "lucide-react";

import { SectionTitre } from "./SectionTitre";

interface EtapeFonctionnement {
  cle: string;
}

const ETAPES_CLIENT: EtapeFonctionnement[] = [{ cle: "s1" }, { cle: "s2" }, { cle: "s3" }, { cle: "s4" }, { cle: "s5" }, { cle: "s6" }];

const ETAPES_ETUDIANT: EtapeFonctionnement[] = [{ cle: "s1" }, { cle: "s2" }, { cle: "s3" }, { cle: "s4" }, { cle: "s5" }, { cle: "s6" }];

function Parcours({
  ns,
  titre,
  etapes,
  accent,
}: {
  ns: "client" | "student";
  titre: string;
  etapes: EtapeFonctionnement[];
  accent: "bleu" | "ocre";
}) {
  const t = useTranslations("home.process");
  const isBleu = accent === "bleu";

  return (
    <div className="flex h-full flex-col">
      <h3 className="font-display text-xl font-bold text-ink">{titre}</h3>

      <div className="mt-6 space-y-4">
        {etapes.map((etape, index) => (
          <div key={etape.cle} className="relative flex items-start gap-3.5">
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
              <h4 className="text-sm font-semibold text-ink">{t(`${ns}.${etape.cle}.title` as never)}</h4>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
                {t(`${ns}.${etape.cle}.detail` as never)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SectionFonctionnement() {
  const t = useTranslations("home.process");
  return (
    <section id="fonctionnement" className="mx-auto max-w-7xl px-4 pb-7 sm:px-5 sm:pb-10">
      <SectionTitre
        icon={ArrowRightLeft}
        eyebrow={t("eyebrow")}
        titre={t("title")}
        sousTitre={t("subtitle")}
      />

      <div className="reveal grid gap-7 rounded-xl border border-ink/10 bg-paper-light p-6 sm:p-8 lg:grid-cols-2 lg:gap-10">
        {/* Volet Client */}
        <div className="flex flex-col">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-bleu/10 text-bleu-dark">
              <BriefcaseBusiness size={15} aria-hidden="true" />
            </span>
            <span className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-bleu-dark">
              {t("clientTrack")}
            </span>
          </div>

          <Parcours
            ns="client"
            titre={t("clientTrackTitle")}
            etapes={ETAPES_CLIENT}
            accent="bleu"
          />
        </div>

        {/* Volet Étudiant */}
        <div className="flex flex-col border-t border-ink/10 pt-7 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ocre/10 text-ocre-dark">
              <GraduationCap size={15} aria-hidden="true" />
            </span>
            <span className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-ocre-dark">
              {t("studentTrack")}
            </span>
          </div>

          <Parcours
            ns="student"
            titre={t("studentTrackTitle")}
            etapes={ETAPES_ETUDIANT}
            accent="ocre"
          />
        </div>
      </div>
    </section>
  );
}