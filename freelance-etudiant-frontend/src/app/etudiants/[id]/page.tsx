"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { api } from "@/lib/api";
import type { EtudiantProfile, Evaluation, ServiceOffert } from "@/lib/types";
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
    Promise.all([
      api.get<EtudiantProfile>(`/etudiants/${id}`, { auth: false }),
      api.get<ServiceOffert[]>(`/services`, { auth: false }),
      api.get<Evaluation[]>(`/etudiants/${id}/evaluations`, { auth: false }),
    ])
      .then(([profil, tousServices, notes]) => {
        setEtudiant(profil);
        setServices(tousServices.filter((s) => s.etudiantId === id));
        setEvaluations(notes);
      })
      .finally(() => setChargement(false));
  }, [id]);

  if (chargement) {
    return <p className="mx-auto max-w-3xl px-5 py-16 text-sm text-ink-soft">Chargement…</p>;
  }

  if (!etudiant) {
    return (
      <p className="mx-auto max-w-3xl px-5 py-16 text-sm text-brique">
        Profil introuvable.
      </p>
    );
  }

  // Le backend renvoie le profil complet, portfolioUrls inclus ; on ignore
  // les entrées vides pour ne pas afficher de section à moitié vide.
  const portfolioUrls = (etudiant.portfolioUrls ?? []).filter(Boolean);

  return (
    <div className="mx-auto max-w-3xl px-5 pt-8 pb-14">
      <div className="mb-4">
        <BoutonRetour repli="/" />
      </div>

      <header className="mb-10 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-5">
          <div className="relative shrink-0">
            <Avatar
              nom={etudiant.utilisateur?.nom ?? "Étudiant"}
              photoUrl={etudiant.utilisateur?.photoUrl}
              size={88}
            />
            <span className="absolute -bottom-1.5 -right-1.5">
              <StampBadge score={Number(etudiant.scoreReputation) || 0} size={38} />
            </span>
          </div>
          <div>
            <h1 className="font-display text-3xl font-semibold">
              {etudiant.utilisateur?.nom}
            </h1>
            <p className="text-sm text-ink-soft mt-1">
              {etudiant.universite ?? "Étudiant freelance"}
              {etudiant.niveauEtude ? ` · ${etudiant.niveauEtude}` : ""}
            </p>
            <p className="text-xs text-ink-soft/70 mt-1 font-mono">
              {etudiant.nombreMissionsTerminees} projet(s) livré(s) · note
              moyenne {Number(etudiant.noteMoyenne).toFixed(1)}/5
              {etudiant.tarifHoraire != null && (
                <> · {formatArgent(etudiant.tarifHoraire)}/h</>
              )}{" "}
              ·{" "}
              {etudiant.disponibilite ? (
                <span className="text-rice">disponible</span>
              ) : (
                <span className="text-brique">indisponible</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <ReactionProfil utilisateurId={id} />
            <FavoriBouton cibleType="etudiant" cibleId={id} />
          </div>
          <SignalerBouton cibleType="utilisateur" cibleId={id} />
        </div>
      </header>

      <div className="space-y-10">
        {etudiant.description && (
          <section>
            <SousTitreSection>À propos</SousTitreSection>
            <p className="text-sm text-ink-soft leading-relaxed whitespace-pre-line">
              {etudiant.description}
            </p>
          </section>
        )}

        {(etudiant.competences.length > 0 || etudiant.langues.length > 0) && (
          <section className="grid gap-8 sm:grid-cols-2">
            {etudiant.competences.length > 0 && (
              <div>
                <SousTitreSection>Compétences</SousTitreSection>
                <div className="flex flex-wrap gap-2">
                  {etudiant.competences.map((c) => (
                    <Tag key={c}>
                      {c}
                    </Tag>
                  ))}
                </div>
              </div>
            )}

            {etudiant.langues.length > 0 && (
              <div>
                <SousTitreSection>Langues</SousTitreSection>
                <div className="flex flex-wrap gap-2">
                  {etudiant.langues.map((l) => (
                    <Tag key={l} tone="ocre">
                      {l}
                    </Tag>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {portfolioUrls.length > 0 && (
          <section>
            <SousTitreSection>Portfolio</SousTitreSection>
            <PortfolioGalerie urls={portfolioUrls} />
          </section>
        )}

        {services.length > 0 && (
          <section>
            <SousTitreSection>Services proposés</SousTitreSection>
            <div className="grid gap-4 sm:grid-cols-2">
              {services.map((service) => (
                <Link key={service.id} href={`/services/${service.id}`}>
                  <NoticeCard>
                    <p className="font-display font-medium">{service.titre}</p>
                    <p className="mt-2 font-mono text-sm text-ocre-dark">
                      {formatArgent(service.prix)}
                    </p>
                  </NoticeCard>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          <SousTitreSection>Avis reçus ({evaluations.length})</SousTitreSection>
          {evaluations.length === 0 ? (
            <MessageVide>Aucun avis pour le moment.</MessageVide>
          ) : (
            <div className="flex flex-col gap-3">
              {evaluations.map((evaluation) => (
                <NoticeCard key={evaluation.id} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1" aria-label={`${evaluation.note} sur 5`}>
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
                    <p className="text-xs font-mono text-ink-soft/70">
                      {formatDateCourte(evaluation.dateEvaluation)}
                    </p>
                  </div>
                  {evaluation.commentaire && (
                    <p className="text-sm text-ink-soft">{evaluation.commentaire}</p>
                  )}
                </NoticeCard>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
