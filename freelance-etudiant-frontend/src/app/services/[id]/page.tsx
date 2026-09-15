"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Loader2, SendHorizonal, Wrench } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError, getFileUrl } from "@/lib/api";
import type { ServiceOffert } from "@/lib/types";
import { formatArgent, formatDate } from "@/lib/format";
import { NoticeCard, StampBadge, Tag } from "@/components/ui/Notice";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { BoutonsReaction } from "@/components/ui/BoutonsReaction";
import { SectionCommentaires } from "@/components/ui/SectionCommentaires";
import {
  SelecteurPieceJointe,
  type PieceJointeValeur,
} from "@/components/ui/PieceJointe";
import { BoutonRetour } from "@/components/ui/BoutonRetour";

export default function ServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { utilisateur } = useAuth();
  const [service, setService] = useState<ServiceOffert | null>(null);
  const [chargement, setChargement] = useState(true);

  const [afficherFormulaire, setAfficherFormulaire] = useState(false);
  const [cahierDesCharges, setCahierDesCharges] = useState("");
  const [budgetPropose, setBudgetPropose] = useState("");
  const [delaiSouhaite, setDelaiSouhaite] = useState("");
  const [pieceJointe, setPieceJointe] = useState<PieceJointeValeur | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);

  useEffect(() => {
    api
      .get<ServiceOffert>(`/services/${id}`, { auth: false })
      .then((data) => {
        setService(data);
        setBudgetPropose(String(data.prix));
        setDelaiSouhaite(String(data.delai));
      })
      .finally(() => setChargement(false));
  }, [id]);

  async function commander(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      await api.post(`/services/${id}/demandes`, {
        cahierDesCharges,
        budgetPropose: budgetPropose ? Number(budgetPropose) : undefined,
        delaiSouhaite: delaiSouhaite ? Number(delaiSouhaite) : undefined,
        pieceJointeUrl: pieceJointe?.url,
        pieceJointeNom: pieceJointe?.nom,
      });
      setSucces(true);
      setAfficherFormulaire(false);
    } catch (err) {
      setErreur(
        err instanceof ApiError ? err.message : "Impossible d'envoyer la demande",
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

  if (!service) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16">
        <NoticeCard>
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-full bg-brique/10 text-brique"
              aria-hidden="true"
            >
              <Wrench size={22} />
            </span>
            <p className="text-sm text-brique">
              Ce service est introuvable.
            </p>
            <Button variant="secondary" size="sm" href="/services">
              Retour aux services
            </Button>
          </div>
        </NoticeCard>
      </div>
    );
  }

  const etudiant = service.etudiant;
  const estProprietaire = utilisateur?.id === etudiant?.utilisateurId;

  return (
    <div className="mx-auto max-w-4xl px-5 pt-8 pb-14">
      <div className="mb-4">
        <BoutonRetour repli="/services" />
      </div>

      {service.imagesUrls?.[0] && (
        <div className="mb-6 overflow-hidden rounded-2xl border border-ink/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getFileUrl(service.imagesUrls[0]) ?? undefined}
            alt=""
            className="max-h-96 w-full object-cover"
          />
        </div>
      )}

      {service.imagesUrls && service.imagesUrls.length > 1 && (
        <div className="mb-6 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {service.imagesUrls.slice(1, 5).map((image, index) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={index}
              src={getFileUrl(image) ?? undefined}
              alt=""
              className="h-20 w-28 shrink-0 rounded-lg border border-ink/10 object-cover"
            />
          ))}
        </div>
      )}

      <div className="mb-4 flex items-center gap-3">
        <Tag tone="ocre">{service.categorie}</Tag>
        <Tag tone={service.disponible ? "rice" : "ink"}>
          {service.disponible ? "Disponible" : "Indisponible"}
        </Tag>
      </div>
      <h1 className="mb-3 font-display text-3xl font-semibold sm:text-4xl">
        {service.titre}
      </h1>
      <p className="mb-8 text-sm text-ink-soft">
        Publié le {formatDate(service.dateCreation)}
      </p>

      <div className="flex flex-col-reverse items-start gap-8 lg:flex-row lg:items-start">
        {/* ————— COLONNE PRINCIPALE ————— */}
        <div className="min-w-0 flex-1">

          <div className="mb-8">
            <h2 className="mb-3 font-display text-xl font-semibold">
              Description
            </h2>
            <p className="text-sm leading-relaxed text-ink-soft whitespace-pre-line">
              {service.description}
            </p>
          </div>

          {service.competences.length > 0 && (
            <div className="mb-10">
              <h2 className="mb-3 font-display text-xl font-semibold">
                Compétences mobilisées
              </h2>
              <div className="flex flex-wrap gap-2">
                {service.competences.map((c) => (
                  <Tag key={c}>
                    {c}
                  </Tag>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 mb-10">
            <BoutonsReaction cibleType="service" cibleId={service.id} />
          </div>

          <div className="border-t border-ink/10 pt-8">
            <SectionCommentaires cibleType="service" cibleId={service.id} />
          </div>
        </div>

        {/* ————— COLONNE LATÉRALE ————— */}
        <aside className="flex w-full shrink-0 flex-col gap-5 lg:sticky lg:top-6 lg:w-72">
          {/* Carte annonce */}
          <NoticeCard>
            <p className="mb-1 text-xs font-mono uppercase tracking-wider text-ink-soft">
              Prix
            </p>
            <p className="font-display text-2xl text-ocre-dark">
              {formatArgent(service.prix)}
            </p>
            <div className="mt-4 border-t border-ink/10 pt-4">
              <p className="mb-1 text-xs font-mono uppercase tracking-wider text-ink-soft">
                Délai de livraison
              </p>
              <p className="font-display text-2xl">{service.delai} jours</p>
            </div>
          </NoticeCard>

          {/* Carte auteur */}
          {etudiant && (
            <NoticeCard>
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <Avatar
                    nom={etudiant.utilisateur?.nom ?? "Étudiant"}
                    photoUrl={etudiant.utilisateur?.photoUrl}
                    size={64}
                  />
                  <span className="absolute -bottom-1 -right-1">
                    <StampBadge
                      score={Number(etudiant.scoreReputation) || 0}
                      size={30}
                    />
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="truncate font-display text-lg font-medium">
                    {etudiant.utilisateur?.nom}
                  </p>
                  <p className="text-sm text-ink-soft">
                    {etudiant.universite ?? "Étudiant freelance"}
                    {etudiant.niveauEtude ? ` · ${etudiant.niveauEtude}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-ink-soft/70">
                    {etudiant.nombreMissionsTerminees} projet(s) livré(s) ·
                    note moyenne {Number(etudiant.noteMoyenne).toFixed(1)}/5
                  </p>
                </div>
              </div>
              <Link href={`/etudiants/${etudiant.utilisateurId}`}>
                <Button variant="ghost" size="sm" className="mt-4 w-full">
                  Voir le profil complet
                </Button>
              </Link>
            </NoticeCard>
          )}

          {/* --- Commande du service --- */}
          {succes ? (
            <NoticeCard className="border-rice/50">
              <p className="font-medium text-rice">
                Votre demande a bien été envoyée avec votre cahier des
                charges. L&apos;étudiant peut maintenant l&apos;examiner.
              </p>
            </NoticeCard>
          ) : utilisateur?.role === "client" && !estProprietaire ? (
            afficherFormulaire ? (
              <NoticeCard>
                <div className="mb-4 flex items-center gap-2">
                  <FileText size={18} className="text-ocre-dark" />
                  <h2 className="font-display text-xl font-semibold">
                    Cahier des charges
                  </h2>
                </div>
                <p className="mb-5 text-sm text-ink-soft">
                  Décrivez précisément votre besoin : contexte, livrables
                  attendus, contraintes. L&apos;étudiant s&apos;appuiera sur
                  ces informations pour réaliser le projet.
                </p>
                <form onSubmit={commander} className="flex flex-col gap-5">
                  <Field label="Cahier des charges" htmlFor="cahierDesCharges">
                    <Textarea
                      id="cahierDesCharges"
                      rows={7}
                      required
                      minLength={20}
                      value={cahierDesCharges}
                      onChange={(e) => setCahierDesCharges(e.target.value)}
                      placeholder="Contexte du projet, pages/fonctionnalités attendues, style souhaité, contraintes techniques…"
                    />
                  </Field>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Budget proposé (Ar)" htmlFor="budgetPropose">
                      <Input
                        id="budgetPropose"
                        type="number"
                        min={0}
                        value={budgetPropose}
                        onChange={(e) => setBudgetPropose(e.target.value)}
                      />
                    </Field>
                    <Field label="Délai souhaité (jours)" htmlFor="delaiSouhaite">
                      <Input
                        id="delaiSouhaite"
                        type="number"
                        min={1}
                        value={delaiSouhaite}
                        onChange={(e) => setDelaiSouhaite(e.target.value)}
                      />
                    </Field>
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs font-mono uppercase tracking-wider text-ink-soft">
                      Pièce jointe (optionnel)
                    </p>
                    <SelecteurPieceJointe
                      valeur={pieceJointe}
                      onChange={setPieceJointe}
                      disabled={envoi}
                    />
                  </div>
                  {erreur && <p className="text-sm text-brique">{erreur}</p>}
                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      disabled={envoi}
                      className="flex-1 gap-2"
                    >
                      <SendHorizonal size={15} />
                      {envoi ? "Envoi…" : "Envoyer ma demande"}
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
                className="w-full gap-2"
                onClick={() => setAfficherFormulaire(true)}
              >
                <FileText size={16} />
                Commander ce service
              </Button>
            )
          ) : null}
        </aside>
      </div>
    </div>
  );
}
