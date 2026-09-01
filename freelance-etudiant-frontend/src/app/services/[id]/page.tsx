"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { FileText, SendHorizonal } from "lucide-react";
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
    return <p className="mx-auto max-w-3xl px-5 py-16 text-sm text-ink-soft">Chargement…</p>;
  }

  if (!service) {
    return (
      <p className="mx-auto max-w-3xl px-5 py-16 text-sm text-brique">
        Ce service est introuvable.
      </p>
    );
  }

  const etudiant = service.etudiant;
  const estProprietaire = utilisateur?.id === etudiant?.utilisateurId;

  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
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

      <Tag tone="ocre">{service.categorie}</Tag>
      <h1 className="mt-4 font-display text-3xl sm:text-4xl font-semibold mb-3">
        {service.titre}
      </h1>
      <p className="text-sm text-ink-soft mb-8">
        Publié le {formatDate(service.dateCreation)}
      </p>

      <NoticeCard className="mb-8">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-ink-soft mb-1">
              Prix
            </p>
            <p className="font-display text-2xl text-ocre-dark">
              {formatArgent(service.prix)}
            </p>
          </div>
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-ink-soft mb-1">
              Délai de livraison
            </p>
            <p className="font-display text-2xl">{service.delai} jours</p>
          </div>
        </div>
      </NoticeCard>

      <div className="mb-10">
        <h2 className="font-display text-xl font-semibold mb-3">Description</h2>
        <p className="text-sm text-ink-soft whitespace-pre-line leading-relaxed">
          {service.description}
        </p>
      </div>

      {service.competences.length > 0 && (
        <div className="mb-10">
          <h2 className="font-display text-xl font-semibold mb-3">
            Compétences mobilisées
          </h2>
          <div className="flex flex-wrap gap-2">
            {service.competences.map((c) => (
              <Tag key={c} tone="rice">
                {c}
              </Tag>
            ))}
          </div>
        </div>
      )}

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
            <div>
              <p className="font-display text-lg font-medium">
                {etudiant.utilisateur?.nom}
              </p>
              <p className="text-sm text-ink-soft">
                {etudiant.universite ?? "Étudiant freelance"}
                {etudiant.niveauEtude ? ` · ${etudiant.niveauEtude}` : ""}
              </p>
              <p className="text-xs text-ink-soft/70 mt-1">
                {etudiant.nombreMissionsTerminees} projet(s) livré(s) ·
                note moyenne {Number(etudiant.noteMoyenne).toFixed(1)}/5
              </p>
            </div>
          </div>
          <Link href={`/etudiants/${etudiant.utilisateurId}`}>
            <Button variant="ghost" size="sm" className="mt-4">
              Voir le profil complet
            </Button>
          </Link>
        </NoticeCard>
      )}

      {/* --- Commande du service --- */}
      {succes ? (
        <NoticeCard className="mt-8 border-rice/50">
          <p className="text-rice font-medium">
            Votre demande a bien été envoyée avec votre cahier des charges.
            L&apos;étudiant peut maintenant l&apos;examiner.
          </p>
        </NoticeCard>
      ) : utilisateur?.role === "client" && !estProprietaire ? (
        afficherFormulaire ? (
          <NoticeCard className="mt-8">
            <div className="mb-4 flex items-center gap-2">
              <FileText size={18} className="text-ocre-dark" />
              <h2 className="font-display text-xl font-semibold">
                Cahier des charges
              </h2>
            </div>
            <p className="text-sm text-ink-soft mb-5">
              Décrivez précisément votre besoin : contexte, livrables
              attendus, contraintes. L&apos;étudiant s&apos;appuiera sur ces
              informations pour réaliser le projet.
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
                <Button type="submit" disabled={envoi} className="gap-2">
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
            className="mt-8 gap-2"
            onClick={() => setAfficherFormulaire(true)}
          >
            <FileText size={16} />
            Commander ce service
          </Button>
        )
      ) : null}

      <div className="mt-6 mb-10">
        <BoutonsReaction cibleType="service" cibleId={service.id} />
      </div>

      <div className="border-t border-ink/10 pt-8">
        <SectionCommentaires cibleType="service" cibleId={service.id} />
      </div>
    </div>
  );
}
