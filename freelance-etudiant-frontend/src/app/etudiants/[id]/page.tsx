"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock,
  Globe,
  Globe2,
  GraduationCap,
  Languages,
  Link2,
  MapPin,
  Sparkles,
  Star,
} from "lucide-react";

import { api, ApiError, lienExterneSur } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Evaluation } from "@/types/evaluations";
import type { ServiceOffert } from "@/types/services";
import type { EtudiantProfile } from "@/types/utilisateurs";
import { useFormats } from "@/i18n/use-formats";
import { useOptionLabels } from "@/i18n/use-option-labels";

import {
  MessageVide,
  NoticeCard,
  StampBadge,
  Tag,
} from "@/components/ui/Notice";
import { Avatar } from "@/components/ui/Avatar";
import { PortfolioGalerie } from "@/features/profils/components/Portfolio";
import { ReactionProfil } from "@/features/reactions/components/ReactionProfil";
import { FavoriBouton } from "@/features/favoris/components/FavoriBouton";
import { SignalerBouton } from "@/features/signalements/components/SignalerBouton";
import { BoutonRetour } from "@/components/ui/BoutonRetour";
import { Button } from "@/components/ui/Button";

const TONS_STATUT_DISPONIBILITE: Record<
  string,
  "ink" | "ocre" | "rice" | "brique" | "bleu"
> = {
  disponible: "rice",
  occupe: "ocre",
  en_mission: "bleu",
  indisponible: "brique",
};

