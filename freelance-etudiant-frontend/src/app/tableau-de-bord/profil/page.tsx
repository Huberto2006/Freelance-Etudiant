"use client";
import {
  User,
  Palette,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { useTranslations } from "next-intl";
import { NoticeCard, PageHeader } from "@/components/ui/Notice";
import { SelecteurTheme } from "@/features/theme/components/SelecteurTheme";
import { ThemeCondition } from "@/features/theme/components/ThemeCondition";
import { ProfilEtudiant } from "@/features/profils/components/ProfilEtudiant";
import { ProfilClient } from "@/features/profils/components/ProfilClient";

export default function ProfilPage() {
  const { utilisateur } = useAuth();
  const t = useTranslations("profilePage");

  if (!utilisateur) return null;

  return (
    <div className="space-y-7">
      {utilisateur.role === "etudiant" ? (
        <ProfilEtudiant utilisateur={utilisateur} />
      ) : utilisateur.role === "client" ? (
        <ProfilClient utilisateur={utilisateur} />
      ) : (
        <div className="space-y-6">
          <PageHeader icon={User} eyebrow={t("yourAccount")} title={t("myProfile")} />

          <NoticeCard>
            <div className="flex items-center gap-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ocre/10 text-ocre-dark">
                <User size={20} />
              </span>

              <div>
                <p className="font-display text-lg font-medium">
                  {utilisateur.nom}
                </p>
                <p className="text-sm text-ink-soft">{utilisateur.email}</p>
              </div>
            </div>

            <p className="mt-5 text-sm text-ink-soft">
              {t("adminNoProfile")}
            </p>
          </NoticeCard>
        </div>
      )}

      {/* =========================================================
          SECTION APPARENCE & THÈME
      ========================================================= */}
      <ThemeCondition>
        <section aria-labelledby="theme-section-title" className="pt-2">
          <PageHeader
            icon={Palette}
            eyebrow={t("personalisation")}
            title={t("appearanceTheme")}
          />

          <NoticeCard>
            <SelecteurTheme variante="complet" />
          </NoticeCard>
        </section>
      </ThemeCondition>
    </div>
  );
}
