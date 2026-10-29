"use client";

import {
  useState,
} from "react";
import Link from "next/link";
import {
  MessageCircle,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
  Star,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useLabels } from "@/i18n/use-labels";

import { api, ApiError, lienExterneSur } from "@/lib/api";
import { PieceJointeAffichage } from "@/components/shared/PieceJointe";
import { useAuth } from "@/lib/auth-context";

import type { Candidature } from "@/types/candidatures";
import type { Evaluation } from "@/types/evaluations";
import type { Livraison } from "@/types/livraisons";
import type { Transaction } from "@/types/paiements";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import {
  Field,
  Input,
  Textarea,
} from "@/components/ui/Field";

import {
  NoticeCard,
  Tag,
} from "@/components/ui/Notice";


// ============================================================
// LIVRAISON CLIENT
// ============================================================

export function LivraisonClient({
  candidature,
  livraison,
  paiements,
  onRafraichir,
}: {
  candidature: Candidature;
  livraison: Livraison;
  paiements: Transaction[];
  onRafraichir: () => Promise<void>;
}) {
  const t = useTranslations("deliveriesPage");
  const { statutLivraison: libelleStatutLivraison } = useLabels();
  const etudiantId =
    candidature.etudiant
      ?.utilisateur?.id ??
    undefined;

  const etudiantNom =
    candidature.etudiant
      ?.utilisateur?.nom ??
    t("student");

  // ==========================================================
  // ÉVALUATIONS (RG-037 / RG-065 / RG-066)
  // Une livraison peut désormais porter deux évaluations
  // (client -> étudiant ET étudiant -> client). Chaque partie
  // ne doit voir et gérer QUE la sienne : on filtre par
  // evaluateurId. Le backend garantit l'unicité par
  // (livraison_id, evaluateur_id).
  // ==========================================================
  const { utilisateur } = useAuth();

  const maEvaluation =
    livraison.evaluations?.find(
      (evaluation) =>
        evaluation.evaluateurId ===
        utilisateur?.id,
    ) ?? null;

  const [
    commentaireCorrection,
    setCommentaireCorrection,
  ] = useState(
    livraison.commentaireCorrection ??
      "",
  );

  const [envoi, setEnvoi] =
    useState(false);

  const [erreur, setErreur] =
    useState<string | null>(null);

  const [statut, setStatut] =
    useState(livraison.statut);

  const [action, setAction] =
    useState<
      "valider" | "corriger" | null
    >(null);

  const toast = useToast();

  // La validation est irréversible côté backend (statut « validée ») et
  // peut libérer un paiement : elle exige une confirmation explicite.
  const [confirmerValidation, setConfirmerValidation] =
    useState(false);

  // ==========================================================
  // ÉVALUATION OBLIGATOIRE (fin de projet)
  //
  // Règle métier backend (EvaluationsService.create) :
  //   livraison validée + paiement CONFIRMEE/LIBEREE
  //   + une seule évaluation par livraison.
  // Le formulaire n'est affiché que lorsque ces conditions
  // sont réunies côté frontend ; le backend reste la
  // protection principale en cas d'appel direct à l'API.
  // ==========================================================

  // Note choisie : 0 = aucune, 1 à 5 sinon.
  const [note, setNote] =
    useState(0);

  const [
    commentaireEvaluation,
    setCommentaireEvaluation,
  ] = useState("");

  const [
    evaluationEnvoi,
    setEvaluationEnvoi,
  ] = useState(false);

  const [
    evaluationErreur,
    setEvaluationErreur,
  ] = useState<string | null>(null);

  // Réussite locale de l'évaluation : empêche une deuxième
  // soumission dès la première réussite, même avant le
  // rafraîchissement des données (le backend rejette de
  // toute façon un second appel avec 409).
  const [
    evaluationEnvoyee,
    setEvaluationEnvoyee,
  ] = useState(false);
  const [editionEvaluation, setEditionEvaluation] = useState(false);

  // ==========================================================
  // ÉTAT DU WORKFLOW DE FIN DE PROJET
  // Dérivé des statuts renvoyés par le backend :
  //   livraison validee + paiement confirmee/liberee
  //   + evaluation effectuee -> projet termine.
  // ==========================================================

  const paiementsCandidature =
    paiements.filter(
      (transaction) =>
        transaction.candidatureId ===
        candidature.id,
    );

  const paiementConfirme =
    paiementsCandidature.some(
      (transaction) =>
        transaction.statut ===
          "confirmee" ||
        transaction.statut === "liberee",
    );

  const paiementEnAttente =
    !paiementConfirme &&
    paiementsCandidature.some(
      (transaction) =>
        transaction.statut === "en_attente",
    );

  const paiementAnnule =
    !paiementConfirme &&
    !paiementEnAttente &&
    paiementsCandidature.length > 0;

  // Les évaluations sont chargées par le backend avec la
  // livraison (relation "evaluations"). Seule MA propre
  // évaluation (client -> étudiant) compte ici.
  const evaluationExistante =
    Boolean(maEvaluation);

  const evaluationEffectuee =
    evaluationExistante || evaluationEnvoyee;

  const livraisonValidee =
    statut === "validee";

  const projetTermine =
    livraisonValidee &&
    paiementConfirme &&
    evaluationEffectuee;

  // ==========================================================
  // ENVOI DE L'ÉVALUATION
  // POST /livraisons/:livraisonId/evaluation
  // Corps attendu par CreateEvaluationDto : { note, commentaire? }
  // ==========================================================

  async function envoyerEvaluation(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      evaluationEnvoi ||
      evaluationEnvoyee ||
      evaluationExistante
    ) {
      return;
    }

    if (note < 1) {
      setEvaluationErreur(t("errRating"));
      return;
    }

    setEvaluationErreur(null);
    setEvaluationEnvoi(true);

    try {
      await api.post<Evaluation>(
        `/livraisons/${livraison.id}/evaluation`,
        {
          note,

          // commentaire facultatif : JSON.stringify retire
          // automatiquement la clé si elle vaut undefined.
          commentaire:
            commentaireEvaluation.trim() ||
            undefined,
        },
      );

      // Succès : on ferme le formulaire (via evaluationEnvoyee),
      // on affiche la confirmation, puis on rafraîchit les
      // données (livraison + évaluations + statut mission)
      // sans recharger toute la page.
      setEvaluationEnvoyee(true);

      await onRafraichir();
    } catch (error) {
      console.error(
        "Erreur lors de l'envoi de l'évaluation :",
        error,
      );

      if (
        error instanceof ApiError
      ) {
        // 400 : paiement non confirmé / livraison non validée ;
        // 403 : mission n'appartenant pas au client ;
        // 409 : évaluation déjà effectuée ; autre : erreur serveur.
        // On affiche le message métier du backend.
        setEvaluationErreur(
          error.message ||
            t("errSendReview"),
        );
      } else {
        setEvaluationErreur(
          t("errSendReviewNetworkCheck"),
        );
      }
    } finally {
      setEvaluationEnvoi(false);
    }
  }

  async function enregistrerEvaluation() {
    if (!maEvaluation || note < 1) return;

    setEvaluationEnvoi(true);
    setEvaluationErreur(null);
    try {
      await api.patch<Evaluation>(`/evaluations/${maEvaluation.id}`, {
        note,
        commentaire: commentaireEvaluation.trim() || undefined,
      });
      setEditionEvaluation(false);
      await onRafraichir();
    } catch (error) {
      setEvaluationErreur(
        error instanceof ApiError
          ? error.message
          : t("errEditReview"),
      );
    } finally {
      setEvaluationEnvoi(false);
    }
  }

  // ==========================================================
  // ACTION CLIENT
  // ==========================================================

  async function handleAction(
    actionType:
      | "valider"
      | "corriger",
  ) {
    if (envoi) {
      return;
    }

    if (
      actionType === "corriger" &&
      !commentaireCorrection.trim()
    ) {
      setErreur(t("errCorrectionsRequired"));
      return;
    }

    setErreur(null);
    setEnvoi(true);
    setAction(actionType);

    try {
      if (
        actionType === "valider"
      ) {
        const resultat =
          await api.patch<Livraison>(
            `/livraisons/${livraison.id}/valider`,
          );

        setStatut(
          resultat.statut ??
            "validee",
        );
        toast.succes(t("validatedToast"));
      } else {
        const resultat =
          await api.patch<Livraison>(
            `/livraisons/${livraison.id}/demander-correction`,
            {
              commentaireCorrection:
                commentaireCorrection.trim(),
            },
          );

        setStatut(
          resultat.statut ??
            "correction_demandee",
        );
        toast.succes(t("correctionSentToast"));
      }
    } catch (error) {
      console.error(
        "Erreur lors de l'action sur la livraison :",
        error,
      );

      setErreur(
        error instanceof ApiError
          ? error.message
          : t("errProcessDelivery"),
      );
    } finally {
      setEnvoi(false);
      setAction(null);
      setConfirmerValidation(false);
    }
  }

  return (
    <NoticeCard>
      {/* EN-TÊTE */}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">
            {t("deliveryReceived")}
          </p>

          <h2 className="mt-2 font-display text-xl font-medium">
            {candidature.mission?.titre ??
              t("mission")}
          </h2>

          <p className="mt-1 text-sm text-ink-soft">
            {t("studentName", { nom: etudiantNom })}
          </p>
        </div>

        {etudiantId && (
          <Link
            href={`/tableau-de-bord/messages?contact=${encodeURIComponent(
              etudiantId,
            )}&nom=${encodeURIComponent(
              etudiantNom,
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
              {t("chatWithStudent")}
            </Button>
          </Link>
        )}
      </div>

      {/* STATUT */}

      <div className="mt-5 border-t border-ink/15 pt-5">
        <Tag
          tone={
            statut === "validee"
              ? "rice"
              : statut ===
                  "correction_demandee"
                ? "brique"
                : "ink"
          }
        >
          {libelleStatutLivraison(statut)}
        </Tag>
      </div>

      {/* LIVRABLE */}

      {livraison.lienLivrable && (
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

      {livraison.piecesJointes && livraison.piecesJointes.length > 0 && (
        <div className="mt-5">
          <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">
            {t("deliveredFiles")}
          </p>
          <ul className="mt-2 space-y-2 text-sm">
            {livraison.piecesJointes.map((piece) => (
              <li key={piece.url}>
                <PieceJointeAffichage url={piece.url} nom={piece.nom} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* COMMENTAIRE ÉTUDIANT */}

      {livraison.commentaireLivraison && (
        <div className="mt-5 rounded-lg border border-ink/10 bg-ink/5 p-4">
          <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">
            {t("studentComment")}
          </p>

          <p className="mt-2 text-sm text-ink">
            {
              livraison.commentaireLivraison
            }
          </p>
        </div>
      )}

      {/* COMMENTAIRE CORRECTION */}

      {statut ===
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

      {/* ACTIONS CLIENT */}

      {statut !== "validee" && (
        <div className="mt-6 border-t border-ink/15 pt-6">
          <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">
            {t("actions")}
          </p>

          <div className="mt-4">
            <Field
              label={t("correctionComment")}
              htmlFor={`correction-${candidature.id}`}
            >
              <Textarea
                id={`correction-${candidature.id}`}
                rows={3}
                value={
                  commentaireCorrection
                }
                onChange={(event) =>
                  setCommentaireCorrection(
                    event.target.value,
                  )
                }
                placeholder={t("correctionPlaceholder")}
                disabled={envoi}
              />
            </Field>
          </div>

          {erreur && (
            <p className="mt-3 text-xs text-brique">
              {erreur}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            {/* VALIDER */}

            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="inline-flex items-center gap-2 border border-rice/30 text-rice hover:bg-rice/10"
              onClick={() =>
                setConfirmerValidation(true)
              }
              disabled={envoi}
            >
              <CheckCircle size={16} />

              {envoi &&
              action === "valider"
                ? t("validating")
                : t("validateDelivery")}
            </Button>

            {/* CORRECTION */}

            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="inline-flex items-center gap-2 border border-brique/30 text-brique hover:bg-brique/10"
              onClick={() =>
                handleAction("corriger")
              }
              disabled={
                envoi ||
                !commentaireCorrection.trim()
              }
            >
              <XCircle size={16} />

              {envoi &&
              action === "corriger"
                ? t("sending")
                : t("requestCorrection")}
            </Button>
          </div>

          <ConfirmDialog
            ouvert={confirmerValidation}
            titre={t("confirmValidateTitle")}
            description={t("confirmValidateDescription")}
            libelleConfirmer={t("confirmValidateAction")}
            destructif={false}
            enCours={envoi && action === "valider"}
            onConfirmer={() => void handleAction("valider")}
            onAnnuler={() => setConfirmerValidation(false)}
          />
        </div>
      )}

{/* =========================================================
          WORKFLOW DE FIN DE PROJET
          Livraison validée -> Paiement -> Évaluation -> Terminé
          ==================================================== */}

      {statut === "validee" && (
        <div className="mt-5 border-t border-ink/15 pt-5">
          <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">
            {t("projectStatus")}
          </p>

          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex items-center gap-2 text-rice">
              <CheckCircle
                size={16}
                aria-hidden="true"
              />
              {t("deliveryValidated")}
            </li>

            {!paiementConfirme &&
              (paiementEnAttente ? (
                <li className="flex flex-wrap items-center gap-2 text-ocre">
                  <Clock
                    size={16}
                    aria-hidden="true"
                  />
                  {t("paymentDeclared")}
                  <Link href="/tableau-de-bord/paiements">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="border border-ocre/30 text-ocre hover:bg-ocre/10"
                    >
                      {t("trackPayment")}
                    </Button>
                  </Link>
                </li>
              ) : paiementAnnule ? (
                <li className="flex flex-wrap items-center gap-2 text-brique">
                  <XCircle
                    size={16}
                    aria-hidden="true"
                  />
                  {t("paymentCancelled")}
                  <Link href="/tableau-de-bord/paiements">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="border border-brique/30 text-brique hover:bg-brique/10"
                    >
                      {t("retryPayment")}
                    </Button>
                  </Link>
                </li>
              ) : (
                <li className="flex flex-wrap items-center gap-2 text-ocre">
                  <Clock
                    size={16}
                    aria-hidden="true"
                  />
                  {t("paymentRequired")}
                  <Link href="/tableau-de-bord/paiements">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="border border-ocre/30 text-ocre hover:bg-ocre/10"
                    >
                      {t("payNow")}
                    </Button>
                  </Link>
                </li>
              ))}

            {paiementConfirme && (
              <li className="flex items-center gap-2 text-rice">
                <CheckCircle
                  size={16}
                  aria-hidden="true"
                />
                {t("paymentConfirmed")}
              </li>
            )}

            {paiementConfirme &&
              (evaluationEffectuee ? (
                <li className="flex items-center gap-2 text-rice">
                  <CheckCircle
                    size={16}
                    aria-hidden="true"
                  />
                  {t("reviewDone")}
                </li>
              ) : (
                <li className="flex items-center gap-2 text-ocre">
                  <Star
                    size={16}
                    aria-hidden="true"
                  />
                  {t("reviewRequired")}
                </li>
              ))}
          </ul>

          {projetTermine && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-lg border border-rice/20 bg-rice/5 px-3 py-2 text-sm font-medium text-rice">
              <CheckCircle
                size={16}
                aria-hidden="true"
              />
              {t("projectCompleted")}
            </p>
          )}
        </div>
      )}

      {/* =========================================================
          ÉVALUATION OBLIGATOIRE
          Affichée uniquement si :
            - la livraison est validée ;
            - le paiement correspondant est confirmé ou libéré ;
            - aucune évaluation n'existe encore.
          Le backend (EvaluationsService.create) reste la
          protection principale : il refuse 400/403/409 sinon.
          ==================================================== */}

      {statut === "validee" &&
        paiementConfirme &&
        !evaluationEffectuee && (
          <form
            onSubmit={
              envoyerEvaluation
            }
            className="mt-5 border-t border-ink/15 pt-5"
          >
            <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">
              {t("reviewDelivery")}
            </p>

            <p className="mt-1 text-sm text-ink-soft">
              {t("reviewMandatory")}
            </p>

            <div
              className="mt-4 flex items-center gap-1"
              role="radiogroup"
              aria-label={t("ratingGroup")}
            >
              {[1, 2, 3, 4, 5].map(
                (valeur) => (
                  <button
                    key={valeur}
                    type="button"
                    role="radio"
                    aria-checked={
                      note === valeur
                    }
                    aria-label={t("ratingOutOf", { valeur })}
                    disabled={
                      evaluationEnvoi
                    }
                    onClick={() =>
                      setNote(valeur)
                    }
                    className="rounded p-1 transition-colors hover:bg-ocre/10 disabled:opacity-50"
                  >
                    <Star
                      size={22}
                      aria-hidden="true"
                      className={
                        valeur <= note
                          ? "fill-ocre-dark text-ocre-dark"
                          : "text-ink/30"
                      }
                    />
                  </button>
                ),
              )}

              {note > 0 && (
                <span className="ml-2 font-mono text-sm text-ocre-dark">
                  {note}/5
                </span>
              )}
            </div>

            <div className="mt-4 max-w-xl">
              <Field
                label={t("commentOptional")}
                htmlFor={`evaluation-${candidature.id}`}
              >
                <Textarea
                  id={`evaluation-${candidature.id}`}
                  rows={3}
                  value={
                    commentaireEvaluation
                  }
                  onChange={(event) =>
                    setCommentaireEvaluation(
                      event.target.value,
                    )
                  }
                  placeholder={t("workFeedbackPlaceholder")}
                  disabled={
                    evaluationEnvoi
                  }
                />
              </Field>
            </div>

            {evaluationErreur && (
              <p className="mt-3 text-xs text-brique">
                {evaluationErreur}
              </p>
            )}

            <Button
              type="submit"
              size="sm"
              className="mt-4"
              disabled={
                evaluationEnvoi || note < 1
              }
            >
              {evaluationEnvoi
                ? t("sending")
                : t("sendReview")}
            </Button>
          </form>
        )}

      {/* =========================================================
          VOTRE ÉVALUATION (RG-065)
          Affichée une fois envoyée : consultation + modification
          de SA propre évaluation uniquement (maEvaluation est
          filtrée par evaluateurId).
          ==================================================== */}

      {maEvaluation && (
        <div className="mt-5 rounded-lg border border-ink/10 bg-ink/[0.03] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium">
              {t("yourReview", { note: maEvaluation.note })}
            </p>
            {!editionEvaluation && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setNote(maEvaluation.note);
                  setCommentaireEvaluation(
                    maEvaluation.commentaire ?? "",
                  );
                  setEditionEvaluation(true);
                }}
              >
                {t("edit")}
                    </Button>
            )}
          </div>

          {editionEvaluation && (
            <div className="mt-4 max-w-xl">
              <Field
                label={t("rating")}
                htmlFor={`evaluation-modification-${candidature.id}`}
              >
                <Input
                  id={`evaluation-modification-${candidature.id}`}
                  type="number"
                  min={1}
                  max={5}
                  value={note}
                  onChange={(event) => setNote(Number(event.target.value))}
                />
              </Field>
              <Field
                label={t("commentOptional")}
                htmlFor={`evaluation-commentaire-${candidature.id}`}
              >
                <Textarea
                  id={`evaluation-commentaire-${candidature.id}`}
                  rows={3}
                  value={commentaireEvaluation}
                  onChange={(event) => setCommentaireEvaluation(event.target.value)}
                />
              </Field>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  disabled={evaluationEnvoi || note < 1}
                  onClick={() => void enregistrerEvaluation()}
                >
                  {t("save")}
                      </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditionEvaluation(false)}
                >
                  {t("close")}
                      </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ÉVALUATION ENVOYÉE */}

      {evaluationEnvoyee && (
        <div className="mt-5 rounded-lg border border-rice/20 bg-rice/5 p-4">
          <p className="text-sm text-rice">
            {t("reviewSent")}
          </p>
        </div>
      )}
    </NoticeCard>
  );
}
