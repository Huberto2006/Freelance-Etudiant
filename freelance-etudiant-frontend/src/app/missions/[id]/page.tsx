"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { BriefcaseBusiness, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { Mission } from "@/lib/types";
import { useFormats } from "@/i18n/use-formats";
import { useLabels } from "@/i18n/use-labels";
import { useOptionLabels } from "@/i18n/use-option-labels";
import { getFileUrl } from "@/lib/api";
import { NoticeCard, Tag } from "@/components/ui/Notice";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { BoutonsReaction } from "@/components/ui/BoutonsReaction";
import { SectionCommentaires } from "@/components/ui/SectionCommentaires";
import { BoutonRetour } from "@/components/ui/BoutonRetour";
import { ImageAvecRepli } from "@/components/ui/ImageAvecRepli";

export default function MissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { utilisateur } = useAuth();
  const router = useRouter();
  const t = useTranslations("missions");
  const { argent: formatArgent, date: formatDate } = useFormats();
  const { statutMission } = useLabels();
  const { categorie } = useOptionLabels();

  const [resultatMission, setResultatMission] = useState<{
    id: string;
    mission: Mission | null;
    erreur: boolean;
  } | null>(null);
  const mission =
    resultatMission?.id === id ? resultatMission.mission : null;
  const chargement = resultatMission?.id !== id;
  const [afficherFormulaire, setAfficherFormulaire] = useState(false);
  const [prixPropose, setPrixPropose] = useState("");
  const [delaiPropose, setDelaiPropose] = useState("");
  const [message, setMessage] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);
  const erreurChargement =
    resultatMission?.id === id && resultatMission.erreur;

  useEffect(() => {
    let cancelled = false;

    api
      .get<Mission>(`/missions/${id}`, { auth: false })
      .then((data) => {
        if (!cancelled) {
          setResultatMission({ id, mission: data, erreur: false });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResultatMission({ id, mission: null, erreur: true });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  async function postuler(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      await api.post(`/missions/${id}/candidatures`, {
        prixPropose: Number(prixPropose),
        delaiPropose: Number(delaiPropose),
        message: message || undefined,
      });
      setSucces(true);
      setAfficherFormulaire(false);
    } catch (err) {
      setErreur(
        err instanceof ApiError ? err.message : t("detail.applyError"),
      );
    } finally {
      setEnvoi(false);
    }
  }

  if (chargement) {
    return (
      <p className="mx-auto flex max-w-3xl items-center justify-center gap-2 px-5 py-12 text-sm text-ink-soft">
        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        {t("detail.loading")}
      </p>
    );
  }

  if (!mission) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-12">
        <NoticeCard>
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-full bg-brique/10 text-brique"
              aria-hidden="true"
            >
              <BriefcaseBusiness size={22} />
            </span>
            <p className="text-sm text-brique">
              {erreurChargement
                ? t("detail.loadError")
                : t("detail.notFound")}
            </p>
            <Button variant="secondary" size="sm" href="/missions">
              {t("detail.backToMissions")}
            </Button>
          </div>
        </NoticeCard>
      </div>
    );
  }

  const estEtudiant = utilisateur?.role === "etudiant";
  const estProprietaire = utilisateur?.id === mission.clientId;

  return (

    <div className="mx-auto max-w-4xl px-5 pt-7 pb-11">
      <div className="mb-4">
        <BoutonRetour repli="/missions" />
      </div>
      {mission.imageUrl && (
        <div className="mb-6 h-64 overflow-hidden rounded-lg border border-ink/10 sm:h-80">
          <ImageAvecRepli
            src={getFileUrl(mission.imageUrl)}
            alt=""
            categorie={mission.categorie}
            className="h-full w-full object-cover"
            tailleIcone={48}
          />
        </div>
      )}

      <div className="mb-4 flex items-center gap-3">
        <Tag tone="ocre">{categorie(mission.categorie)}</Tag>
        <Tag tone="ink">{statutMission(mission.statut)}</Tag>
      </div>

      <h1 className="mb-3 font-display text-3xl font-semibold sm:text-4xl">
        {mission.titre}
      </h1>
      <p className="mb-7 text-sm text-ink-soft">
        {t("detail.publishedMeta", {
          datePublication: formatDate(mission.dateCreation),
          dateLimite: formatDate(mission.dateLimite),
        })}
      </p>

      <div className="flex flex-col-reverse items-start gap-7 lg:flex-row lg:items-start">
        {/* ————— COLONNE PRINCIPALE ————— */}
        <div className="min-w-0 flex-1">

          <div className="mb-7">
            <h2 className="mb-3 font-display text-xl font-semibold">
              {t("detail.description")}
            </h2>
            <p className="text-sm leading-relaxed text-ink-soft whitespace-pre-line">
              {mission.description}
            </p>
          </div>

          {mission.competencesRequises.length > 0 && (
            <div className="mb-8">
              <h2 className="mb-3 font-display text-xl font-semibold">
                {t("detail.requiredSkills")}
              </h2>
              <div className="flex flex-wrap gap-2">
                {mission.competencesRequises.map((c) => (
                  <Tag key={c} tone="ocre">
                    {c}
                  </Tag>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 mb-8">
            <BoutonsReaction cibleType="mission" cibleId={mission.id} />
          </div>

          <div className="border-t border-ink/10 pt-7">
            <SectionCommentaires cibleType="mission" cibleId={mission.id} />
          </div>
        </div>

        {/* ————— COLONNE LATÉRALE ————— */}
        <aside className="flex w-full shrink-0 flex-col gap-5 lg:sticky lg:top-6 lg:w-72">
          {/* Carte annonce */}
          <NoticeCard>
            <p className="mb-1 text-xs font-mono uppercase tracking-wider text-ink-soft">
              {t("detail.budget")}
            </p>
            <p className="font-display text-2xl text-ocre-dark">
              {formatArgent(mission.budget)}
            </p>
            <div className="mt-4 border-t border-ink/10 pt-4">
              <p className="mb-1 text-xs font-mono uppercase tracking-wider text-ink-soft">
                {t("detail.applicationDeadline")}
              </p>
              <p className="font-display text-2xl">
                {formatDate(mission.dateLimite)}
              </p>
            </div>
          </NoticeCard>

          {/* Carte auteur */}
          {mission.client && (
            <NoticeCard>
              <Link
                href={`/clients/${mission.client.utilisateurId}`}
                className="flex items-center gap-3"
              >
                <Avatar
                  nom={mission.client.utilisateur?.nom ?? t("detail.clientFallback")}
                  photoUrl={mission.client.utilisateur?.photoUrl}
                  size={44}
                />
                <div className="min-w-0">
                  <p className="truncate font-display font-medium hover:underline">
                    {mission.client.utilisateur?.nom ?? t("detail.clientKianjaFallback")}
                  </p>
                  <p className="text-xs text-ink-soft/70">
                    {mission.client.nomEntreprise ??
                      (mission.client.typeClient === "entreprise"
                        ? t("detail.clientCompany")
                        : t("detail.clientIndividual"))}
                  </p>
                </div>
              </Link>
              <Link href={`/clients/${mission.client.utilisateurId}`}>
                <Button variant="ghost" size="sm" className="mt-4 w-full">
                  {t("detail.viewProfile")}
                </Button>
              </Link>
            </NoticeCard>
          )}

          {/* --- Candidature --- */}
          {succes ? (
            <NoticeCard className="border-rice/50">
              <p className="font-medium text-rice">
                {t("detail.applySuccess")}
              </p>
            </NoticeCard>
          ) : estEtudiant && !estProprietaire && mission.statut === "ouverte" ? (
            afficherFormulaire ? (
              <NoticeCard>
                <h2 className="mb-4 font-display text-xl font-semibold">
                  {t("detail.applyTitle")}
                </h2>
                <form onSubmit={postuler} className="flex flex-col gap-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label={t("detail.proposedPrice")} htmlFor="prixPropose">
                      <Input
                        id="prixPropose"
                        type="number"
                        min={0}
                        required
                        value={prixPropose}
                        onChange={(e) => setPrixPropose(e.target.value)}
                      />
                    </Field>
                    <Field label={t("detail.proposedDelay")} htmlFor="delaiPropose">
                      <Input
                        id="delaiPropose"
                        type="number"
                        min={1}
                        required
                        value={delaiPropose}
                        onChange={(e) => setDelaiPropose(e.target.value)}
                      />
                    </Field>
                  </div>
                  <Field label={t("detail.messageLabel")} htmlFor="message">
                    <Textarea
                      id="message"
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={t("detail.messagePlaceholder")}
                    />
                  </Field>
                  {erreur && <p className="text-sm text-brique">{erreur}</p>}
                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      disabled={envoi}
                      className="flex-1"
                    >
                      {envoi ? t("detail.sending") : t("detail.submitApplication")}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setAfficherFormulaire(false)}
                    >
                      {t("detail.cancel")}
                    </Button>
                  </div>
                </form>
              </NoticeCard>
            ) : (
              <Button
                size="lg"
                className="w-full"
                onClick={() => setAfficherFormulaire(true)}
              >
                {t("detail.applyTitle")}
              </Button>
            )
          ) : !utilisateur ? (
            <NoticeCard>
              <p className="text-sm text-ink-soft">
                {t.rich("detail.loginPrompt", {
                  login: (chunks) => (
                    <button
                      onClick={() => router.push("/connexion")}
                      className="text-ocre-dark hover:underline"
                    >
                      {chunks}
                    </button>
                  ),
                })}
              </p>
            </NoticeCard>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
