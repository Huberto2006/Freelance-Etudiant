"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { FileText, Loader2, SendHorizonal, Wrench } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError, getFileUrl } from "@/lib/api";
import type { ServiceOffert } from "@/lib/types";
import { useFormats } from "@/i18n/use-formats";
import { useOptionLabels } from "@/i18n/use-option-labels";
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
import { ImageAvecRepli } from "@/components/ui/ImageAvecRepli";

export default function ServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { utilisateur } = useAuth();
  const t = useTranslations("services");
  const { argent: formatArgent, date: formatDate, nombre } = useFormats();
  const { categorie } = useOptionLabels();
  const [resultatService, setResultatService] = useState<{
    id: string;
    service: ServiceOffert | null;
    erreur: boolean;
  } | null>(null);
  const service =
    resultatService?.id === id ? resultatService.service : null;
  const chargement = resultatService?.id !== id;

  const [afficherFormulaire, setAfficherFormulaire] = useState(false);
  const [cahierDesCharges, setCahierDesCharges] = useState("");
  const [budgetPropose, setBudgetPropose] = useState("");
  const [delaiSouhaite, setDelaiSouhaite] = useState("");
  const [pieceJointe, setPieceJointe] = useState<PieceJointeValeur | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);
  const erreurChargement =
    resultatService?.id === id && resultatService.erreur;

  useEffect(() => {
    let cancelled = false;

    api
      .get<ServiceOffert>(`/services/${id}`, { auth: false })
      .then((data) => {
        if (!cancelled) {
          setResultatService({ id, service: data, erreur: false });
          setBudgetPropose(String(data.prix));
          setDelaiSouhaite(String(data.delai));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResultatService({ id, service: null, erreur: true });
        }
      });

    return () => {
      cancelled = true;
    };
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
        err instanceof ApiError ? err.message : t("detail.orderError"),
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

  if (!service) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-12">
        <NoticeCard>
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-full bg-brique/10 text-brique"
              aria-hidden="true"
            >
              <Wrench size={22} />
            </span>
            <p className="text-sm text-brique">
              {erreurChargement
                ? t("detail.loadError")
                : t("detail.notFound")}
            </p>
            <Button variant="secondary" size="sm" href="/services">
              {t("detail.backToServices")}
            </Button>
          </div>
        </NoticeCard>
      </div>
    );
  }

  const etudiant = service.etudiant;
  const estProprietaire = utilisateur?.id === etudiant?.utilisateurId;

  return (
    <div className="mx-auto max-w-4xl px-5 pt-7 pb-11">
      <div className="mb-4">
        <BoutonRetour repli="/services" />
      </div>

      {service.imagesUrls?.[0] && (
        <div className="mb-6 h-64 overflow-hidden rounded-lg border border-ink/10 sm:h-80">
          <ImageAvecRepli
            src={getFileUrl(service.imagesUrls[0])}
            alt=""
            categorie={service.categorie}
            className="h-full w-full object-cover"
            tailleIcone={48}
          />
        </div>
      )}

      {service.imagesUrls && service.imagesUrls.length > 1 && (
        <div className="mb-6 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {service.imagesUrls.slice(1, 5).map((image, index) => (
            <div
              key={index}
              className="h-20 w-28 shrink-0 overflow-hidden rounded-lg border border-ink/10"
            >
              <ImageAvecRepli
                src={getFileUrl(image)}
                alt=""
                categorie={service.categorie}
                className="h-full w-full object-cover"
                tailleIcone={20}
              />
            </div>
          ))}
        </div>
      )}

      <div className="mb-4 flex items-center gap-3">
        <Tag tone="ocre">{categorie(service.categorie)}</Tag>
        <Tag tone={service.disponible ? "rice" : "ink"}>
          {service.disponible ? t("detail.available") : t("detail.unavailable")}
        </Tag>
      </div>
      <h1 className="mb-3 font-display text-3xl font-semibold sm:text-4xl">
        {service.titre}
      </h1>
      <p className="mb-7 text-sm text-ink-soft">
        {t("detail.publishedOn", { date: formatDate(service.dateCreation) })}
      </p>

      <div className="flex flex-col-reverse items-start gap-7 lg:flex-row lg:items-start">
        {/* ————— COLONNE PRINCIPALE ————— */}
        <div className="min-w-0 flex-1">

          <div className="mb-7">
            <h2 className="mb-3 font-display text-xl font-semibold">
              {t("detail.description")}
            </h2>
            <p className="text-sm leading-relaxed text-ink-soft whitespace-pre-line">
              {service.description}
            </p>
          </div>

          {service.competences.length > 0 && (
            <div className="mb-8">
              <h2 className="mb-3 font-display text-xl font-semibold">
                {t("detail.skills")}
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

          <div className="mt-6 mb-8">
            <BoutonsReaction cibleType="service" cibleId={service.id} />
          </div>

          <div className="border-t border-ink/10 pt-7">
            <SectionCommentaires cibleType="service" cibleId={service.id} />
          </div>
        </div>

        {/* ————— COLONNE LATÉRALE ————— */}
        <aside className="flex w-full shrink-0 flex-col gap-5 lg:sticky lg:top-6 lg:w-72">
          {/* Carte annonce */}
          <NoticeCard>
            <p className="mb-1 text-xs font-mono uppercase tracking-wider text-ink-soft">
              {t("detail.price")}
            </p>
            <p className="font-display text-2xl text-ocre-dark">
              {formatArgent(service.prix)}
            </p>
            <div className="mt-4 border-t border-ink/10 pt-4">
              <p className="mb-1 text-xs font-mono uppercase tracking-wider text-ink-soft">
                {t("detail.deliveryTime")}
              </p>
              <p className="font-display text-2xl">{t("detail.days", { count: service.delai })}</p>
            </div>
          </NoticeCard>

          {/* Carte auteur */}
          {etudiant && (
            <NoticeCard>
              <div className="flex items-center gap-4">
                <Avatar
                  nom={etudiant.utilisateur?.nom ?? t("detail.studentFallback")}
                  photoUrl={etudiant.utilisateur?.photoUrl}
                  size={64}
                />
                <div className="min-w-0">
                  <p className="truncate font-display text-lg font-medium">
                    {etudiant.utilisateur?.nom}
                  </p>
                  <p className="text-sm text-ink-soft">
                    {etudiant.universite ?? t("detail.freelanceStudent")}
                    {etudiant.niveauEtude ? ` · ${etudiant.niveauEtude}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-ink-soft/70">
                    {t("detail.studentStats", {
                      count: etudiant.nombreMissionsTerminees,
                      note: nombre(Number(etudiant.noteMoyenne), {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      }),
                    })}
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-ink-soft">
                    <StampBadge
                      score={Number(etudiant.scoreReputation) || 0}
                      size={30}
                    />
                    <span>
                      {t.rich("detail.reputation", {
                        score: Number(etudiant.scoreReputation) || 0,
                        valeur: (chunks) => (
                          <span className="font-mono font-semibold text-ink">
                            {chunks}
                          </span>
                        ),
                      })}
                    </span>
                  </div>
                </div>
              </div>
              <Link href={`/etudiants/${etudiant.utilisateurId}`}>
                <Button variant="ghost" size="sm" className="mt-4 w-full">
                  {t("detail.viewFullProfile")}
                </Button>
              </Link>
            </NoticeCard>
          )}

          {/* --- Commande du service --- */}
          {succes ? (
            <NoticeCard className="border-rice/50">
              <p className="font-medium text-rice">
                {t("detail.orderSuccess")}
              </p>
            </NoticeCard>
          ) : utilisateur?.role === "client" && !estProprietaire ? (
            afficherFormulaire ? (
              <NoticeCard>
                <div className="mb-4 flex items-center gap-2">
                  <FileText size={18} className="text-ocre-dark" />
                  <h2 className="font-display text-xl font-semibold">
                    {t("detail.specTitle")}
                  </h2>
                </div>
                <p className="mb-5 text-sm text-ink-soft">
                  {t("detail.specIntro")}
                </p>
                <form onSubmit={commander} className="flex flex-col gap-5">
                  <Field label={t("detail.specTitle")} htmlFor="cahierDesCharges">
                    <Textarea
                      id="cahierDesCharges"
                      rows={7}
                      required
                      minLength={20}
                      value={cahierDesCharges}
                      onChange={(e) => setCahierDesCharges(e.target.value)}
                      placeholder={t("detail.specPlaceholder")}
                    />
                  </Field>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label={t("detail.proposedBudget")} htmlFor="budgetPropose">
                      <Input
                        id="budgetPropose"
                        type="number"
                        min={0}
                        value={budgetPropose}
                        onChange={(e) => setBudgetPropose(e.target.value)}
                      />
                    </Field>
                    <Field label={t("detail.desiredDelay")} htmlFor="delaiSouhaite">
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
                      {t("detail.attachment")}
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
                      {envoi ? t("detail.sending") : t("detail.submitOrder")}
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
                className="w-full gap-2"
                onClick={() => setAfficherFormulaire(true)}
              >
                <FileText size={16} />
                {t("detail.orderService")}
              </Button>
            )
          ) : null}
        </aside>
      </div>
    </div>
  );
}
