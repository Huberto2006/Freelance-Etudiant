"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Pencil, Trash2 } from "lucide-react";

import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useSocket } from "@/lib/socket-context";

import type { Commentaire, TypeCibleContenu } from "@/lib/types";

import { formatDateCourte } from "@/lib/format";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";

/**
 * Section commentaires réutilisable sous une mission ou un service.
 *
 * REST :
 * - charge les commentaires existants ;
 * - crée un commentaire ;
 * - modifie un commentaire ;
 * - supprime un commentaire.
 *
 * Socket.IO :
 * - reçoit les nouveaux commentaires en temps réel ;
 * - reçoit les modifications en temps réel ;
 * - reçoit les suppressions en temps réel.
 */
export function SectionCommentaires({
  cibleType,
  cibleId,
}: {
  cibleType: TypeCibleContenu;
  cibleId: string;
}) {
  const { utilisateur } = useAuth();
  const { socket } = useSocket();

  const [commentaires, setCommentaires] = useState<Commentaire[]>([]);
  const [chargement, setChargement] = useState(true);

  const [nouveauContenu, setNouveauContenu] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const [erreur, setErreur] = useState<string | null>(null);

  const [idEnEdition, setIdEnEdition] = useState<string | null>(null);
  const [contenuEdition, setContenuEdition] = useState("");

  /**
   * Charge les commentaires existants via REST.
   */
  useEffect(() => {
    let actif = true;

    setChargement(true);
    setErreur(null);

    api
      .get<Commentaire[]>(
        `/commentaires?cibleType=${cibleType}&cibleId=${cibleId}`,
        { auth: false },
      )
      .then((data) => {
        if (actif) {
          setCommentaires(data);
        }
      })
      .catch((err) => {
        if (actif) {
          setErreur(
            err instanceof ApiError
              ? err.message
              : "Erreur lors du chargement des commentaires",
          );
        }
      })
      .finally(() => {
        if (actif) {
          setChargement(false);
        }
      });

    return () => {
      actif = false;
    };
  }, [cibleType, cibleId]);

  /**
   * Connexion Socket.IO à la room de la mission ou du service.
   */
  useEffect(() => {
    if (!socket) return;

    socket.emit("commentaire:rejoindre", {
      cibleType,
      cibleId,
    });

    console.log(
      `[Commentaires] Room rejointe : ${cibleType}:${cibleId}`,
    );

    /**
     * Nouveau commentaire.
     */
    const handleNouveauCommentaire = (
      commentaire: Commentaire,
    ) => {
      if (
        commentaire.cibleType !== cibleType ||
        commentaire.cibleId !== cibleId
      ) {
        return;
      }

      setCommentaires((prev) => {
        // Évite les doublons, notamment si le commentaire
        // vient d'être ajouté localement.
        if (prev.some((c) => c.id === commentaire.id)) {
          return prev;
        }

        return [...prev, commentaire];
      });
    };

    /**
     * Commentaire modifié.
     */
    const handleCommentaireModifie = (
      commentaire: Commentaire,
    ) => {
      if (
        commentaire.cibleType !== cibleType ||
        commentaire.cibleId !== cibleId
      ) {
        return;
      }

      setCommentaires((prev) =>
        prev.map((c) =>
          c.id === commentaire.id ? commentaire : c,
        ),
      );

      /**
       * Si le commentaire actuellement édité est celui qui vient
       * d'être modifié depuis un autre client, on peut sortir
       * du mode édition.
       */
      setIdEnEdition((currentId) =>
        currentId === commentaire.id ? null : currentId,
      );
    };

    /**
     * Commentaire supprimé.
     */
    const handleCommentaireSupprime = (data: {
      id: string;
    }) => {
      setCommentaires((prev) =>
        prev.filter((c) => c.id !== data.id),
      );

      setIdEnEdition((currentId) =>
        currentId === data.id ? null : currentId,
      );
    };

    socket.on(
      "commentaire:nouveau",
      handleNouveauCommentaire,
    );

    socket.on(
      "commentaire:modifie",
      handleCommentaireModifie,
    );

    socket.on(
      "commentaire:supprime",
      handleCommentaireSupprime,
    );

    return () => {
      socket.off(
        "commentaire:nouveau",
        handleNouveauCommentaire,
      );

      socket.off(
        "commentaire:modifie",
        handleCommentaireModifie,
      );

      socket.off(
        "commentaire:supprime",
        handleCommentaireSupprime,
      );
    };
  }, [socket, cibleType, cibleId]);

  /**
   * Ajouter un commentaire.
   */
  async function envoyer(e: React.FormEvent) {
    e.preventDefault();

    if (!nouveauContenu.trim()) return;

    setEnvoi(true);
    setErreur(null);

    try {
      const commentaire = await api.post<Commentaire>(
        "/commentaires",
        {
          contenu: nouveauContenu.trim(),
          cibleType,
          cibleId,
        },
      );

      /**
       * Le backend diffuse déjà ce commentaire via Socket.IO.
       *
       * On ne l'ajoute donc pas directement ici afin d'éviter
       * d'avoir deux fois le même commentaire.
       *
       * Le listener "commentaire:nouveau" ci-dessus va l'ajouter.
       */
      setCommentaires((prev) => {
        if (prev.some((c) => c.id === commentaire.id)) {
          return prev;
        }

        return [...prev, commentaire];
      });

      setNouveauContenu("");
    } catch (err) {
      setErreur(
        err instanceof ApiError
          ? err.message
          : "Erreur lors de l'envoi",
      );
    } finally {
      setEnvoi(false);
    }
  }

  /**
   * Commencer l'édition d'un commentaire.
   */
  function commencerEdition(commentaire: Commentaire) {
    setIdEnEdition(commentaire.id);
    setContenuEdition(commentaire.contenu);
    setErreur(null);
  }

  /**
   * Enregistrer une modification.
   */
  async function enregistrerEdition(id: string) {
    if (!contenuEdition.trim()) return;

    setErreur(null);

    try {
      const maj = await api.patch<Commentaire>(
        `/commentaires/${id}`,
        {
          contenu: contenuEdition.trim(),
        },
      );

      /**
       * Mise à jour immédiate de l'utilisateur qui modifie.
       *
       * Le backend diffuse également l'événement Socket.IO.
       * Le listener possède une protection pour éviter les doublons.
       */
      setCommentaires((prev) =>
        prev.map((c) => (c.id === id ? maj : c)),
      );

      setIdEnEdition(null);
      setContenuEdition("");
    } catch (err) {
      setErreur(
        err instanceof ApiError
          ? err.message
          : "Erreur lors de la modification",
      );
    }
  }

  /**
   * Supprimer un commentaire.
   */
  async function supprimer(id: string) {
    setErreur(null);

    try {
      await api.delete(`/commentaires/${id}`);

      /**
       * Suppression immédiate pour l'utilisateur courant.
       *
       * Les autres utilisateurs recevront
       * "commentaire:supprime" via Socket.IO.
       */
      setCommentaires((prev) =>
        prev.filter((c) => c.id !== id),
      );
    } catch (err) {
      setErreur(
        err instanceof ApiError
          ? err.message
          : "Erreur lors de la suppression",
      );
    }
  }

  return (
    <div>
      <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
        <MessageSquare
          size={18}
          className="text-ocre-dark"
        />

        Commentaires{" "}
        {commentaires.length > 0 &&
          `(${commentaires.length})`}
      </h2>

      {utilisateur && (
        <form
          onSubmit={envoyer}
          className="mb-6 flex flex-col gap-2"
        >
          <Textarea
            rows={2}
            value={nouveauContenu}
            onChange={(e) =>
              setNouveauContenu(e.target.value)
            }
            placeholder="Ajouter un commentaire…"
            disabled={envoi}
          />

          <Button
            type="submit"
            size="sm"
            disabled={
              envoi || !nouveauContenu.trim()
            }
            className="self-start"
          >
            {envoi ? "Envoi…" : "Publier"}
          </Button>
        </form>
      )}

      {erreur && (
        <p className="mb-3 text-sm text-brique">
          {erreur}
        </p>
      )}

      {chargement ? (
        <p className="text-sm text-ink-soft">
          Chargement…
        </p>
      ) : commentaires.length === 0 ? (
        <p className="text-sm text-ink-soft/70">
          Aucun commentaire pour le moment.
          {!utilisateur &&
            " Connectez-vous pour en laisser un."}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {commentaires.map((commentaire) => {
            const estAuteur =
              utilisateur?.id === commentaire.auteurId;

            const estAdmin =
              utilisateur?.role === "admin";

            const modifie =
              commentaire.dateModification !==
              commentaire.dateCreation;

            return (
              <div
                key={commentaire.id}
                className="flex gap-3"
              >
                <Avatar
                  nom={
                    commentaire.auteur?.nom ??
                    "Utilisateur"
                  }
                  photoUrl={
                    commentaire.auteur?.photoUrl
                  }
                  size={34}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">
                      {commentaire.auteur?.nom ??
                        "Utilisateur"}
                    </p>

                    <p className="text-xs text-ink-soft/60">
                      {formatDateCourte(
                        commentaire.dateCreation,
                      )}

                      {modifie && " · modifié"}
                    </p>
                  </div>

                  {idEnEdition ===
                  commentaire.id ? (
                    <div className="mt-1.5 flex flex-col gap-2">
                      <Textarea
                        rows={2}
                        value={contenuEdition}
                        onChange={(e) =>
                          setContenuEdition(
                            e.target.value,
                          )
                        }
                      />

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            enregistrerEdition(
                              commentaire.id,
                            )
                          }
                        >
                          Enregistrer
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setIdEnEdition(null);
                            setContenuEdition("");
                          }}
                        >
                          Annuler
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="mt-0.5 whitespace-pre-line text-sm text-ink-soft">
                        {commentaire.contenu}
                      </p>

                      {(estAuteur || estAdmin) && (
                        <div className="mt-1 flex gap-3">
                          {estAuteur && (
                            <button
                              type="button"
                              onClick={() =>
                                commencerEdition(
                                  commentaire,
                                )
                              }
                              className="inline-flex items-center gap-1 text-xs text-ink-soft/60 hover:text-ocre-dark"
                            >
                              <Pencil size={11} />
                              Modifier
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              supprimer(
                                commentaire.id,
                              )
                            }
                            className="inline-flex items-center gap-1 text-xs text-ink-soft/60 hover:text-brique"
                          >
                            <Trash2 size={11} />
                            Supprimer
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}