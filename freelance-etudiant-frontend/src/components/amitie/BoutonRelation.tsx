"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Loader2,
  MessageCircle,
  UserPlus,
  X,
  UserMinus,
} from "lucide-react";

import { ApiError } from "@/lib/api";
import {
  accepterDemandeAmitie,
  chargerRelationsAmitie,
  envoyerDemandeAmitie,
  lienConversation,
  refuserDemandeAmitie,
  relationAvec,
  retirerAmitie,
  type RelationAvec,
  type RelationsAmitie,
} from "@/lib/amitie";
import { useAuth } from "@/lib/auth-context";

import { Button } from "@/components/ui/Button";

export function BoutonRelation({
  etudiantId,
  nom,
  statut,
  statutChange,
  libelleAjout = "Ajouter",
  avecRetrait = false,
  compact = false,
}: {
  etudiantId: string;
  nom: string;
  statut?: RelationAvec;
  statutChange?: (nouveauStatut: RelationAvec) => void;
  libelleAjout?: string;
  avecRetrait?: boolean;
  compact?: boolean;
}) {
  const { utilisateur } = useAuth();

  const [relations, setRelations] = useState<RelationsAmitie | null>(null);
  const [chargement, setChargement] = useState(false);
  const [actionEnCours, setActionEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const statutCourant: RelationAvec =
    statut ?? (relations ? relationAvec(relations, etudiantId) : "aucun");

  const taille = compact ? "sm" : "md";

  /*
   * Mode autonome :
   * le composant charge lui-même les relations.
   *
   * En mode contrôlé, la page parent fournit déjà le statut.
   */
  useEffect(() => {
    if (statut !== undefined || !utilisateur || !etudiantId) {
      return;
    }

    let annule = false;

    setChargement(true);

    chargerRelationsAmitie()
      .then((donnees) => {
        if (!annule) {
          setRelations(donnees);
        }
      })
      .catch(() => {
        if (!annule) {
          setRelations(null);
        }
      })
      .finally(() => {
        if (!annule) {
          setChargement(false);
        }
      });

    return () => {
      annule = true;
    };
  }, [statut, utilisateur, etudiantId]);

  /*
   * Applique le nouveau statut.
   *
   * En mode contrôlé :
   * on laisse le parent gérer l'état.
   *
   * En mode autonome :
   * on modifie localement les relations.
   */
  const appliquerStatut = useCallback(
    (nouveauStatut: RelationAvec) => {
      if (statutChange) {
        statutChange(nouveauStatut);
        return;
      }

      setRelations((precedente) => {
        if (!precedente) {
          return precedente;
        }

        const suivante: RelationsAmitie = {
          amisIds: new Set(precedente.amisIds),
          recuesParEtudiant: new Map(precedente.recuesParEtudiant),
          envoyeesParEtudiant: new Map(precedente.envoyeesParEtudiant),
        };

        if (nouveauStatut === "amis") {
          suivante.amisIds.add(etudiantId);
          suivante.recuesParEtudiant.delete(etudiantId);
          suivante.envoyeesParEtudiant.delete(etudiantId);
        }

        if (nouveauStatut === "demande_envoyee") {
          suivante.envoyeesParEtudiant.set(etudiantId, {
            id: "",
            statut: "en_attente",
            dateCreation: new Date().toISOString(),
            receveur: {
              id: etudiantId,
              nom,
              photoUrl: null,
              niveauEtude: null,
              universite: null,
              competences: [],
            },
          });
        }

        if (nouveauStatut === "aucun") {
          suivante.amisIds.delete(etudiantId);
          suivante.recuesParEtudiant.delete(etudiantId);
          suivante.envoyeesParEtudiant.delete(etudiantId);
        }

        return suivante;
      });
    },
    [statutChange, etudiantId, nom],
  );

  async function executer(
    action: () => Promise<unknown>,
    resultat: RelationAvec,
  ) {
    setErreur(null);
    setActionEnCours(true);

    try {
      await action();
      appliquerStatut(resultat);
    } catch (err) {
      setErreur(
        err instanceof ApiError
          ? err.message
          : "Une erreur est survenue.",
      );
    } finally {
      setActionEnCours(false);
    }
  }

  /**
   * Recherche l'identifiant de la demande reçue.
   */
  async function demanderIdRecue(): Promise<string> {
    const courantes = relations ?? (await chargerRelationsAmitie());

    const demande = courantes.recuesParEtudiant.get(etudiantId);

    if (!demande?.id) {
      throw new ApiError(404, "Demande introuvable.");
    }

    return demande.id;
  }

  /**
   * Envoie une demande d'amitié.
   */
  function ajouterAmi() {
    void executer(
      () => envoyerDemandeAmitie(etudiantId),
      "demande_envoyee",
    );
  }

  /**
   * Accepte une demande reçue.
   */
  function accepter() {
    void executer(
      async () => {
        const demandeId = await demanderIdRecue();
        await accepterDemandeAmitie(demandeId);
      },
      "amis",
    );
  }

  /**
   * Refuse une demande reçue.
   */
  function refuser() {
    void executer(
      async () => {
        const demandeId = await demanderIdRecue();
        await refuserDemandeAmitie(demandeId);
      },
      "aucun",
    );
  }

  /**
   * Retire l'amitié.
   */
  function retirer() {
    void executer(
      () => retirerAmitie(etudiantId),
      "aucun",
    );
  }

  /**
   * Ouvre la conversation privée existante.
   *
   * lienConversation est volontairement utilisé au lieu
   * de créer une nouvelle logique de messagerie.
   */
  function ouvrirConversation() {
    setErreur(null);

    if (!utilisateur) {
      return;
    }

    try {
      const lien = lienConversation(utilisateur.id, etudiantId);

      if (typeof window !== "undefined") {
        window.location.href = lien;
      }
    } catch (err) {
      setErreur(
        err instanceof ApiError
          ? err.message
          : "Impossible d'ouvrir la conversation.",
      );
    }
  }

  /*
   * Aucun utilisateur connecté.
   */
  if (!utilisateur) {
    return null;
  }

  /*
   * On ne permet pas d'agir sur son propre profil.
   */
  if (utilisateur.id === etudiantId) {
    return null;
  }

  /*
   * Chargement initial en mode autonome.
   */
  if (chargement) {
    return (
      <Button
        type="button"
        variant="secondary"
        size={taille}
        disabled
      >
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Chargement...
      </Button>
    );
  }

  /*
   * Demande déjà envoyée.
   */
  if (statutCourant === "demande_envoyee") {
    return (
      <div className="flex flex-col items-start gap-1">
        <Button
          type="button"
          variant="secondary"
          size={taille}
          disabled={actionEnCours}
        >
          {actionEnCours ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Check className="mr-2 h-4 w-4" />
          )}

          Demande envoyée
        </Button>

        {erreur && (
          <p className="text-xs text-red-500">
            {erreur}
          </p>
        )}
      </div>
    );
  }

  /*
   * Demande reçue.
   */
  if (statutCourant === "demande_recue") {
    return (
      <div className="flex flex-col items-start gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="primary"
            size={taille}
            disabled={actionEnCours}
            onClick={accepter}
          >
            {actionEnCours ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}

            Accepter
          </Button>

          <Button
            type="button"
            variant="secondary"
            size={taille}
            disabled={actionEnCours}
            onClick={refuser}
          >
            <X className="mr-2 h-4 w-4" />
            Refuser
          </Button>
        </div>

        {erreur && (
          <p className="text-xs text-red-500">
            {erreur}
          </p>
        )}
      </div>
    );
  }

  /*
   * Déjà amis.
   */
  if (statutCourant === "amis") {
    return (
      <div className="flex flex-col items-start gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="primary"
            size={taille}
            disabled={actionEnCours}
            onClick={ouvrirConversation}
          >
            {actionEnCours ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <MessageCircle className="mr-2 h-4 w-4" />
            )}

            Message
          </Button>

          {avecRetrait && (
            <Button
              type="button"
              variant="secondary"
              size={taille}
              disabled={actionEnCours}
              onClick={retirer}
              title="Retirer de mes amis"
            >
              {actionEnCours ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserMinus className="h-4 w-4" />
              )}

              {!compact && (
                <span className="ml-2">
                  Retirer
                </span>
              )}
            </Button>
          )}
        </div>

        {erreur && (
          <p className="text-xs text-red-500">
            {erreur}
          </p>
        )}
      </div>
    );
  }

  /*
   * Aucun lien.
   */
  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        type="button"
        variant="primary"
        size={taille}
        disabled={actionEnCours}
        onClick={ajouterAmi}
      >
        {actionEnCours ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <UserPlus className="mr-2 h-4 w-4" />
        )}

        {libelleAjout}
      </Button>

      {erreur && (
        <p className="text-xs text-red-500">
          {erreur}
        </p>
      )}
    </div>
  );
}