export default function ProfilEtudiantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("profile");
  const { argent: formatArgent, dateCourte: formatDateCourte, nombre } = useFormats();
  const { competence: libelleCompetence, langue: libelleLangue, specialite: libelleSpecialite } = useOptionLabels();
  // RG-VIS-001 : les profils étudiants ne sont consultables que par un
  // utilisateur connecté (backend : GET /etudiants/:id exige un JWT).
  const { utilisateur, chargement: chargementSession } = useAuth();

  const [etudiant, setEtudiant] = useState<EtudiantProfile | null>(null);
  const [services, setServices] = useState<ServiceOffert[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [chargement, setChargement] = useState(true);
  const [connexionRequise, setConnexionRequise] = useState(false);

  useEffect(() => {
    // On attend d'abord de savoir si une session existe : inutile de
    // lancer une requête vouée à un 401 pendant que l'état de
    // connexion est encore en cours de résolution.
    if (chargementSession) return;

    if (!utilisateur) {
      return;
    }

    let cancelled = false;

    async function chargerProfil() {
      setChargement(true);
      setConnexionRequise(false);
      try {
        const [profil, tousServices, notes] = await Promise.all([
          api.get<EtudiantProfile>(`/etudiants/${id}`),
          api.get<ServiceOffert[]>(`/services`),
          api.get<Evaluation[]>(`/etudiants/${id}/evaluations`),
        ]);

        if (cancelled) return;

        setEtudiant(profil);
        setServices(tousServices.filter((s) => s.etudiantId === id));
        setEvaluations(notes);
      } catch (error) {
        if (!cancelled && error instanceof ApiError && error.status === 401) {
          setConnexionRequise(true);
        }
      } finally {
        if (!cancelled) {
          setChargement(false);
        }
      }
    }

    void chargerProfil();

    return () => {
      cancelled = true;
    };
  }, [id, utilisateur, chargementSession]);

  const chargementAffiche =
    chargementSession || (Boolean(utilisateur) && chargement);
  const connexionRequiseAffichee =
    connexionRequise || (!chargementSession && !utilisateur);

  const portfolioUrls = useMemo(
    () => (etudiant?.portfolioUrls ?? []).filter(Boolean),
    [etudiant],
  );

  const noteMoyenne = Number(etudiant?.noteMoyenne ?? 0);
  const scoreReputation = Number(etudiant?.scoreReputation ?? 0);
  const missionsTerminees = Number(
    etudiant?.nombreMissionsTerminees ?? 0,
  );

  if (chargementAffiche) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-12">
        <div className="rounded-lg border border-ink/10 bg-paper-light p-8 text-sm text-ink-soft">
          {t("public.student.loading")}
        </div>
      </div>
    );
  }

  if (!etudiant) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-12">
        <NoticeCard className="flex flex-col items-center gap-3 py-8 text-center">
          {connexionRequiseAffichee ? (
            <>
              <p className="text-sm text-ink-soft">
                {t("public.student.loginRequired")}
              </p>
              <div className="flex gap-2.5">
                <Button variant="primary" size="sm" href="/connexion">
                  {t("public.student.login")}
                </Button>
                <Button variant="secondary" size="sm" href="/inscription">
                  {t("public.student.signup")}
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-brique">{t("public.student.notFound")}</p>
          )}
        </NoticeCard>
      </div>
    );
  }

  const nom = etudiant.utilisateur?.nom ?? t("public.student.fallbackName");
  const universite =
    etudiant.universite ?? t("public.student.freelanceStudent");

  return (
    <div className="mx-auto max-w-5xl px-5 pb-12 pt-6">
      {/* =====================================================
          RETOUR
          ===================================================== */}
      <div className="mb-5">
        <BoutonRetour repli="/" />
      </div>

      {/* =====================================================
          EN-TÊTE CV
          ===================================================== */}
      <header className="animate-in overflow-hidden rounded-lg border border-ink/10 bg-paper-light">
      <div className="h-px bg-ink/10" />

        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-5">
              <div className="relative shrink-0">
                <Avatar
                  nom={nom}
                  photoUrl={etudiant.utilisateur?.photoUrl}
                  size={104}
                />
              </div>

              <div className="min-w-0">
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft/60">
                  {t("public.student.professionalProfile")}
                </p>

                <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                  {nom}
                </h1>

                <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-base text-ink-soft">
                  <span>
                    {etudiant.niveauEtude ??
                      t("public.student.defaultLevel")}
                  </span>

                  {etudiant.filiere && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{etudiant.filiere}</span>
                    </>
                  )}

                  <span aria-hidden="true">·</span>

                  <span>{universite}</span>

                  {etudiant.ville && (
                    <span className="inline-flex items-center gap-1">
                      <span aria-hidden="true">·</span>
                      <MapPin size={13} />
                      {etudiant.ville}
                    </span>
                  )}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Tag>
                    <GraduationCap
                      size={13}
                      className="mr-1.5 inline"
                    />
                    {t("public.student.studentTag")}
                  </Tag>

                  {etudiant.statutDisponibilite ? (
                    <Tag
                      tone={
                        TONS_STATUT_DISPONIBILITE[
                          etudiant.statutDisponibilite
                        ] ?? "ink"
                      }
                    >
                      <Clock size={13} className="mr-1.5 inline" />
                      {t.has(
                        `public.student.availabilityStatus.${etudiant.statutDisponibilite}` as never,
                      )
                        ? t(
                            `public.student.availabilityStatus.${etudiant.statutDisponibilite}` as never,
                          )
                        : etudiant.statutDisponibilite}
                    </Tag>
                  ) : etudiant.disponibilite ? (
                    <Tag tone="rice">
                      <CheckCircle2
                        size={13}
                        className="mr-1.5 inline"
                      />
                      {t("public.student.availabilityStatus.disponible")}
                    </Tag>
                  ) : (
                    <Tag tone="ocre">
                      {t("public.student.availabilityStatus.indisponible")}
                    </Tag>
                  )}

                  {etudiant.typeFreelance && (
                    <Tag tone="ink">{etudiant.typeFreelance}</Tag>
                  )}
                </div>

                {/* Informations CV */}
                <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-ink-soft/75">
                  <span className="inline-flex items-center gap-1.5">
                    <BriefcaseBusiness size={14} />
                    {t("public.student.projectsDelivered", { count: missionsTerminees })}
                  </span>

                  <span className="inline-flex items-center gap-2">
                    <StampBadge score={scoreReputation} size={42} />
                    <span>
                      <span className="block font-semibold text-ink">
                        {t("public.student.reputation")}
                      </span>
                      <span>
                        {t("public.student.reputationScore", {
                          score: nombre(scoreReputation, {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          }),
                        })}
                      </span>
                    </span>
                  </span>

                  <span className="inline-flex items-center gap-1.5">
                    <Star
                      size={14}
                      className="fill-ocre-dark text-ocre-dark"
                    />
                    {t("public.student.ratingOutOfFive", {
                      note: nombre(noteMoyenne, {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      }),
                    })}
                  </span>

                  {etudiant.tarifHoraire != null && (
                    <span>
                      {t("public.student.hourlyRate", {
                        montant: formatArgent(etudiant.tarifHoraire),
                      })}
                    </span>
                  )}

                  {etudiant.experience != null && (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock size={14} />
                      {t("public.student.experienceYears", {
                        count: etudiant.experience,
                      })}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex shrink-0 flex-wrap items-center gap-2 lg:max-w-[220px] lg:justify-end">
              <ReactionProfil utilisateurId={id} />

              <FavoriBouton
                cibleType="etudiant"
                cibleId={id}
              />

              <SignalerBouton
                cibleType="utilisateur"
                cibleId={id}
              />
            </div>
          </div>
        </div>
      </header>

      {/* =====================================================
          CORPS DU CV
          ===================================================== */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        {/* ===================================================
            COLONNE PRINCIPALE
            =================================================== */}
        <main className="space-y-6">
          {/* À PROPOS */}
          <section className="animate-in delay-1 rounded-lg border border-ink/10 bg-paper-light p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="h-8 w-1 rounded-full bg-ink" />

              <div>
                <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-ink-soft/60">
                  {t("public.student.presentation")}
                </p>

                <h2 className="font-display text-xl font-semibold">
                  {t("public.student.about")}
                </h2>
              </div>
            </div>

            {etudiant.description ? (
              <p className="whitespace-pre-line text-sm leading-7 text-ink-soft">
                {etudiant.description}
              </p>
            ) : (
              <MessageVide>
                {t("public.student.noPresentation")}
              </MessageVide>
            )}
          </section>

          {/* COMPÉTENCES */}
          {(etudiant.competences.length > 0 ||
            etudiant.langues.length > 0 ||
            (etudiant.specialites?.length ?? 0) > 0) && (
            <section className="animate-in delay-2 rounded-lg border border-ink/10 bg-paper-light p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="h-8 w-1 rounded-full bg-ink" />

                <div>
                  <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-ink-soft/60">
                    {t("public.student.expertise")}
                  </p>

                  <h2 className="font-display text-xl font-semibold">
                    {t("public.student.skillsAndLanguages")}
                  </h2>
                </div>
              </div>

              <div className="grid gap-7 sm:grid-cols-2">
                {etudiant.competences.length > 0 && (
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <BriefcaseBusiness size={16} />
                      <h3 className="text-sm font-semibold">
                        {t("public.student.skills")}
                      </h3>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {etudiant.competences.map((competence) => (
                        <Tag key={competence}>
                          {libelleCompetence(competence)}
                        </Tag>
                      ))}
                    </div>
                  </div>
                )}

                {etudiant.langues.length > 0 && (
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <Languages size={16} />
                      <h3 className="text-sm font-semibold">
                        {t("public.student.languages")}
                      </h3>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {etudiant.langues.map((langue) => (
                        <Tag
                          key={langue}
                          tone="ocre"
                        >
                          {libelleLangue(langue)}
                        </Tag>
                      ))}
                    </div>
                  </div>
                )}

                {(etudiant.specialites?.length ?? 0) > 0 && (
                  <div className="sm:col-span-2">
                    <div className="mb-3 flex items-center gap-2">
                      <Sparkles size={16} />
                      <h3 className="text-sm font-semibold">
                        {t("public.student.specialities")}
                      </h3>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {(etudiant.specialites ?? []).map((specialite) => (
                        <Tag key={specialite} tone="bleu">
                          {libelleSpecialite(specialite)}
                        </Tag>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* PORTFOLIO */}
          {portfolioUrls.length > 0 && (
            <section className="animate-in delay-3 rounded-lg border border-ink/10 bg-paper-light p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="h-8 w-1 rounded-full bg-ink" />

                <div>
                  <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-ink-soft/60">
                    {t("public.student.achievements")}
                  </p>

                  <h2 className="font-display text-xl font-semibold">
                    {t("public.student.portfolio")}
                  </h2>
                </div>
              </div>

              <PortfolioGalerie urls={portfolioUrls} />
            </section>
          )}

          {/* LIENS */}
          {(etudiant.githubUrl ||
            etudiant.gitlabUrl ||
            etudiant.linkedinUrl ||
            etudiant.siteWeb) && (
            <section className="animate-in delay-3 rounded-lg border border-ink/10 bg-paper-light p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="h-8 w-1 rounded-full bg-ink" />

                <div>
                  <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-ink-soft/60">
                    {t("public.extra.onlinePresence")}
                  </p>

                  <h2 className="font-display text-xl font-semibold">
                    Liens
                  </h2>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {etudiant.githubUrl && (
                  <a
                    href={lienExterneSur(etudiant.githubUrl) ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-full border border-ink/15 px-3 py-1.5 text-xs text-ink-soft transition-colors hover:border-ocre hover:text-ocre-dark"
                  >
                    <Link2 size={13} />
                    GitHub
                  </a>
                )}
                {etudiant.gitlabUrl && (
                  <a
                    href={lienExterneSur(etudiant.gitlabUrl) ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-full border border-ink/15 px-3 py-1.5 text-xs text-ink-soft transition-colors hover:border-ocre hover:text-ocre-dark"
                  >
                    <Link2 size={13} />
                    GitLab
                  </a>
                )}
                {etudiant.linkedinUrl && (
                  <a
                    href={lienExterneSur(etudiant.linkedinUrl) ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-full border border-ink/15 px-3 py-1.5 text-xs text-ink-soft transition-colors hover:border-ocre hover:text-ocre-dark"
                  >
                    <Link2 size={13} />
                    LinkedIn
                  </a>
                )}
                {etudiant.siteWeb && (
                  <a
                    href={lienExterneSur(etudiant.siteWeb) ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-full border border-ink/15 px-3 py-1.5 text-xs text-ink-soft transition-colors hover:border-ocre hover:text-ocre-dark"
                  >
                    <Globe size={13} />
                    {t("public.extra.website")}
                  </a>
                )}
              </div>
            </section>
          )}

          {/* SERVICES */}
          {services.length > 0 && (
            <section className="animate-in delay-4 rounded-lg border border-ink/10 bg-paper-light p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="h-8 w-1 rounded-full bg-ink" />

                <div>
                  <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-ink-soft/60">
                    {t("public.extra.offers")}
                  </p>

                  <h2 className="font-display text-xl font-semibold">
                    {t("public.extra.servicesOffered")}
                  </h2>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {services.map((service) => (
                  <Link
                    key={service.id}
                    href={`/services/${service.id}`}
                    className="group"
                  >
                    <NoticeCard className="h-full transition hover:-translate-y-0.5 hover:border-ink/20 hover:shadow-md">
                      <div className="flex h-full flex-col">
                        <p className="font-display font-medium transition group-hover:text-ink">
                          {service.titre}
                        </p>

                        <div className="mt-auto pt-5">
                          <p className="font-mono text-sm font-semibold text-ocre-dark">
                            {formatArgent(service.prix)}
                          </p>

                          <p className="mt-1 text-xs text-ink-soft/60">
                            {t("public.extra.viewService")}
                          </p>
                        </div>
                      </div>
                    </NoticeCard>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* AVIS */}
          <section className="animate-in delay-5 rounded-lg border border-ink/10 bg-paper-light p-6">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-1 rounded-full bg-ink" />

                <div>
                  <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-ink-soft/60">
                    Réputation
                  </p>

                  <h2 className="font-display text-xl font-semibold">
                    {t("public.extra.clientReviews")}
                  </h2>
                </div>
              </div>

              <span className="text-xs text-ink-soft/60">
                {evaluations.length} avis
                {evaluations.length > 1 ? "s" : ""}
              </span>
            </div>

            {evaluations.length === 0 ? (
              <MessageVide>
                {t("public.extra.noReviews")}
              </MessageVide>
            ) : (
              <div className="flex flex-col gap-3">
                {evaluations.map((evaluation) => (
                  <NoticeCard
                    key={evaluation.id}
                    className="flex flex-col gap-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div
                        className="flex items-center gap-1"
                        aria-label={`${evaluation.note} sur 5`}
                      >
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={14}
                            className={
                              i < evaluation.note
                                ? "fill-ocre-dark text-ocre-dark"
                                : "text-ink/20"
                            }
                          />
                        ))}
                      </div>

                      <p className="flex items-center gap-1.5 text-xs font-mono text-ink-soft/70">
                        <CalendarDays size={13} />
                        {formatDateCourte(
                          evaluation.dateEvaluation,
                        )}
                      </p>
                    </div>

                    {evaluation.commentaire && (
                      <p className="text-sm leading-6 text-ink-soft">
                        {evaluation.commentaire}
                      </p>
                    )}
                  </NoticeCard>
                ))}
              </div>
            )}
          </section>
        </main>

        {/* ===================================================
            SIDEBAR CV
            =================================================== */}
        <aside className="space-y-6">
          {/* DISPONIBILITÉ */}
          <section className="animate-in delay-1 rounded-lg border border-ink/10 bg-paper-light p-5">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-ink-soft/60">
              Disponibilité
            </p>

            <div className="mt-3 flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  etudiant.disponibilite
                    ? "bg-rice"
                    : "bg-brique"
                }`}
              />

              <span className="text-sm font-semibold">
                {etudiant.statutDisponibilite
                  ? t.has(
                      `public.student.availabilityStatus.${etudiant.statutDisponibilite}` as never,
                    )
                    ? t(
                        `public.student.availabilityStatus.${etudiant.statutDisponibilite}` as never,
                      )
                    : etudiant.statutDisponibilite
                  : etudiant.disponibilite
                    ? t("public.student.availableForProjects")
                    : t("public.student.currentlyUnavailable")}
              </span>
            </div>

            {etudiant.typeFreelance && (
              <p className="mt-2 text-xs text-ink-soft/70">
                Recherche : {etudiant.typeFreelance}
              </p>
            )}

            {etudiant.tarifHoraire != null ? (
              <div className="mt-4 border-t border-ink/10 pt-4">
                <p className="text-xs text-ink-soft/60">
                  {t("public.extra.hourlyRate")}
                </p>

                <p className="mt-1 font-mono text-lg font-semibold text-ocre-dark">
                  {formatArgent(etudiant.tarifHoraire)}
                  <span className="text-xs text-ink-soft">
                    {" "}
                    {t("public.extra.perHour")}
                  </span>
                </p>
              </div>
            ) : (
              (etudiant.tarifMinimum != null ||
                etudiant.tarifMaximum != null) && (
                <div className="mt-4 border-t border-ink/10 pt-4">
                  <p className="text-xs text-ink-soft/60">
                    {t("public.extra.priceRange")}
                  </p>

                  <p className="mt-1 font-mono text-lg font-semibold text-ocre-dark">
                    {etudiant.tarifMinimum != null &&
                      formatArgent(etudiant.tarifMinimum)}
                    {etudiant.tarifMinimum != null &&
                      etudiant.tarifMaximum != null &&
                      " – "}
                    {etudiant.tarifMaximum != null &&
                      formatArgent(etudiant.tarifMaximum)}
                  </p>
                </div>
              )
            )}
          </section>

          {/* FORMATION */}
          <section className="animate-in delay-2 rounded-lg border border-ink/10 bg-paper-light p-5">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-ink-soft/60">
              Formation
            </p>

            <div className="mt-4 flex gap-3">
              <div className="mt-0.5 shrink-0">
                <GraduationCap size={19} />
              </div>

              <div>
                <p className="text-sm font-semibold">
                  {etudiant.niveauEtude ??
                    t("public.extra.defaultStudy")}
                  {etudiant.anneeEtude && (
                    <span className="font-normal text-ink-soft">
                      {" "}
                      · {etudiant.anneeEtude}
                    </span>
                  )}
                </p>

                {etudiant.filiere && (
                  <p className="mt-0.5 text-xs font-medium text-ink-soft">
                    {etudiant.filiere}
                  </p>
                )}

                <p className="mt-1 text-xs leading-5 text-ink-soft">
                  {etudiant.universite ??
                    "Établissement non renseigné"}
                </p>
              </div>
            </div>
          </section>

          {/* STATISTIQUES */}
          <section className="animate-in delay-3 rounded-lg border border-ink/10 bg-paper-light p-5">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-ink-soft/60">
              Statistiques
            </p>

            <div className="mt-4 divide-y divide-ink/10">
              <div className="flex items-center justify-between py-3 first:pt-0">
                <span className="text-xs text-ink-soft">
                  Projets livrés
                </span>

                <span className="font-mono text-sm font-semibold">
                  {missionsTerminees}
                </span>
              </div>

              <div className="flex items-center justify-between py-3">
                <span className="text-xs text-ink-soft">
                  Note moyenne
                </span>

                <span className="inline-flex items-center gap-1 font-mono text-sm font-semibold">
                  <Star
                    size={13}
                    className="fill-ocre-dark text-ocre-dark"
                  />
                  {noteMoyenne.toFixed(1)}
                </span>
              </div>

              {etudiant.experience != null && (
                <div className="flex items-center justify-between py-3 last:pb-0">
                  <span className="text-xs text-ink-soft">
                    Expérience
                  </span>

                  <span className="font-mono text-sm font-semibold">
                    {etudiant.experience} an
                    {etudiant.experience > 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* LANGUES / INFOS */}
          <section className="animate-in delay-4 rounded-lg border border-ink/10 bg-paper-light p-5">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-ink-soft/60">
              Profil
            </p>

            <div className="mt-4 space-y-3 text-xs text-ink-soft">
              {etudiant.langues.length > 0 && (
                <div className="flex gap-2">
                  <Languages
                    size={15}
                    className="shrink-0"
                  />

                  <span>
                    {etudiant.langues.join(" · ")}
                  </span>
                </div>
              )}

              {etudiant.ville && (
                <div className="flex gap-2">
                  <MapPin
                    size={15}
                    className="shrink-0"
                  />

                  <span>{etudiant.ville}</span>
                </div>
              )}

              <div className="flex gap-2">
                <Globe2
                  size={15}
                  className="shrink-0"
                />

                <span>
                  Profil public Kianja
                </span>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}