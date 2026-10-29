"use client";

import {
  useState,
} from "react";
import Link from "next/link";
import {
  MessageCircle,
  ExternalLink,
  FileUp,
  Trash2,
  Check,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useLabels } from "@/i18n/use-labels";

import { api, ApiError, lienExterneSur } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

import type { Candidature } from "@/types/candidatures";
import type { Evaluation } from "@/types/evaluations";
import type { Livraison, PieceJointeLivraison } from "@/types/livraisons";
import type { Transaction } from "@/types/paiements";
import { Button } from "@/components/ui/Button";
import {
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui/Field";

import {
  NoticeCard,
  Tag,
} from "@/components/ui/Notice";


// ============================================================
// LIVRAISON ÉTUDIANT
// ============================================================

export function LivraisonEtudiant({
  candidature,
  livraison,
  paiements,
  onRafraichir,
}: {
  candidature: Candidature;
  livraison: Livraison | null;
  paiements: Transaction[];
  onRafraichir: () => Promise<void>;
}) {
  const { utilisateur } = useAuth();
  const t = useTranslations("deliveriesPage");
  const { statutLivraison: libelleStatutLivraison } = useLabels();

  const clientId =
    candidature.mission?.client
      ?.utilisateur?.id ??
    candidature.mission?.clientId ??
    undefined;

  const clientNom =
    candidature.mission?.client
      ?.utilisateur?.nom ??
    candidature.mission?.client
      ?.nomEntreprise ??
    t("client");

  const [lienLivrable, setLienLivrable] = useState(
    livraison?.lienLivrable ?? "",
  );
  const [plateforme, setPlateforme] = useState<"github" | "gitlab">(
    livraison?.lienLivrable?.toLowerCase().includes("gitlab.com")
      ? "gitlab"
      : "github",
  );
  const [methode, setMethode] = useState<"depot" | "fichiers">(
    livraison?.piecesJointes?.length ? "fichiers" : "depot",
  );
  const [branche, setBranche] = useState(livraison?.branche ?? "");
  const [piecesJointes, setPiecesJointes] = useState<PieceJointeLivraison[]>(
    livraison?.piecesJointes ?? [],
  );
  const [uploadEnCours, setUploadEnCours] = useState(false);

  const [
    commentaireLivraison,
    setCommentaireLivraison,
  ] = useState(
    livraison?.commentaireLivraison ??
      "",
  );

  const [envoi, setEnvoi] =
    useState(false);

  const [erreur, setErreur] =
    useState<string | null>(null);

  // Étapes du formulaire de dépôt : 1) méthode, 2) informations,
  // 3) aperçu avant envoi. N'a d'effet que sur la présentation ; la
  // soumission (onSubmit) reste inchangée.
  const [etape, setEtape] = useState<1 | 2 | 3>(1);

  function etapeSuivante() {
    if (etape === 1) {
      setErreur(null);
      setEtape(2);
      return;
    }

    if (etape !== 2) return;

    const lien = lienLivrable.trim();
    if (methode === "depot" && !lien) {
      setErreur(t("errLinkRequired"));
      return;
    }
    if (methode === "fichiers" && !piecesJointes.length) {
      setErreur(t("errFileBeforeContinue"));
      return;
    }

    setErreur(null);
    setEtape(3);
  }

  function etapePrecedente() {
    setErreur(null);
    if (etape === 3) {
      setEtape(2);
    } else if (etape === 2) {
      setEtape(1);
    }
  }

  // ==========================================================
  // ÉVALUATION DU CLIENT (RG-066)
  // ==========================================================

  const [noteEvalClient, setNoteEvalClient] = useState(0);
  const [commentaireEvalClient, setCommentaireEvalClient] = useState("");
  const [envoiEvalClient, setEnvoiEvalClient] = useState(false);
  const [erreurEvalClient, setErreurEvalClient] = useState<string | null>(null);
  const [evalClientEnvoyee, setEvalClientEnvoyee] = useState(false);
  const [editionEvalClient, setEditionEvalClient] = useState(false);

  const paiementConfirme = paiements.some(
    (transaction) =>
      transaction.candidatureId === candidature.id &&
      (transaction.statut === "confirmee" ||
        transaction.statut === "liberee"),
  );

  const maEvaluationClient =
    livraison?.evaluations?.find(
      (evaluation) => evaluation.evaluateurId === utilisateur?.id,
    ) ?? null;

  async function envoyerEvalClient(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!livraison) return;
    if (envoiEvalClient || evalClientEnvoyee || maEvaluationClient) return;

    if (noteEvalClient < 1) {
      setErreurEvalClient(t("errRating"));
      return;
    }

    setErreurEvalClient(null);
    setEnvoiEvalClient(true);

    try {
      await api.post<Evaluation>(
        `/livraisons/${livraison.id}/evaluation-client`,
        {
          note: noteEvalClient,
          commentaire: commentaireEvalClient.trim() || undefined,
        },
      );

      setEvalClientEnvoyee(true);
      await onRafraichir();
    } catch (error) {
      setErreurEvalClient(
        error instanceof ApiError
          ? error.message || t("errSendReview")
          : t("errSendReviewNetwork"),
      );
    } finally {
      setEnvoiEvalClient(false);
    }
  }

  async function enregistrerEvalClient() {
    if (!maEvaluationClient || noteEvalClient < 1) return;

    setEnvoiEvalClient(true);
    setErreurEvalClient(null);
    try {
      await api.patch<Evaluation>(`/evaluations/${maEvaluationClient.id}`, {
        note: noteEvalClient,
        commentaire: commentaireEvalClient.trim() || undefined,
      });
      setEditionEvalClient(false);
      await onRafraichir();
    } catch (error) {
      setErreurEvalClient(
        error instanceof ApiError
          ? error.message
          : t("errEditReview"),
      );
    } finally {
      setEnvoiEvalClient(false);
    }
  }

  async function ajouterFichiers(files: FileList | File[]) {
    const selections = Array.from(files);
    if (!selections.length) return;
    if (piecesJointes.length + selections.length > 10) {
      setErreur(t("errMaxFiles"));
      return;
    }
    setErreur(null);
    setUploadEnCours(true);
    try {
      const nouveaux: PieceJointeLivraison[] = [];
      for (const file of selections) {
        const formData = new FormData();
        formData.append("file", file);
        const resultat = await api.upload<{
          url: string;
          nomFichier: string;
          tailleOctets: number;
        }>("/uploads/document", formData);
        nouveaux.push({
          url: resultat.url,
          nom: resultat.nomFichier,
          tailleOctets: resultat.tailleOctets,
        });
      }
      setPiecesJointes((precedentes) => [...precedentes, ...nouveaux]);
    } catch (error) {
      setErreur(
        error instanceof ApiError
          ? error.message
          : t("errAddFile"),
      );
    } finally {
      setUploadEnCours(false);
    }
  }

  // ==========================================================
  // ENVOYER / MODIFIER LIVRAISON
  // ==========================================================

  async function onSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (envoi) {
      return;
    }

    const lien = lienLivrable.trim();
    if (methode === "depot" && !lien) {
      setErreur(t("errLinkRequired"));
      return;
    }
    if (methode === "fichiers" && !piecesJointes.length) {
      setErreur(t("errFileBeforeSend"));
      return;
    }

    setErreur(null);
    setEnvoi(true);
    try {
      await api.post(`/candidatures/${candidature.id}/livraison`, {
        lienLivrable: methode === "depot" ? lien : undefined,
        plateforme: methode === "depot" ? plateforme : undefined,
        branche: methode === "depot" ? branche.trim() || undefined : undefined,
        piecesJointes: methode === "fichiers" ? piecesJointes : undefined,
        commentaireLivraison: commentaireLivraison.trim() || undefined,
      });
      window.location.reload();
    } catch (error) {
      console.error("Erreur lors de l'envoi de la livraison :", error);
      setErreur(
        error instanceof ApiError
          ? error.message
          : t("errSendDelivery"),
      );
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <NoticeCard>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">
            {t("delivery")}
          </p>

          <h2 className="mt-2 font-display text-xl font-medium">
            {candidature.mission?.titre ??
              t("mission")}
          </h2>

          <p className="mt-1 text-sm text-ink-soft">
            {t("clientName", { nom: clientNom })}
          </p>
        </div>

        {clientId && (
          <Link
            href={`/tableau-de-bord/messages?contact=${encodeURIComponent(
              clientId,
            )}&nom=${encodeURIComponent(
              clientNom,
            )}`}
          >
            <Button
              size="sm"
              variant="ghost"
              className="inline-flex items-center gap-2"
            >
              <MessageCircle
                size={16}
              />
              {t("chatWithClient")}
            </Button>
          </Link>
        )}
      </div>

      {/* STATUT */}

      {livraison && (
        <div className="mt-5 border-t border-ink/15 pt-5">
          <Tag
            tone={
              livraison.statut ===
              "validee"
                ? "rice"
                : livraison.statut ===
                    "correction_demandee"
                  ? "brique"
                  : "ink"
            }
          >
            {libelleStatutLivraison(livraison.statut)}
          </Tag>
        </div>
      )}

      {/* CORRECTION */}

      {livraison?.statut ===
        "correction_demandee" &&
        livraison.commentaireCorrection && (
          <div className="mt-5 rounded-lg border border-brique/20 bg-brique/5 p-4">
            <p className="font-mono text-xs uppercase tracking-wider text-brique">
              {t("correctionRequested")}
            </p>

            <p className="mt-2 text-sm text-ink">
              {
                livraison.commentaireCorrection
              }
            </p>
          </div>
        )}

      {/* VALIDATION */}

      {livraison?.statut ===
        "validee" && (
        <div className="mt-5 rounded-lg border border-rice/20 bg-rice/5 p-4">
          <p className="text-sm text-rice">
            {t("validatedByClient")}
          </p>
        </div>
      )}

      {/* LIEN */}

      {livraison?.lienLivrable && (
        <div className="mt-5">
          <a
            href={
              lienExterneSur(livraison.lienLivrable) ?? "#"
            }
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 break-all text-sm text-ocre-dark hover:underline"
          >
            <ExternalLink size={15} />
            {t("openDeliverable")}
          </a>
        </div>
      )}

      {/* FORMULAIRE — présenté en 3 étapes : méthode, informations, aperçu */}

      {livraison?.statut !==
        "validee" && (
        <div className="mt-6 max-w-xl border-t border-ink/15 pt-6">
          <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">
            {livraison
              ? t("editMyDelivery")
              : t("submitMyDelivery")}
          </p>

          {/* INDICATEUR D'ÉTAPES */}

          <div className="mt-4 flex items-center">
            {(
              [
                { numero: 1, label: t("stepMethod") },
                { numero: 2, label: t("stepInfo") },
                { numero: 3, label: t("stepPreview") },
              ] as const
            ).map((item, index) => (
              <div
                key={item.numero}
                className={`flex items-center ${index < 2 ? "flex-1" : ""}`}
              >
                <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-mono ${
                      etape === item.numero
                        ? "bg-ocre-dark text-paper-light"
                        : etape > item.numero
                          ? "bg-rice text-paper-light"
                          : "border border-ink/25 text-ink-soft"
                    }`}
                  >
                    {etape > item.numero ? <Check size={13} aria-hidden="true" /> : item.numero}
                  </span>
                  <span
                    className={`text-[10px] leading-tight sm:text-xs ${etape === item.numero ? "font-medium text-ink" : "text-ink-soft"}`}
                  >
                    {item.label}
                  </span>
                </div>
                {index < 2 && (
                  <span className="mx-1.5 h-px flex-1 bg-ink/15 sm:mx-2" aria-hidden="true" />
                )}
              </div>
            ))}
          </div>

          <form onSubmit={onSubmit} className="mt-6">
            {/* ÉTAPE 1 : MÉTHODE */}

            {etape === 1 && (
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setMethode("depot")}
                  className={`relative border p-3 text-left text-sm ${methode === "depot" ? "border-ocre-dark bg-ocre/10" : "border-ink/20"}`}
                >
                  {methode === "depot" && (
                    <Check size={14} className="absolute right-3 top-3 text-ocre-dark" aria-hidden="true" />
                  )}
                  <span className="font-medium">{t("repoLink")}</span>
                  <span className="mt-1 block text-xs text-ink-soft">{t("githubOrGitlab")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMethode("fichiers")}
                  className={`relative border p-3 text-left text-sm ${methode === "fichiers" ? "border-ocre-dark bg-ocre/10" : "border-ink/20"}`}
                >
                  {methode === "fichiers" && (
                    <Check size={14} className="absolute right-3 top-3 text-ocre-dark" aria-hidden="true" />
                  )}
                  <span className="font-medium">{t("files")}</span>
                  <span className="mt-1 block text-xs text-ink-soft">{t("upTo10")}</span>
                </button>
              </div>
            )}

            {/* ÉTAPE 2 : INFORMATIONS */}

            {etape === 2 &&
              (methode === "depot" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t("platform")} htmlFor={`plateforme-${candidature.id}`}>
                    <Select
                      id={`plateforme-${candidature.id}`}
                      value={plateforme}
                      onChange={(event) => setPlateforme(event.target.value as "github" | "gitlab")}
                      disabled={envoi}
                    >
                      <option value="github">GitHub</option>
                      <option value="gitlab">GitLab</option>
                    </Select>
                  </Field>
                  <Field label={t("branchOptional")} htmlFor={`branche-${candidature.id}`}>
                    <Input
                      id={`branche-${candidature.id}`}
                      value={branche}
                      onChange={(event) => setBranche(event.target.value)}
                      placeholder="main"
                      disabled={envoi}
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label={t("repoUrl")} htmlFor={`lien-${candidature.id}`}>
                      <Input
                        id={`lien-${candidature.id}`}
                        value={lienLivrable}
                        onChange={(event) => setLienLivrable(event.target.value)}
                        placeholder={plateforme === "github" ? "https://github.com/…" : "https://gitlab.com/…"}
                        disabled={envoi}
                      />
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Field label={t("comment")} htmlFor={`commentaire-${candidature.id}`}>
                      <Textarea
                        id={`commentaire-${candidature.id}`}
                        rows={4}
                        value={commentaireLivraison}
                        onChange={(event) => setCommentaireLivraison(event.target.value)}
                        placeholder={t("deliveryNotesPlaceholder")}
                        disabled={envoi}
                      />
                    </Field>
                  </div>
                </div>
              ) : (
                <div>
                  <label
                    htmlFor={`fichiers-${candidature.id}`}
                    className="flex cursor-pointer flex-col items-center gap-2 border border-dashed border-ink/30 p-6 text-center text-sm hover:border-ocre-dark"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      void ajouterFichiers(event.dataTransfer.files);
                    }}
                  >
                    <FileUp size={20} />
                    <span>{uploadEnCours ? t("uploadingFiles") : t("selectOrDrop")}</span>
                    <span className="text-xs text-ink-soft">{t("fileTypes")}</span>
                    <input
                      id={`fichiers-${candidature.id}`}
                      type="file"
                      multiple
                      className="sr-only"
                      onChange={(event) => {
                        void ajouterFichiers(event.target.files ?? []);
                        event.target.value = "";
                      }}
                      disabled={envoi || uploadEnCours}
                    />
                  </label>
                  {piecesJointes.length > 0 && (
                    <ul className="mt-3 space-y-2 text-sm">
                      {piecesJointes.map((piece, index) => (
                        <li key={`${piece.url}-${index}`} className="flex items-center justify-between gap-3 border border-ink/10 px-3 py-2">
                          <span className="min-w-0 truncate">{piece.nom} <span className="text-xs text-ink-soft">({t("sizeKb", { taille: Math.ceil((piece.tailleOctets ?? 0) / 1024) })})</span></span>
                          <button type="button" onClick={() => setPiecesJointes((precedentes) => precedentes.filter((_, pieceIndex) => pieceIndex !== index))} aria-label={t("removeFile", { nom: piece.nom })} className="shrink-0 text-brique">
                            <Trash2 size={16} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-4">
                    <Field label={t("comment")} htmlFor={`commentaire-${candidature.id}`}>
                      <Textarea
                        id={`commentaire-${candidature.id}`}
                        rows={4}
                        value={commentaireLivraison}
                        onChange={(event) => setCommentaireLivraison(event.target.value)}
                        placeholder={t("deliveryNotesPlaceholder")}
                        disabled={envoi}
                      />
                    </Field>
                  </div>
                </div>
              ))}

            {/* ÉTAPE 3 : APERÇU */}

            {etape === 3 && (
              <div className="space-y-3 rounded-lg border border-ink/15 bg-ink/5 p-4 text-sm">
                <p>
                  <span className="text-ink-soft">{t("methodLabel")} </span>
                  {methode === "depot"
                    ? t("repoLinkWith", { plateforme: plateforme === "github" ? "GitHub" : "GitLab" })
                    : t("files")}
                </p>

                {methode === "depot" ? (
                  <>
                    <p className="break-all">
                      <span className="text-ink-soft">{t("urlLabel")} </span>
                      {lienLivrable || "—"}
                    </p>
                    {branche && (
                      <p>
                        <span className="text-ink-soft">{t("branchLabel")} </span>
                        {branche}
                      </p>
                    )}
                  </>
                ) : (
                  <p>
                    <span className="text-ink-soft">{t("filesLabel")} </span>
                    {t("filesCount", { count: piecesJointes.length })}
                  </p>
                )}

                {commentaireLivraison && (
                  <p>
                    <span className="text-ink-soft">{t("commentLabel")} </span>
                    {commentaireLivraison}
                  </p>
                )}
              </div>
            )}

            {erreur && (
              <p className="mt-3 text-xs text-brique">
                {erreur}
              </p>
            )}

            <div className="mt-5 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={etapePrecedente}
                disabled={etape === 1 || envoi}
              >
                {t("previous")}
              </Button>

              {etape < 3 ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={etapeSuivante}
                  disabled={envoi || uploadEnCours}
                >
                  {t("next")}
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="sm"
                  disabled={
                    envoi ||
                    uploadEnCours ||
                    (methode === "depot" ? !lienLivrable.trim() : !piecesJointes.length)
                  }
                >
                  {envoi
                    ? t("sending")
                    : livraison
                      ? t("updateDelivery")
                      : t("submitMyDelivery")}
                </Button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* =========================================================
          ÉVALUATION DU CLIENT (RG-066)
          L'étudiant évalue le client après livraison validée et
          paiement confirmé/libéré. Une seule évaluation par auteur
          et par livraison (unicité livraison_id + evaluateur_id
          côté backend). Le backend reste la protection principale.
          ==================================================== */}

      {livraison &&
        livraison.statut === "validee" &&
        paiementConfirme && (
          <>
            {maEvaluationClient ? (
              <div className="mt-5 rounded-lg border border-ink/10 bg-ink/[0.03] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-medium">
                    {t("yourClientReview", { note: maEvaluationClient.note })}
                  </p>
                  {!editionEvalClient && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setNoteEvalClient(maEvaluationClient.note);
                        setCommentaireEvalClient(
                          maEvaluationClient.commentaire ?? "",
                        );
                        setEditionEvalClient(true);
                      }}
                    >
                      {t("edit")}
                    </Button>
                  )}
                </div>

                {editionEvalClient && (
                  <div className="mt-4 max-w-xl">
                    <Field
                      label={t("rating")}
                      htmlFor={`evaluation-client-modification-${candidature.id}`}
                    >
                      <Input
                        id={`evaluation-client-modification-${candidature.id}`}
                        type="number"
                        min={1}
                        max={5}
                        value={noteEvalClient}
                        onChange={(event) =>
                          setNoteEvalClient(Number(event.target.value))
                        }
                      />
                    </Field>
                    <Field
                      label={t("commentOptional")}
                      htmlFor={`evaluation-client-commentaire-${candidature.id}`}
                    >
                      <Textarea
                        id={`evaluation-client-commentaire-${candidature.id}`}
                        rows={3}
                        value={commentaireEvalClient}
                        onChange={(event) =>
                          setCommentaireEvalClient(event.target.value)
                        }
                      />
                    </Field>
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        disabled={envoiEvalClient || noteEvalClient < 1}
                        onClick={() => void enregistrerEvalClient()}
                      >
                        {t("save")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditionEvalClient(false)}
                      >
                        {t("close")}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              !evalClientEnvoyee && (
                <form
                  onSubmit={envoyerEvalClient}
                  className="mt-5 border-t border-ink/15 pt-5"
                >
                  <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">
                    {t("reviewClient")}
                  </p>

                  <p className="mt-1 text-sm text-ink-soft">
                    {t("reviewClientHint")}
                  </p>

                  <div className="mt-4 max-w-xl">
                    <Field
                      label={t("rating")}
                      htmlFor={`evaluation-client-note-${candidature.id}`}
                    >
                      <Input
                        id={`evaluation-client-note-${candidature.id}`}
                        type="number"
                        min={1}
                        max={5}
                        value={noteEvalClient}
                        onChange={(event) =>
                          setNoteEvalClient(Number(event.target.value))
                        }
                        disabled={envoiEvalClient}
                      />
                    </Field>
                    <Field
                      label={t("commentOptional")}
                      htmlFor={`evaluation-client-avis-${candidature.id}`}
                    >
                      <Textarea
                        id={`evaluation-client-avis-${candidature.id}`}
                        rows={3}
                        value={commentaireEvalClient}
                        onChange={(event) =>
                          setCommentaireEvalClient(event.target.value)
                        }
                        placeholder={t("feedbackPlaceholder")}
                        disabled={envoiEvalClient}
                      />
                    </Field>

                    {erreurEvalClient && (
                      <p className="mt-3 text-xs text-brique">
                        {erreurEvalClient}
                      </p>
                    )}

                    <Button
                      type="submit"
                      size="sm"
                      className="mt-4"
                      disabled={envoiEvalClient || noteEvalClient < 1}
                    >
                      {envoiEvalClient
                        ? t("sending")
                        : t("sendMyReview")}
                    </Button>
                  </div>
                </form>
              )
            )}

            {evalClientEnvoyee && (
              <div className="mt-5 rounded-lg border border-rice/20 bg-rice/5 p-4">
                <p className="text-sm text-rice">
                  {t("reviewSent")}
                </p>
              </div>
            )}
          </>
        )}
    </NoticeCard>
  );
}
