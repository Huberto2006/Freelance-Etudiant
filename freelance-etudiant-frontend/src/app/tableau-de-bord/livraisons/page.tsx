"use client";

import {
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  Package,
  MessageCircle,
  ExternalLink,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Star,
} from "lucide-react";
import { useSearchParams } from "next/navigation";

import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

import type {
  Candidature,
  Evaluation,
  Livraison,
  Transaction,
} from "@/lib/types";

import { statutLivraisonLabel } from "@/lib/format";

import { Button } from "@/components/ui/Button";
import {
  Field,
  Input,
  Textarea,
} from "@/components/ui/Field";

import {
  NoticeCard,
  PageHeader,
  Tag,
} from "@/components/ui/Notice";

// ============================================================
// PAGE PRINCIPALE
// ============================================================

export default function LivraisonsPage() {
  return (
    <Suspense
      fallback={
        <div>
          <p className="text-sm text-ink-soft">
            Chargement…
          </p>
        </div>
      }
    >
      <LivraisonsContent />
    </Suspense>
  );
}

// ============================================================
// CONTENU
// ============================================================

function LivraisonsContent() {
  const searchParams = useSearchParams();

  // L'ID de candidature sert uniquement à sélectionner
  // la livraison concernée par une notification.
  const candidatureParam =
    searchParams.get("candidature");

  const {
    utilisateur,
    chargement: chargementAuth,
  } = useAuth();

  const [
    candidatures,
    setCandidatures,
  ] = useState<Candidature[]>([]);

  const [
    livraisons,
    setLivraisons,
  ] = useState<Livraison[]>([]);

  // Paiements du client connecté (GET /paiements/me) : ils permettent
  // de connaître l'état réel du paiement de chaque candidature
  // (en attente / confirmé / libéré / annulé) et d'afficher le
  // workflow de fin de projet dans LivraisonClient. Source de
  // vérité : le backend (le frontend n'évalue jamais un paiement).
  const [
    paiements,
    setPaiements,
  ] = useState<Transaction[]>([]);

  // Chargeur exposé via une ref : permet à LivraisonClient de
  // provoquer un rafraîchissement silencieux des données (sans
  // recharger toute la page) après une évaluation réussie.
  const rafraichirRef =
    useRef<
      | ((
          silencieux?: boolean,
        ) => Promise<void>)
      | null
    >(null);

  async function rafraichirDonnees() {
    await rafraichirRef.current?.(true);
  }

  const [
    chargement,
    setChargement,
  ] = useState(true);

  const [
    erreur,
    setErreur,
  ] = useState<string | null>(null);

  // ==========================================================
  // RÔLE RÉEL DE L'UTILISATEUR
  // ==========================================================

  const role =
    utilisateur?.role === "client"
      ? "client"
      : utilisateur?.role === "etudiant"
        ? "etudiant"
        : null;

  // ==========================================================
  // CHARGEMENT INITIAL
  // ==========================================================

  useEffect(() => {
    // Attendre que AuthContext ait terminé
    // de restaurer la session utilisateur.
    if (
      chargementAuth ||
      !utilisateur ||
      !role
    ) {
      return;
    }

    let cancelled = false;

    async function chargerInitial(
      silencieux = false,
    ) {
      if (!silencieux) {
        setChargement(true);
      }
      setErreur(null);

      try {
        // ======================================================
        // CLIENT
        // ======================================================

        if (role === "client") {
          const [
            livraisonsData,
            paiementsData,
          ] = await Promise.all([
            api.get<Livraison[]>(
              "/livraisons/client/toutes",
            ),

            // Un échec du chargement des paiements (ex. erreur
            // réseau ponctuelle) ne doit pas masquer les
            // livraisons : on continue avec une liste vide.
            api
              .get<Transaction[]>(
                "/paiements/me",
              )
              .catch(
                () => [] as Transaction[],
              ),
          ]);

          if (cancelled) {
            return;
          }

          setLivraisons(livraisonsData);
          setPaiements(paiementsData);

          /*
           * Les candidatures sont déjà présentes
           * dans les livraisons renvoyées par le backend.
           */
          const candidaturesDepuisLivraisons =
            livraisonsData
              .map(
                (livraison) =>
                  livraison.candidature,
              )
              .filter(
                (
                  candidature,
                ): candidature is Candidature =>
                  Boolean(candidature),
              );

          setCandidatures(
            candidaturesDepuisLivraisons,
          );

          return;
        }

        // ======================================================
        // ÉTUDIANT
        // ======================================================

        const [
          candidaturesData,
          livraisonsData,
        ] = await Promise.all([
          api.get<Candidature[]>(
            "/candidatures/me",
          ),

          api.get<Livraison[]>(
            "/livraisons/me",
          ),
        ]);

        if (cancelled) {
          return;
        }

        setCandidatures(
          candidaturesData,
        );

        setLivraisons(
          livraisonsData,
        );
      } catch (error) {
        console.error(
          "Erreur lors du chargement des livraisons :",
          error,
        );

        if (!cancelled) {
          setErreur(
            error instanceof ApiError
              ? error.message
              : "Impossible de charger vos livraisons.",
          );
        }
      } finally {
        if (!cancelled && !silencieux) {
          setChargement(false);
        }
      }
    }

    // Le rafraîchissement silencieux réutilise le même chargeur ;
    // le garde "cancelled" du rendu d'effet courant neutralise les
    // mises à jour d'état après démontage ou changement de session.
    rafraichirRef.current = chargerInitial;

    void chargerInitial();

    return () => {
      cancelled = true;
    };
  }, [
    chargementAuth,
    utilisateur,
    role,
  ]);

  // ==========================================================
  // CALCULS
  // Aucun Hook ici.
  // ==========================================================

  const candidaturesFiltrees =
    role === "client"
      ? candidatures
      : candidatures.filter(
          (candidature) =>
            candidature.statut ===
            "acceptee",
        );

  const candidatureSelectionnee =
    candidatureParam
      ? candidaturesFiltrees.find(
          (candidature) =>
            candidature.id ===
            candidatureParam,
        ) ??
        candidaturesFiltrees[0] ??
        null
      : candidaturesFiltrees[0] ??
        null;

  const livraisonSelectionnee =
    candidatureSelectionnee
      ? livraisons.find(
          (livraison) =>
            livraison.candidatureId ===
            candidatureSelectionnee.id,
        ) ?? null
      : null;

  // ==========================================================
  // CHARGEMENT DE LA SESSION
  // ==========================================================

  if (chargementAuth) {
    return (
      <div>
        <p className="text-sm text-ink-soft">
          Vérification de votre session…
        </p>
      </div>
    );
  }

  // ==========================================================
  // UTILISATEUR NON CONNECTÉ
  // ==========================================================

  if (!utilisateur) {
    return (
      <div>
        <NoticeCard>
          <p className="text-sm text-ink-soft">
            Vous devez être connecté pour
            consulter vos livraisons.
          </p>

          <Link
            href="/connexion"
            className="mt-4 inline-block"
          >
            <Button
              size="sm"
              variant="secondary"
            >
              Se connecter
            </Button>
          </Link>
        </NoticeCard>
      </div>
    );
  }

  // ==========================================================
  // ADMIN / RÔLE NON AUTORISÉ
  // ==========================================================

  if (!role) {
    return (
      <div>
        <NoticeCard>
          <p className="text-sm text-brique">
            Vous n&apos;êtes pas autorisé à
            consulter les livraisons.
          </p>
        </NoticeCard>
      </div>
    );
  }

  // ==========================================================
  // AFFICHAGE
  // ==========================================================

  return (
    <div>
      <PageHeader
        icon={
          role === "client"
            ? Users
            : Package
        }
        eyebrow={
          role === "client"
            ? "Espace client"
            : "Espace étudiant"
        }
        title={
          role === "client"
            ? "Livraisons reçues"
            : "Mes livraisons"
        }
      />

      {/* ========================================================
          ERREUR
          ======================================================== */}

      {erreur && (
        <NoticeCard className="mb-6">
          <p className="text-sm text-brique">
            {erreur}
          </p>
        </NoticeCard>
      )}

      {/* ========================================================
          CHARGEMENT DES DONNÉES
          ======================================================== */}

      {chargement ? (
        <p className="text-sm text-ink-soft">
          Chargement des livraisons…
        </p>
      ) : candidaturesFiltrees.length ===
        0 ? (
        <NoticeCard>
          <p className="text-sm text-ink-soft">
            {role === "client"
              ? "Vous n'avez aucune livraison reçue pour le moment."
              : "Vous n'avez actuellement aucune candidature acceptée."}
          </p>

          <Link
            href={
              role === "client"
                ? "/tableau-de-bord/mes-missions"
                : "/tableau-de-bord/candidatures"
            }
            className="mt-4 inline-block"
          >
            <Button
              size="sm"
              variant="ghost"
            >
              {role === "client"
                ? "Voir mes missions"
                : "Voir mes candidatures"}
            </Button>
          </Link>
        </NoticeCard>
      ) : (
        <div className="grid gap-5 md:grid-cols-[240px_1fr]">
          {/* ====================================================
              LISTE
              ==================================================== */}

          <div className="flex flex-row gap-2 overflow-x-auto md:flex-col md:overflow-visible">
            {candidaturesFiltrees.map(
              (candidature) => {
                const active =
                  candidature.id ===
                  candidatureSelectionnee?.id;

                const livraison =
                  livraisons.find(
                    (item) =>
                      item.candidatureId ===
                      candidature.id,
                  );

                return (
                  <Link
                    key={candidature.id}
                    href={`/tableau-de-bord/livraisons?candidature=${encodeURIComponent(
                      candidature.id,
                    )}`}
                    className={`min-w-[200px] border px-3 py-3 text-left transition-colors md:min-w-0 ${
                      active
                        ? "border-ocre-dark bg-ocre/10 text-ocre-dark"
                        : "border-ink/15 hover:border-ink/40"
                    }`}
                  >
                    <p className="text-sm font-medium">
                      {candidature
                        .mission?.titre ??
                        "Mission"}
                    </p>

                    <p className="mt-1 text-xs text-ink-soft">
                      {livraison
                        ? statutLivraisonLabel[
                            livraison.statut
                          ]
                        : "Aucune livraison"}
                    </p>

                    {role === "client" && (
                      <p className="mt-1 text-xs text-ink-soft">
                        Étudiant :{" "}
                        {candidature
                          .etudiant
                          ?.utilisateur
                          ?.nom ??
                          "Inconnu"}
                      </p>
                    )}
                  </Link>
                );
              },
            )}
          </div>

          {/* ====================================================
              CONTENU
              ==================================================== */}

          <div>
            {!candidatureSelectionnee ? (
              <p className="text-sm text-ink-soft">
                Sélectionnez une mission.
              </p>
            ) : role === "client" ? (
              livraisonSelectionnee ? (
                <LivraisonClient
                  key={
                    candidatureSelectionnee.id
                  }
                  candidature={
                    candidatureSelectionnee
                  }
                  livraison={
                    livraisonSelectionnee
                  }
                  paiements={paiements}
                  onRafraichir={
                    rafraichirDonnees
                  }
                />
              ) : (
                <NoticeCard>
                  <p className="text-sm text-ink-soft">
                    Aucune livraison n&apos;a
                    encore été déposée.
                  </p>
                </NoticeCard>
              )
            ) : (
              <LivraisonEtudiant
                key={
                  candidatureSelectionnee.id
                }
                candidature={
                  candidatureSelectionnee
                }
                livraison={
                  livraisonSelectionnee
                }
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// LIVRAISON ÉTUDIANT
// ============================================================

function LivraisonEtudiant({
  candidature,
  livraison,
}: {
  candidature: Candidature;
  livraison: Livraison | null;
}) {
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
    "Client";

  const [
    lienLivrable,
    setLienLivrable,
  ] = useState(
    livraison?.lienLivrable ?? "",
  );

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

    if (!lien) {
      setErreur(
        "Veuillez renseigner le lien vers votre livrable.",
      );
      return;
    }

    setErreur(null);
    setEnvoi(true);

    try {
      await api.post(
        `/candidatures/${candidature.id}/livraison`,
        {
          lienLivrable: lien,

          commentaireLivraison:
            commentaireLivraison.trim() ||
            undefined,
        },
      );

      window.location.reload();
    } catch (error) {
      console.error(
        "Erreur lors de l'envoi de la livraison :",
        error,
      );

      setErreur(
        error instanceof ApiError
          ? error.message
          : "Impossible d'envoyer la livraison.",
      );
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <NoticeCard>
      {/* EN-TÊTE */}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">
            Livraison
          </p>

          <h2 className="mt-2 font-display text-xl font-medium">
            {candidature.mission?.titre ??
              "Mission"}
          </h2>

          <p className="mt-1 text-sm text-ink-soft">
            Client : {clientNom}
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
              Discuter avec le client
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
            {
              statutLivraisonLabel[
                livraison.statut
              ]
            }
          </Tag>
        </div>
      )}

      {/* CORRECTION */}

      {livraison?.statut ===
        "correction_demandee" &&
        livraison.commentaireCorrection && (
          <div className="mt-5 rounded-lg border border-brique/20 bg-brique/5 p-4">
            <p className="font-mono text-xs uppercase tracking-wider text-brique">
              Correction demandée
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
            Votre livraison a été validée
            par le client.
          </p>
        </div>
      )}

      {/* LIEN */}

      {livraison?.lienLivrable && (
        <div className="mt-5">
          <a
            href={
              livraison.lienLivrable
            }
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 break-all text-sm text-ocre-dark hover:underline"
          >
            <ExternalLink size={15} />
            Ouvrir le livrable
          </a>
        </div>
      )}

      {/* FORMULAIRE */}

      {livraison?.statut !==
        "validee" && (
        <form
          onSubmit={onSubmit}
          className="mt-6 max-w-xl border-t border-ink/15 pt-6"
        >
          <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">
            {livraison
              ? "Modifier ma livraison"
              : "Déposer ma livraison"}
          </p>

          <div className="mt-4">
            <Field
              label="Lien vers le livrable"
              htmlFor={`lien-${candidature.id}`}
            >
              <Input
                id={`lien-${candidature.id}`}
                value={lienLivrable}
                onChange={(event) =>
                  setLienLivrable(
                    event.target.value,
                  )
                }
                placeholder="https://github.com/…"
                disabled={envoi}
              />
            </Field>
          </div>

          <div className="mt-4">
            <Field
              label="Commentaire"
              htmlFor={`commentaire-${candidature.id}`}
            >
              <Textarea
                id={`commentaire-${candidature.id}`}
                rows={4}
                value={
                  commentaireLivraison
                }
                onChange={(event) =>
                  setCommentaireLivraison(
                    event.target.value,
                  )
                }
                placeholder="Précisions sur votre livraison…"
                disabled={envoi}
              />
            </Field>
          </div>

          {erreur && (
            <p className="mt-3 text-xs text-brique">
              {erreur}
            </p>
          )}

          <Button
            type="submit"
            size="sm"
            disabled={
              envoi ||
              !lienLivrable.trim()
            }
            className="mt-4"
          >
            {envoi
              ? "Envoi…"
              : livraison
                ? "Mettre à jour la livraison"
                : "Déposer ma livraison"}
          </Button>
        </form>
      )}
    </NoticeCard>
  );
}

// ============================================================
// LIVRAISON CLIENT
// ============================================================

function LivraisonClient({
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
  const etudiantId =
    candidature.etudiant
      ?.utilisateur?.id ??
    undefined;

  const etudiantNom =
    candidature.etudiant
      ?.utilisateur?.nom ??
    "Étudiant";

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
  // livraison (relation "evaluations").
  const evaluationExistante =
    (livraison.evaluations?.length ?? 0) > 0;

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
      setEvaluationErreur(
        "Veuillez choisir une note entre 1 et 5.",
      );
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
            "Impossible d'envoyer l'évaluation.",
        );
      } else {
        setEvaluationErreur(
          "Erreur réseau : impossible d'envoyer l'évaluation. Vérifiez votre connexion.",
        );
      }
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
      setErreur(
        "Veuillez indiquer les corrections à apporter.",
      );
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
      }
    } catch (error) {
      console.error(
        "Erreur lors de l'action sur la livraison :",
        error,
      );

      setErreur(
        error instanceof ApiError
          ? error.message
          : "Impossible de traiter la livraison.",
      );
    } finally {
      setEnvoi(false);
      setAction(null);
    }
  }

  return (
    <NoticeCard>
      {/* EN-TÊTE */}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">
            Livraison reçue
          </p>

          <h2 className="mt-2 font-display text-xl font-medium">
            {candidature.mission?.titre ??
              "Mission"}
          </h2>

          <p className="mt-1 text-sm text-ink-soft">
            Étudiant : {etudiantNom}
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
              Discuter avec l&apos;étudiant
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
          {statutLivraisonLabel[statut]}
        </Tag>
      </div>

      {/* LIVRABLE */}

      {livraison.lienLivrable && (
        <div className="mt-5">
          <a
            href={
              livraison.lienLivrable
            }
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 break-all text-sm text-ocre-dark hover:underline"
          >
            <ExternalLink size={15} />
            Ouvrir le livrable
          </a>
        </div>
      )}

      {/* COMMENTAIRE ÉTUDIANT */}

      {livraison.commentaireLivraison && (
        <div className="mt-5 rounded-lg border border-ink/10 bg-ink/5 p-4">
          <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">
            Commentaire de l&apos;étudiant
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
              Correction demandée
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
            Actions
          </p>

          <div className="mt-4">
            <Field
              label="Commentaire de correction"
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
                placeholder="Indiquez les modifications à apporter…"
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
                handleAction("valider")
              }
              disabled={envoi}
            >
              <CheckCircle size={16} />

              {envoi &&
              action === "valider"
                ? "Validation…"
                : "Valider la livraison"}
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
                ? "Envoi…"
                : "Demander une correction"}
            </Button>
          </div>
        </div>
      )}

