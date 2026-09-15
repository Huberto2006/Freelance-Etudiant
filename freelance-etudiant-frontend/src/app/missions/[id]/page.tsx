"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { Mission } from "@/lib/types";
import { formatArgent, formatDate, statutMissionLabel } from "@/lib/format";
import { getFileUrl } from "@/lib/api";
import { NoticeCard, Tag } from "@/components/ui/Notice";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { BoutonsReaction } from "@/components/ui/BoutonsReaction";
import { SectionCommentaires } from "@/components/ui/SectionCommentaires";
import { BoutonRetour } from "@/components/ui/BoutonRetour";

export default function MissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { utilisateur } = useAuth();
  const router = useRouter();

  const [mission, setMission] = useState<Mission | null>(null);
  const [chargement, setChargement] = useState(true);
  const [afficherFormulaire, setAfficherFormulaire] = useState(false);
  const [prixPropose, setPrixPropose] = useState("");
  const [delaiPropose, setDelaiPropose] = useState("");
  const [message, setMessage] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);

  useEffect(() => {
    api
      .get<Mission>(`/missions/${id}`, { auth: false })
      .then(setMission)
      .finally(() => setChargement(false));
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
        err instanceof ApiError ? err.message : "Impossible d'envoyer la candidature",
      );
    } finally {
      setEnvoi(false);
    }
  }

  if (chargement) {
    return (
      <p className="mx-auto flex max-w-3xl items-center justify-center gap-2 px-5 py-16 text-sm text-ink-soft">
        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        Chargement…
      </p>
    );
  }

  if (!mission) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16">
        <NoticeCard>
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-full bg-brique/10 text-brique"
              aria-hidden="true"
            >
              <BriefcaseBusiness size={22} />
            </span>
            <p className="text-sm text-brique">
              Cette mission est introuvable.
            </p>
            <Button variant="secondary" size="sm" href="/missions">
              Retour aux missions
            </Button>
          </div>
        </NoticeCard>
      </div>
    );
  }

  const estEtudiant = utilisateur?.role === "etudiant";
  const estProprietaire = utilisateur?.id === mission.clientId;

  return (

    <div className="mx-auto max-w-4xl px-5 pt-8 pb-14">
      <div className="mb-4">
        <BoutonRetour repli="/missions" />
      </div>
      {mission.imageUrl && (
        <div className="mb-6 overflow-hidden rounded-2xl border border-ink/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getFileUrl(mission.imageUrl) ?? undefined}
            alt=""
            className="max-h-96 w-full object-cover"
          />
        </div>
      )}

      <div className="mb-4 flex items-center gap-3">
        <Tag tone="ocre">{mission.categorie}</Tag>
        <Tag tone="ink">{statutMissionLabel[mission.statut]}</Tag>
      </div>

      <h1 className="mb-3 font-display text-3xl font-semibold sm:text-4xl">
        {mission.titre}
      </h1>
      <p className="mb-8 text-sm text-ink-soft">
        Publiée le {formatDate(mission.dateCreation)} · candidatures ouvertes
        jusqu&apos;au {formatDate(mission.dateLimite)}
      </p>

      <div className="flex flex-col-reverse items-start gap-8 lg:flex-row lg:items-start">
        {/* ————— COLONNE PRINCIPALE ————— */}
        <div className="min-w-0 flex-1">

          <div className="mb-8">
            <h2 className="mb-3 font-display text-xl font-semibold">
              Description
            </h2>
            <p className="text-sm leading-relaxed text-ink-soft whitespace-pre-line">
              {mission.description}
            </p>
          </div>

          {mission.competencesRequises.length > 0 && (
            <div className="mb-10">
              <h2 className="mb-3 font-display text-xl font-semibold">
                Compétences requises
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

          <div className="mt-6 mb-10">
            <BoutonsReaction cibleType="mission" cibleId={mission.id} />
          </div>

          <div className="border-t border-ink/10 pt-8">
            <SectionCommentaires cibleType="mission" cibleId={mission.id} />
          </div>
        </div>

        {/* ————— COLONNE LATÉRALE ————— */}
        <aside className="flex w-full shrink-0 flex-col gap-5 lg:sticky lg:top-6 lg:w-72">
          {/* Carte annonce */}
          <NoticeCard>
            <p className="mb-1 text-xs font-mono uppercase tracking-wider text-ink-soft">
              Budget
            </p>
            <p className="font-display text-2xl text-ocre-dark">
              {formatArgent(mission.budget)}
            </p>
            <div className="mt-4 border-t border-ink/10 pt-4">
              <p className="mb-1 text-xs font-mono uppercase tracking-wider text-ink-soft">
                Date limite de candidature
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
                  nom={mission.client.utilisateur?.nom ?? "Client"}
                  photoUrl={mission.client.utilisateur?.photoUrl}
                  size={44}
                />
                <div className="min-w-0">
                  <p className="truncate font-display font-medium hover:underline">
                    {mission.client.utilisateur?.nom ?? "Client Kianja"}
                  </p>
                  <p className="text-xs text-ink-soft/70">
                    {mission.client.nomEntreprise ??
                      (mission.client.typeClient === "entreprise"
                        ? "Entreprise"
                        : "Particulier")}
                  </p>
                </div>
              </Link>
              <Link href={`/clients/${mission.client.utilisateurId}`}>
                <Button variant="ghost" size="sm" className="mt-4 w-full">
                  Voir le profil
                </Button>
              </Link>
            </NoticeCard>
          )}

          {/* --- Candidature --- */}
          {succes ? (
            <NoticeCard className="border-rice/50">
              <p className="font-medium text-rice">
                Votre candidature a bien été envoyée. Le client pourra
                maintenant l&apos;examiner.
              </p>
            </NoticeCard>
          ) : estEtudiant && !estProprietaire && mission.statut === "ouverte" ? (
            afficherFormulaire ? (
              <NoticeCard>
                <h2 className="mb-4 font-display text-xl font-semibold">
                  Postuler à cette mission
                </h2>
                <form onSubmit={postuler} className="flex flex-col gap-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Prix proposé (Ar)" htmlFor="prixPropose">
                      <Input
                        id="prixPropose"
                        type="number"
                        min={0}
                        required
                        value={prixPropose}
                        onChange={(e) => setPrixPropose(e.target.value)}
                      />
                    </Field>
                    <Field label="Délai proposé (jours)" htmlFor="delaiPropose">
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
                  <Field label="Message (optionnel)" htmlFor="message">
                    <Textarea
                      id="message"
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Présentez brièvement votre approche…"
                    />
                  </Field>
                  {erreur && <p className="text-sm text-brique">{erreur}</p>}
                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      disabled={envoi}
                      className="flex-1"
                    >
                      {envoi ? "Envoi…" : "Envoyer ma candidature"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setAfficherFormulaire(false)}
                    >
                      Annuler
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
                Postuler à cette mission
              </Button>
            )
          ) : !utilisateur ? (
            <NoticeCard>
              <p className="text-sm text-ink-soft">
                <button
                  onClick={() => router.push("/connexion")}
                  className="text-ocre-dark hover:underline"
                >
                  Connectez-vous
                </button>{" "}
                en tant qu&apos;étudiant pour postuler à cette mission.
              </p>
            </NoticeCard>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
