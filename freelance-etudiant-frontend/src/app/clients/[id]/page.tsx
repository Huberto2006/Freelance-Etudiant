"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Briefcase,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ShieldCheck,
  User,
} from "lucide-react";

import { api } from "@/lib/api";
import type { Mission } from "@/types/missions";
import type { ClientProfile } from "@/types/utilisateurs";
import { useFormats } from "@/i18n/use-formats";
import { useLabels } from "@/i18n/use-labels";
import {
  MessageVide,
  NoticeCard,
  Tag,
  toneStatut,
} from "@/components/ui/Notice";
import { Avatar } from "@/components/ui/Avatar";
import { ReactionProfil } from "@/features/reactions/components/ReactionProfil";
import { SignalerBouton } from "@/features/signalements/components/SignalerBouton";
import { BoutonRetour } from "@/components/ui/BoutonRetour";

export default function ProfilClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("profile");
  const { argent: formatArgent, dateCourte: formatDateCourte } = useFormats();
  const { statutMission } = useLabels();
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      api.get<ClientProfile>(`/clients/${id}`, { auth: false }),
      api.get<Mission[]>(`/missions`, { auth: false }),
    ])
      .then(([profil, toutesMissions]) => {
        if (cancelled) return;
        setClient(profil);
        setMissions(toutesMissions.filter((m) => m.clientId === id));
      })
      .finally(() => {
        if (!cancelled) setChargement(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const missionsOuvertes = useMemo(
    () => missions.filter((m) => m.statut === "ouverte").length,
    [missions],
  );
  const missionsEnCours = useMemo(
    () => missions.filter((m) => m.statut === "en_cours").length,
    [missions],
  );
  const missionsTerminees = useMemo(
    () => missions.filter((m) => m.statut === "terminee").length,
    [missions],
  );

  if (chargement) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-12">
        <div className="animate-in-fade rounded-lg border border-ink/10 bg-paper-light p-8 text-sm text-ink-soft">
          {t("public.client.loading")}
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-12">
        <NoticeCard>
          <p className="text-sm text-brique">{t("public.client.notFound")}</p>
        </NoticeCard>
      </div>
    );
  }

  const nom = client.nomEntreprise || client.utilisateur?.nom || t("public.client.fallbackName");
  const estEntreprise = client.typeClient === "entreprise";

  return (
    <div className="mx-auto max-w-5xl px-5 pb-12 pt-6">
      {/* =====================================================
          RETOUR
          ===================================================== */}
      <div className="mb-5">
        <BoutonRetour repli="/" />
      </div>

      {/* =====================================================
          EN-TÊTE
          ===================================================== */}
      <header className="animate-in overflow-hidden rounded-lg border border-ink/10 bg-paper-light">
      <div className="h-px bg-ink/10" />

        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-5">
              <Avatar
                nom={nom}
                photoUrl={client.utilisateur?.photoUrl}
                size={104}
              />

              <div className="min-w-0">
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft/60">
                  {estEntreprise
                    ? t("public.client.profileCompany")
                    : t("public.client.profileIndividual")}
                </p>

                <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                  {nom}
                </h1>

                {estEntreprise && client.utilisateur?.nom && (
                  <p className="mt-2 text-base text-ink-soft">
                    {t("public.client.representedBy", { nom: client.utilisateur.nom })}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Tag>
                    {estEntreprise ? (
                      <Building2 size={13} className="mr-1.5 inline" />
                    ) : (
                      <User size={13} className="mr-1.5 inline" />
                    )}
                    {estEntreprise
                      ? t("public.client.company")
                      : t("public.client.individual")}
                  </Tag>

                  {client.utilisateur?.emailVerifie && (
                    <Tag tone="rice">
                      <ShieldCheck size={13} className="mr-1.5 inline" />
                      {t("public.client.verified")}
                    </Tag>
                  )}
                </div>

                {/* Informations rapides */}
                <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs text-ink-soft/75">
                  <span className="inline-flex items-center gap-1.5">
                    <BriefcaseBusiness size={14} />
                    {t("public.client.missionsPublished", { count: missions.length })}
                  </span>

                  {client.utilisateur?.dateInscription && (
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays size={14} />
                      {t("public.client.memberSince", {
                        date: formatDateCourte(client.utilisateur.dateInscription),
                      })}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex shrink-0 flex-wrap items-center gap-2 lg:max-w-[220px] lg:justify-end">
              <ReactionProfil utilisateurId={id} />
              <SignalerBouton cibleType="utilisateur" cibleId={id} />
            </div>
          </div>
        </div>
      </header>

      {/* =====================================================
          CORPS
          ===================================================== */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        {/* ===================================================
            COLONNE PRINCIPALE
            =================================================== */}
        <main className="space-y-6">
          <section className="animate-in delay-1 rounded-lg border border-ink/10 bg-paper-light p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="h-8 w-1 rounded-full bg-ink" />

              <div>
                <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-ink-soft/60">
                  {t("public.client.activity")}
                </p>

                <h2 className="font-display text-xl font-semibold">
                  {t("public.client.publishedMissions")}
                </h2>
              </div>
            </div>

            {missions.length === 0 ? (
              <MessageVide>
                {t("public.client.noMissions")}
              </MessageVide>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {missions.map((mission, index) => (
                  <Link
                    key={mission.id}
                    href={`/missions/${mission.id}`}
                    className={`group animate-in delay-${Math.min(index + 2, 6)}`}
                  >
                    <NoticeCard className="flex h-full flex-col gap-2 transition hover:-translate-y-0.5 hover:border-ink/20 hover:shadow-md">
                      <div className="flex items-center gap-2 text-ocre-dark">
                        <Briefcase size={14} />
                        <p className="font-display font-medium transition group-hover:text-ink">
                          {mission.titre}
                        </p>
                      </div>

                      <p className="font-mono text-sm text-ink-soft">
                        {formatArgent(mission.budget)}
                      </p>

                      <div className="mt-auto pt-2">
                        <Tag tone={toneStatut(mission.statut)}>
                          {statutMission(mission.statut)}
                        </Tag>
                      </div>
                    </NoticeCard>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </main>

        {/* ===================================================
            SIDEBAR
            =================================================== */}
        <aside className="space-y-6">
          {/* IDENTITÉ */}
          <section className="animate-in delay-1 rounded-lg border border-ink/10 bg-paper-light p-5">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-ink-soft/60">
              {t("public.client.identity")}
            </p>

            <div className="mt-4 flex gap-3">
              <div className="mt-0.5 shrink-0">
                {estEntreprise ? (
                  <Building2 size={19} />
                ) : (
                  <User size={19} />
                )}
              </div>

              <div>
                <p className="text-sm font-semibold">
                  {estEntreprise
                    ? t("public.client.company")
                    : t("public.client.individual")}
                </p>

                <p className="mt-1 text-xs leading-5 text-ink-soft">
                  {estEntreprise
                    ? t("public.client.companyDescription")
                    : t("public.client.individualDescription")}
                </p>
              </div>
            </div>
          </section>

          {/* STATISTIQUES */}
          <section className="animate-in delay-2 rounded-lg border border-ink/10 bg-paper-light p-5">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-ink-soft/60">
              {t("public.client.statistics")}
            </p>

            <div className="mt-4 divide-y divide-ink/10">
              <div className="flex items-center justify-between py-3 first:pt-0">
                <span className="text-xs text-ink-soft">
                  {t("public.client.openMissions")}
                </span>

                <span className="font-mono text-sm font-semibold">
                  {missionsOuvertes}
                </span>
              </div>

              <div className="flex items-center justify-between py-3">
                <span className="text-xs text-ink-soft">
                  {t("public.client.ongoingMissions")}
                </span>

                <span className="font-mono text-sm font-semibold">
                  {missionsEnCours}
                </span>
              </div>

              <div className="flex items-center justify-between py-3 last:pb-0">
                <span className="text-xs text-ink-soft">
                  {t("public.client.completedMissions")}
                </span>

                <span className="font-mono text-sm font-semibold">
                  {missionsTerminees}
                </span>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}