{/* =========================================================
          WORKFLOW DE FIN DE PROJET
          Livraison validée -> Paiement -> Évaluation -> Terminé
          ==================================================== */}

      {statut === "validee" && (
        <div className="mt-5 border-t border-ink/15 pt-5">
          <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">
            État du projet
          </p>

          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex items-center gap-2 text-rice">
              <CheckCircle
                size={16}
                aria-hidden="true"
              />
              Livraison validée
            </li>

            {!paiementConfirme &&
              (paiementEnAttente ? (
                <li className="flex flex-wrap items-center gap-2 text-ocre">
                  <Clock
                    size={16}
                    aria-hidden="true"
                  />
                  Paiement déclaré — en attente de confirmation
                  <Link href="/tableau-de-bord/paiements">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="border border-ocre/30 text-ocre hover:bg-ocre/10"
                    >
                      Suivre le paiement
                    </Button>
                  </Link>
                </li>
              ) : paiementAnnule ? (
                <li className="flex flex-wrap items-center gap-2 text-brique">
                  <XCircle
                    size={16}
                    aria-hidden="true"
                  />
                  Paiement annulé — une nouvelle tentative est possible
                  <Link href="/tableau-de-bord/paiements">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="border border-brique/30 text-brique hover:bg-brique/10"
                    >
                      Refaire le paiement
                    </Button>
                  </Link>
                </li>
              ) : (
                <li className="flex flex-wrap items-center gap-2 text-ocre">
                  <Clock
                    size={16}
                    aria-hidden="true"
                  />
                  Paiement obligatoire
                  <Link href="/tableau-de-bord/paiements">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="border border-ocre/30 text-ocre hover:bg-ocre/10"
                    >
                      Payer maintenant
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
                Paiement confirmé
              </li>
            )}

            {paiementConfirme &&
              (evaluationEffectuee ? (
                <li className="flex items-center gap-2 text-rice">
                  <CheckCircle
                    size={16}
                    aria-hidden="true"
                  />
                  Évaluation effectuée
                </li>
              ) : (
                <li className="flex items-center gap-2 text-ocre">
                  <Star
                    size={16}
                    aria-hidden="true"
                  />
                  Évaluation obligatoire
                </li>
              ))}
          </ul>

          {projetTermine && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-lg border border-rice/20 bg-rice/5 px-3 py-2 text-sm font-medium text-rice">
              <CheckCircle
                size={16}
                aria-hidden="true"
              />
              Projet terminé
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
              Évaluer la livraison
            </p>

            <p className="mt-1 text-sm text-ink-soft">
              Votre évaluation est obligatoire pour
              marquer le projet comme terminé.
            </p>

            <div
              className="mt-4 flex items-center gap-1"
              role="radiogroup"
              aria-label="Note de 1 à 5"
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
                    aria-label={`Note ${valeur} sur 5`}
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
                label="Commentaire (facultatif)"
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
                  placeholder="Partagez votre retour sur le travail réalisé…"
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
                ? "Envoi…"
                : "Envoyer l'évaluation"}
            </Button>
          </form>
        )}

      {/* ÉVALUATION ENVOYÉE */}

      {evaluationEnvoyee && (
        <div className="mt-5 rounded-lg border border-rice/20 bg-rice/5 p-4">
          <p className="text-sm text-rice">
            Évaluation envoyée. Merci pour
            votre retour !
          </p>
        </div>
      )}
    </NoticeCard>
  );
}