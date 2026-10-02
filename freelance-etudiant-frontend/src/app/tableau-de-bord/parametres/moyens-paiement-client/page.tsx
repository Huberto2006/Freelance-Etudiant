"use client";

import { useState } from "react";
import {
  Check,
  MoreVertical,
  Pencil,
  Plus,
  Smartphone,
  Star,
  Trash2,
  Wallet,
  X,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { useApiList } from "@/hooks/useApiList";

import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { ChargementPage, EtatVide, NoticeCard, PageHeader, Tag } from "@/components/ui/Notice";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

// ============================================================
// TYPES
//
// Volontairement limité au Mobile Money (pas de "BANQUE") : à la
// différence des moyens de paiement étudiant (qui ne font que RECEVOIR
// des fonds, un RIB a donc un sens), un moyen de paiement client sert à
// être DÉBITÉ automatiquement via l'API MVola — aucun fournisseur ne
// permet de prélever un compte bancaire en libre-service à Madagascar
// aujourd'hui. Voir common/utils (backend) migration 1807000000000.
// ============================================================

type TypeMoyenPaiementClient = "MVOLA" | "ORANGE_MONEY" | "AIRTEL_MONEY";

interface MoyenPaiementClient {
  id: string;
  type: TypeMoyenPaiementClient;
  operateur: string | null;
  numero: string;
  nomTitulaire: string;
  principal: boolean;
  actif: boolean;
  dateCreation: string;
}

const typeLabel: Record<TypeMoyenPaiementClient, string> = {
  MVOLA: "MVola",
  ORANGE_MONEY: "Orange Money",
  AIRTEL_MONEY: "Airtel Money",
};

type ActionMoyen = "modifier" | "principal" | "actif" | "supprimer" | null;

// ============================================================
// PAGE PRINCIPALE
// ============================================================

export default function MoyensPaiementClientPage() {
  const { utilisateur } = useAuth();
  const estClient = utilisateur?.role === "client";

  const { donnees, chargement, erreur, setErreur, recharger } = useApiList(
    () => api.get<MoyenPaiementClient[]>("/moyens-paiement-client"),
  );
  const moyens = donnees ?? [];

  const [ajoutOuvert, setAjoutOuvert] = useState(false);
  const [moyenSelectionne, setMoyenSelectionne] =
    useState<MoyenPaiementClient | null>(null);
  const [action, setAction] = useState<ActionMoyen>(null);
  const [envoiAction, setEnvoiAction] = useState(false);

  function fermerActions() {
    setMoyenSelectionne(null);
    setAction(null);
  }

  if (!utilisateur) return null;

  if (!estClient) {
    return (
      <div className="space-y-6">
        <PageHeader icon={Wallet} eyebrow="Paiements" title="Moyens de paiement" />
        <NoticeCard>
          <p className="text-sm text-ink-soft">
            Cette page est réservée aux clients.
          </p>
        </NoticeCard>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        icon={Wallet}
        eyebrow="Paiements"
        title="Mes moyens de paiement"
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm leading-6 text-ink-soft">
            Enregistrez vos numéros Mobile Money pour payer vos missions et
            services sans les retaper à chaque fois.
          </p>
          <p className="mt-1 text-xs text-ink-soft/70">
            Un paiement reste toujours soumis à la saisie de votre code
            secret MVola au moment de la transaction — enregistrer un
            numéro ne permet à personne d&rsquo;y accéder sans votre accord.
          </p>
        </div>

        <Button
          variant="primary"
          className="shrink-0"
          onClick={() => {
            setErreur(null);
            setAjoutOuvert(true);
          }}
        >
          <Plus size={16} />
          Ajouter un moyen
        </Button>
      </div>

      {ajoutOuvert && (
        <FormulaireMoyen
          titre="Ajouter un moyen de paiement"
          description="Ce numéro pourra être sélectionné lors d'un prochain paiement."
          moyenInitial={null}
          onFermer={() => setAjoutOuvert(false)}
          onTermine={async () => {
            setAjoutOuvert(false);
            await recharger();
          }}
        />
      )}

      {erreur && (
        <NoticeCard>
          <p className="text-sm text-brique-dark">{erreur}</p>
        </NoticeCard>
      )}

      {chargement ? (
        <ChargementPage />
      ) : moyens.length === 0 ? (
        <EtatVide
          icon={Wallet}
          action={
            <Button
              variant="secondary"
              className="mt-2"
              onClick={() => {
                setErreur(null);
                setAjoutOuvert(true);
              }}
            >
              <Plus size={16} />
              Ajouter mon premier moyen
            </Button>
          }
        >
          Aucun moyen de paiement enregistré. Ajoutez un numéro Mobile
          Money pour payer plus rapidement.
        </EtatVide>
      ) : (
        <div className="space-y-4">
          {moyens.map((moyen) => (
            <CarteMoyen
              key={moyen.id}
              moyen={moyen}
              onAction={(typeAction) => {
                setErreur(null);
                setMoyenSelectionne(moyen);
                setAction(typeAction);
              }}
            />
          ))}
        </div>
      )}

      {moyenSelectionne && action === "modifier" && (
        <FormulaireMoyen
          titre="Modifier ce moyen de paiement"
          description=""
          moyenInitial={moyenSelectionne}
          onFermer={fermerActions}
          onTermine={async () => {
            fermerActions();
            await recharger();
          }}
        />
      )}

      <ConfirmDialog
        ouvert={moyenSelectionne !== null && action === "principal"}
        titre="Définir comme moyen principal ?"
        description={
          moyenSelectionne
            ? `Le numéro ${moyenSelectionne.numero} sera présélectionné à chaque nouveau paiement.`
            : undefined
        }
        libelleConfirmer="Définir comme principal"
        destructif={false}
        onConfirmer={async () => {
          if (!moyenSelectionne) return;
          setEnvoiAction(true);
          try {
            await api.patch(
              `/moyens-paiement-client/${moyenSelectionne.id}/principal`,
              {},
            );
            fermerActions();
            await recharger();
          } catch (err) {
            setErreur(
              err instanceof ApiError
                ? err.message
                : "Impossible de définir ce moyen comme principal.",
            );
            fermerActions();
          } finally {
            setEnvoiAction(false);
          }
        }}
        onAnnuler={fermerActions}
      />

      <ConfirmDialog
        ouvert={moyenSelectionne !== null && action === "actif"}
        titre={
          moyenSelectionne?.actif
            ? "Désactiver ce moyen de paiement ?"
            : "Réactiver ce moyen de paiement ?"
        }
        description={
          moyenSelectionne?.actif
            ? "Il ne sera plus proposé pour un nouveau paiement."
            : "Il redeviendra disponible pour vos prochains paiements."
        }
        libelleConfirmer={moyenSelectionne?.actif ? "Désactiver" : "Réactiver"}
        destructif={!!moyenSelectionne?.actif}
        onConfirmer={async () => {
          if (!moyenSelectionne) return;
          setEnvoiAction(true);
          try {
            await api.patch(`/moyens-paiement-client/${moyenSelectionne.id}/actif`, {
              actif: !moyenSelectionne.actif,
            });
            fermerActions();
            await recharger();
          } catch (err) {
            setErreur(
              err instanceof ApiError
                ? err.message
                : "Impossible de modifier l'état de ce moyen.",
            );
            fermerActions();
          } finally {
            setEnvoiAction(false);
          }
        }}
        onAnnuler={fermerActions}
      />

      <ConfirmDialog
        ouvert={moyenSelectionne !== null && action === "supprimer"}
        titre="Supprimer ce moyen de paiement ?"
        description="Cette action est définitive. S'il a déjà servi à un paiement, utilisez plutôt la désactivation."
        libelleConfirmer="Supprimer"
        onConfirmer={async () => {
          if (!moyenSelectionne) return;
          setEnvoiAction(true);
          try {
            await api.delete(`/moyens-paiement-client/${moyenSelectionne.id}`);
            fermerActions();
            await recharger();
          } catch (err) {
            setErreur(
              err instanceof ApiError
                ? err.message
                : "Impossible de supprimer ce moyen de paiement.",
            );
            fermerActions();
          } finally {
            setEnvoiAction(false);
          }
        }}
        onAnnuler={fermerActions}
      />
    </div>
  );
}

// ============================================================
// CARTE MOYEN
// ============================================================

function CarteMoyen({
  moyen,
  onAction,
}: {
  moyen: MoyenPaiementClient;
  onAction: (action: Exclude<ActionMoyen, null>) => void;
}) {
  const [menuOuvert, setMenuOuvert] = useState(false);

  return (
    <NoticeCard className="relative">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ocre/10 text-ocre-dark">
          <Smartphone size={20} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-lg font-medium">
                  {typeLabel[moyen.type]}
                </h2>
                {moyen.principal && (
                  <Tag tone="ocre">
                    <span className="inline-flex items-center gap-1">
                      <Star size={12} />
                      Principal
                    </span>
                  </Tag>
                )}
                {!moyen.actif && <Tag tone="ink">Désactivé</Tag>}
              </div>
              <p className="mt-1 font-mono text-sm text-ink-soft">
                {moyen.numero}
              </p>
              <p className="text-sm text-ink-soft/70">{moyen.nomTitulaire}</p>
            </div>

            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setMenuOuvert((v) => !v)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition hover:bg-ink/5"
                aria-label="Actions"
              >
                <MoreVertical size={16} />
              </button>

              {menuOuvert && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setMenuOuvert(false)}
                  />
                  <div className="absolute right-0 top-9 z-20 w-48 rounded-xl border border-ink/10 bg-paper-light py-1.5 shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOuvert(false);
                        onAction("modifier");
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink transition hover:bg-ink/5"
                    >
                      <Pencil size={15} />
                      Modifier
                    </button>
                    {!moyen.principal && moyen.actif && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOuvert(false);
                          onAction("principal");
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink transition hover:bg-ink/5"
                      >
                        <Star size={15} />
                        Définir comme principal
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOuvert(false);
                        onAction("actif");
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink transition hover:bg-ink/5"
                    >
                      {moyen.actif ? <X size={15} /> : <Check size={15} />}
                      {moyen.actif ? "Désactiver" : "Réactiver"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOuvert(false);
                        onAction("supprimer");
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-brique transition hover:bg-brique/5"
                    >
                      <Trash2 size={15} />
                      Supprimer
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </NoticeCard>
  );
}

// ============================================================
// FORMULAIRE
// ============================================================

function FormulaireMoyen({
  titre,
  description,
  moyenInitial,
  onFermer,
  onTermine,
}: {
  titre: string;
  description: string;
  moyenInitial: MoyenPaiementClient | null;
  onFermer: () => void;
  onTermine: () => Promise<void>;
}) {
  const [type, setType] = useState<TypeMoyenPaiementClient>(
    moyenInitial?.type ?? "MVOLA",
  );
  const [numero, setNumero] = useState(moyenInitial?.numero ?? "");
  const [nomTitulaire, setNomTitulaire] = useState(
    moyenInitial?.nomTitulaire ?? "",
  );
  const [principal, setPrincipal] = useState(moyenInitial?.principal ?? false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const estModification = moyenInitial !== null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);

    const numeroNettoye = numero.trim();
    const titulaireNettoye = nomTitulaire.trim();

    if (!numeroNettoye) {
      setErreur("Le numéro est obligatoire.");
      return;
    }
    if (!titulaireNettoye) {
      setErreur("Le nom du titulaire est obligatoire.");
      return;
    }

    setEnvoi(true);
    try {
      const donnees = {
        type,
        numero: numeroNettoye,
        nomTitulaire: titulaireNettoye,
        principal,
      };

      if (estModification) {
        await api.patch(`/moyens-paiement-client/${moyenInitial.id}`, donnees);
      } else {
        await api.post("/moyens-paiement-client", donnees);
      }

      await onTermine();
    } catch (err) {
      setErreur(
        err instanceof ApiError
          ? err.message
          : "Impossible d'enregistrer ce moyen de paiement.",
      );
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <NoticeCard>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-medium">{titre}</h2>
          {description && (
            <p className="mt-1 text-sm text-ink-soft">{description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onFermer}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-soft transition hover:bg-ink/5"
          aria-label="Fermer"
        >
          <X size={16} />
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Opérateur" htmlFor="type-moyen">
          <Select
            id="type-moyen"
            value={type}
            onChange={(e) =>
              setType(e.target.value as TypeMoyenPaiementClient)
            }
            disabled={envoi}
          >
            <option value="MVOLA">MVola</option>
            <option value="ORANGE_MONEY">Orange Money</option>
            <option value="AIRTEL_MONEY">Airtel Money</option>
          </Select>
          {type !== "MVOLA" && (
            <p className="mt-1.5 text-xs text-ink-soft/70">
              Seul MVola est actuellement utilisable pour un paiement en
              ligne sur la plateforme. Ce numéro sera enregistré pour plus
              tard.
            </p>
          )}
        </Field>

        <Field label="Numéro" htmlFor="numero-moyen">
          <Input
            id="numero-moyen"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="0341234567"
            disabled={envoi}
          />
        </Field>

        <Field label="Nom du titulaire" htmlFor="titulaire-moyen">
          <Input
            id="titulaire-moyen"
            value={nomTitulaire}
            onChange={(e) => setNomTitulaire(e.target.value)}
            placeholder="Votre nom tel qu'enregistré chez l'opérateur"
            disabled={envoi}
          />
        </Field>

        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={principal}
            onChange={(e) => setPrincipal(e.target.checked)}
            disabled={envoi}
            className="h-4 w-4 rounded border-ink/30"
          />
          Définir comme moyen principal
        </label>

        {erreur && <p className="text-sm text-brique-dark">{erreur}</p>}

        <div className="flex justify-end gap-2.5">
          <Button type="button" variant="ghost" onClick={onFermer} disabled={envoi}>
            Annuler
          </Button>
          <Button type="submit" variant="primary" disabled={envoi}>
            {envoi ? "Enregistrement…" : estModification ? "Enregistrer" : "Ajouter"}
          </Button>
        </div>
      </form>
    </NoticeCard>
  );
}
