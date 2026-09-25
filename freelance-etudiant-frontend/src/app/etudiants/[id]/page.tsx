"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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

import { api } from "@/lib/api";
import type {
  EtudiantProfile,
  Evaluation,
  ServiceOffert,
} from "@/lib/types";
import { formatArgent, formatDateCourte } from "@/lib/format";

import {
  MessageVide,
  NoticeCard,
  SousTitreSection,
  StampBadge,
  Tag,
} from "@/components/ui/Notice";
import { Avatar } from "@/components/ui/Avatar";
import { PortfolioGalerie } from "@/components/ui/Portfolio";
import { ReactionProfil } from "@/components/ui/ReactionProfil";
import { FavoriBouton } from "@/components/ui/FavoriBouton";
import { SignalerBouton } from "@/components/ui/SignalerBouton";
import { BoutonRetour } from "@/components/ui/BoutonRetour";

const LABELS_STATUT_DISPONIBILITE: Record<string, string> = {
  disponible: "Disponible",
  occupe: "Occupé",
  en_mission: "En mission",
  indisponible: "Indisponible",
};

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

  const [etudiant, setEtudiant] = useState<EtudiantProfile | null>(null);
  const [services, setServices] = useState<ServiceOffert[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function chargerProfil() {
      try {
        const [profil, tousServices, notes] = await Promise.all([
          api.get<EtudiantProfile>(`/etudiants/${id}`, {
            auth: false,
          }),
          api.get<ServiceOffert[]>(`/services`, {
            auth: false,
          }),
          api.get<Evaluation[]>(`/etudiants/${id}/evaluations`, {
            auth: false,
          }),
        ]);

        if (cancelled) return;

        setEtudiant(profil);
        setServices(tousServices.filter((s) => s.etudiantId === id));
        setEvaluations(notes);
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
  }, [id]);

  const portfolioUrls = useMemo(
    () => (etudiant?.portfolioUrls ?? []).filter(Boolean),
    [etudiant],
  );

  const noteMoyenne = Number(etudiant?.noteMoyenne ?? 0);
  const scoreReputation = Number(etudiant?.scoreReputation ?? 0);
  const missionsTerminees = Number(
    etudiant?.nombreMissionsTerminees ?? 0,
  );

  if (chargement) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-16">
        <div className="rounded-2xl border border-ink/10 bg-paper-light p-8 text-sm text-ink-soft shadow-sm">
          Chargement du profil…
        </div>
      </div>
    );
  }

  if (!etudiant) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-16">
        <NoticeCard>
          <p className="text-sm text-brique">
            Profil introuvable.
          </p>
        </NoticeCard>
      </div>
    );
  }

  const nom = etudiant.utilisateur?.nom ?? "Étudiant";
  const universite =
    etudiant.universite ?? "Étudiant freelance";

  return (
    <div className="mx-auto max-w-5xl px-5 pb-16 pt-6">
      {/* =====================================================
          RETOUR
          ===================================================== */}
      <div className="mb-5">
        <BoutonRetour repli="/" />
      </div>

      {/* =====================================================
          EN-TÊTE CV
          ===================================================== */}
      <header className="animate-in overflow-hidden rounded-3xl border border-ink/10 bg-paper-light shadow-sm">
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

                <span className="absolute -bottom-2 -right-2">
                  <StampBadge
                    score={scoreReputation}
                    size={42}
                  />
                </span>
              </div>

              <div className="min-w-0">
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft/60">
                  Profil professionnel
                </p>

                <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                  {nom}
                </h1>

                <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-base text-ink-soft">
                  <span>
                    {etudiant.niveauEtude ??
                      "Étudiant en informatique"}
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
                    Étudiant
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
                      {LABELS_STATUT_DISPONIBILITE[
                        etudiant.statutDisponibilite
                      ] ?? etudiant.statutDisponibilite}
                    </Tag>
                  ) : etudiant.disponibilite ? (
                    <Tag tone="rice">
                      <CheckCircle2
                        size={13}
                        className="mr-1.5 inline"
                      />
                      Disponible
                    </Tag>
                  ) : (
                    <Tag tone="ocre">
                      Indisponible
                    </Tag>
                  )}

                  {etudiant.typeFreelance && (
                    <Tag tone="ink">{etudiant.typeFreelance}</Tag>
                  )}
                </div>

                {/* Informations CV */}
                <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs text-ink-soft/75">
                  <span className="inline-flex items-center gap-1.5">
                    <BriefcaseBusiness size={14} />
                    {missionsTerminees} projet
                    {missionsTerminees > 1 ? "s" : ""} livré
                    {missionsTerminees > 1 ? "s" : ""}
                  </span>

                  <span className="inline-flex items-center gap-1.5">
                    <Star
                      size={14}
                      className="fill-ocre-dark text-ocre-dark"
                    />
                    {noteMoyenne.toFixed(1)}/5
                  </span>

                  {etudiant.tarifHoraire != null && (
                    <span>
                      {formatArgent(etudiant.tarifHoraire)}/h
                    </span>
                  )}

                  {etudiant.experience != null && (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock size={14} />
                      {etudiant.experience} an
                      {etudiant.experience > 1 ? "s" : ""} d&apos;expérience
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
          <section className="animate-in delay-1 rounded-2xl border border-ink/10 bg-paper-light p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="h-8 w-1 rounded-full bg-ink" />

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft/60">
                  Présentation
                </p>

                <h2 className="font-display text-xl font-semibold">
                  À propos
                </h2>
              </div>
            </div>

            {etudiant.description ? (
              <p className="whitespace-pre-line text-sm leading-7 text-ink-soft">
                {etudiant.description}
              </p>
            ) : (
              <MessageVide>
                Aucune présentation renseignée.
              </MessageVide>
            )}
          </section>

          {/* COMPÉTENCES */}
          {(etudiant.competences.length > 0 ||
            etudiant.langues.length > 0 ||
            (etudiant.specialites?.length ?? 0) > 0) && (
            <section className="animate-in delay-2 rounded-2xl border border-ink/10 bg-paper-light p-6 shadow-sm">
              <div className="mb-6 flex items-center gap-3">
                <div className="h-8 w-1 rounded-full bg-ink" />

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft/60">
                    Expertise
                  </p>

                  <h2 className="font-display text-xl font-semibold">
                    Compétences & langues
                  </h2>
                </div>
              </div>

              <div className="grid gap-7 sm:grid-cols-2">
                {etudiant.competences.length > 0 && (
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <BriefcaseBusiness size={16} />
                      <h3 className="text-sm font-semibold">
                        Compétences
                      </h3>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {etudiant.competences.map((competence) => (
                        <Tag key={competence}>
                          {competence}
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
                        Langues
                      </h3>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {etudiant.langues.map((langue) => (
                        <Tag
                          key={langue}
                          tone="ocre"
                        >
                          {langue}
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
                        Spécialités
                      </h3>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {(etudiant.specialites ?? []).map((specialite) => (
                        <Tag key={specialite} tone="bleu">
                          {specialite}
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
            <section className="animate-in delay-3 rounded-2xl border border-ink/10 bg-paper-light p-6 shadow-sm">
              <div className="mb-6 flex items-center gap-3">
                <div className="h-8 w-1 rounded-full bg-ink" />

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft/60">
                    Réalisations
                  </p>

                  <h2 className="font-display text-xl font-semibold">
                    Portfolio
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
            <section className="animate-in delay-3 rounded-2xl border border-ink/10 bg-paper-light p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="h-8 w-1 rounded-full bg-ink" />

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft/60">
                    Présence en ligne
                  </p>

                  <h2 className="font-display text-xl font-semibold">
                    Liens
                  </h2>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {etudiant.githubUrl && (
                  <a
                    href={etudiant.githubUrl}
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
                    href={etudiant.gitlabUrl}
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
                    href={etudiant.linkedinUrl}
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
                    href={etudiant.siteWeb}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-full border border-ink/15 px-3 py-1.5 text-xs text-ink-soft transition-colors hover:border-ocre hover:text-ocre-dark"
                  >
                    <Globe size={13} />
                    Site web
                  </a>
                )}
              </div>
            </section>
          )}

          {/* SERVICES */}
          {services.length > 0 && (
            <section className="animate-in delay-4 rounded-2xl border border-ink/10 bg-paper-light p-6 shadow-sm">
              <div className="mb-6 flex items-center gap-3">
                <div className="h-8 w-1 rounded-full bg-ink" />

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft/60">
                    Prestations
                  </p>

                  <h2 className="font-display text-xl font-semibold">
                    Services proposés
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
                            Voir le service →
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
          <section className="animate-in delay-5 rounded-2xl border border-ink/10 bg-paper-light p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-1 rounded-full bg-ink" />

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft/60">
                    Réputation
                  </p>

                  <h2 className="font-display text-xl font-semibold">
                    Avis clients
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
                Aucun avis pour le moment.
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
          <section className="animate-in delay-1 rounded-2xl border border-ink/10 bg-paper-light p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft/60">
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
                  ? LABELS_STATUT_DISPONIBILITE[
                      etudiant.statutDisponibilite
                    ] ?? etudiant.statutDisponibilite
                  : etudiant.disponibilite
                    ? "Disponible pour des projets"
                    : "Actuellement indisponible"}
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
                  Tarif horaire
                </p>

                <p className="mt-1 font-mono text-lg font-semibold text-ocre-dark">
                  {formatArgent(etudiant.tarifHoraire)}
                  <span className="text-xs text-ink-soft">
                    {" "}
                    / heure
                  </span>
                </p>
              </div>
            ) : (
              (etudiant.tarifMinimum != null ||
                etudiant.tarifMaximum != null) && (
                <div className="mt-4 border-t border-ink/10 pt-4">
                  <p className="text-xs text-ink-soft/60">
                    Fourchette tarifaire
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
          <section className="animate-in delay-2 rounded-2xl border border-ink/10 bg-paper-light p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft/60">
              Formation
            </p>

            <div className="mt-4 flex gap-3">
              <div className="mt-0.5 shrink-0">
                <GraduationCap size={19} />
              </div>

              <div>
                <p className="text-sm font-semibold">
                  {etudiant.niveauEtude ??
                    "Formation informatique"}
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
          <section className="animate-in delay-3 rounded-2xl border border-ink/10 bg-paper-light p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft/60">
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

              <div className="flex items-center justify-between py-3">
                <span className="text-xs text-ink-soft">
                  Réputation
                </span>

                <span className="font-mono text-sm font-semibold">
                  {scoreReputation.toFixed(1)}
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
          <section className="animate-in delay-4 rounded-2xl border border-ink/10 bg-paper-light p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft/60">
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