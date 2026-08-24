"use client";

import {
  Suspense,
  useEffect,
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
} from "lucide-react";
import { useSearchParams } from "next/navigation";

import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

import type {
  Candidature,
  Livraison,
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

    async function chargerInitial() {
      setChargement(true);
      setErreur(null);

      try {
        // ======================================================
        // CLIENT
        // ======================================================

        if (role === "client") {
          const livraisonsData =
            await api.get<Livraison[]>(
              "/livraisons/client/toutes",
            );

          if (cancelled) {
            return;
          }

          setLivraisons(livraisonsData);

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
        if (!cancelled) {
          setChargement(false);
        }
      }
    }

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
}: {
  candidature: Candidature;
  livraison: Livraison;
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

      {/* VALIDÉE */}

      {statut === "validee" && (
        <div className="mt-5 rounded-lg border border-rice/20 bg-rice/5 p-4">
          <p className="text-sm text-rice">
            Vous avez validé cette
            livraison.
          </p>
        </div>
      )}
    </NoticeCard>
  );
}