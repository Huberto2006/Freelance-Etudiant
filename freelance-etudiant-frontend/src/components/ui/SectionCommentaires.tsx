"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Pencil, Trash2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Commentaire, TypeCibleContenu } from "@/lib/types";
import { formatDateCourte } from "@/lib/format";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";

/**
 * Section commentaires réutilisable sous une mission ou un service.
 * Lecture publique, écriture réservée aux utilisateurs connectés ; chacun
 * ne peut modifier/supprimer que ses propres commentaires (un admin peut
 * aussi supprimer, pour la modération).
 */
export function SectionCommentaires({
  cibleType,
  cibleId,
}: {
  cibleType: TypeCibleContenu;
  cibleId: string;
}) {
  const { utilisateur } = useAuth();
  const [commentaires, setCommentaires] = useState<Commentaire[]>([]);
  const [chargement, setChargement] = useState(true);
  const [nouveauContenu, setNouveauContenu] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [idEnEdition, setIdEnEdition] = useState<string | null>(null);
  const [contenuEdition, setContenuEdition] = useState("");

  useEffect(() => {
    api
      .get<Commentaire[]>(
        `/commentaires?cibleType=${cibleType}&cibleId=${cibleId}`,
        { auth: false },
      )
      .then(setCommentaires)
      .finally(() => setChargement(false));
  }, [cibleType, cibleId]);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if (!nouveauContenu.trim()) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const commentaire = await api.post<Commentaire>("/commentaires", {
        contenu: nouveauContenu.trim(),
        cibleType,
        cibleId,
      });
      setCommentaires((prev) => [...prev, commentaire]);
      setNouveauContenu("");
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : "Erreur lors de l'envoi");
    } finally {
      setEnvoi(false);
    }
  }

  function commencerEdition(commentaire: Commentaire) {
    setIdEnEdition(commentaire.id);
    setContenuEdition(commentaire.contenu);
  }

  async function enregistrerEdition(id: string) {
    if (!contenuEdition.trim()) return;
    try {
      const maj = await api.patch<Commentaire>(`/commentaires/${id}`, {
        contenu: contenuEdition.trim(),
      });
      setCommentaires((prev) => prev.map((c) => (c.id === id ? maj : c)));
      setIdEnEdition(null);
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : "Erreur lors de la modification");
    }
  }

  async function supprimer(id: string) {
    try {
      await api.delete(`/commentaires/${id}`);
      setCommentaires((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : "Erreur lors de la suppression");
    }
  }

  return (
    <div>
      <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
        <MessageSquare size={18} className="text-ocre-dark" />
        Commentaires {commentaires.length > 0 && `(${commentaires.length})`}
      </h2>

      {utilisateur && (
        <form onSubmit={envoyer} className="mb-6 flex flex-col gap-2">
          <Textarea
            rows={2}
            value={nouveauContenu}
            onChange={(e) => setNouveauContenu(e.target.value)}
            placeholder="Ajouter un commentaire…"
            disabled={envoi}
          />
          <Button
            type="submit"
            size="sm"
            disabled={envoi || !nouveauContenu.trim()}
            className="self-start"
          >
            {envoi ? "Envoi…" : "Publier"}
          </Button>
        </form>
      )}

      {erreur && <p className="mb-3 text-sm text-brique">{erreur}</p>}

      {chargement ? (
        <p className="text-sm text-ink-soft">Chargement…</p>
      ) : commentaires.length === 0 ? (
        <p className="text-sm text-ink-soft/70">
          Aucun commentaire pour le moment.
          {!utilisateur && " Connectez-vous pour en laisser un."}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {commentaires.map((commentaire) => {
            const estAuteur = utilisateur?.id === commentaire.auteurId;
            const estAdmin = utilisateur?.role === "admin";
            const modifie =
              commentaire.dateModification !== commentaire.dateCreation;

            return (
              <div key={commentaire.id} className="flex gap-3">
                <Avatar
                  nom={commentaire.auteur?.nom ?? "Utilisateur"}
                  photoUrl={commentaire.auteur?.photoUrl}
                  size={34}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">
                      {commentaire.auteur?.nom ?? "Utilisateur"}
                    </p>
                    <p className="text-xs text-ink-soft/60">
                      {formatDateCourte(commentaire.dateCreation)}
                      {modifie && " · modifié"}
                    </p>
                  </div>

                  {idEnEdition === commentaire.id ? (
                    <div className="mt-1.5 flex flex-col gap-2">
                      <Textarea
                        rows={2}
                        value={contenuEdition}
                        onChange={(e) => setContenuEdition(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => enregistrerEdition(commentaire.id)}
                        >
                          Enregistrer
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setIdEnEdition(null)}
                        >
                          Annuler
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="mt-0.5 text-sm text-ink-soft whitespace-pre-line">
                        {commentaire.contenu}
                      </p>
                      {(estAuteur || estAdmin) && (
                        <div className="mt-1 flex gap-3">
                          {estAuteur && (
                            <button
                              type="button"
                              onClick={() => commencerEdition(commentaire)}
                              className="inline-flex items-center gap-1 text-xs text-ink-soft/60 hover:text-ocre-dark"
                            >
                              <Pencil size={11} />
                              Modifier
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => supprimer(commentaire.id)}
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
