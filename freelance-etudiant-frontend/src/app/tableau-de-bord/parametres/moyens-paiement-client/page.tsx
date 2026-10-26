"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("settings.clientMethods");
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
        <PageHeader icon={Wallet} eyebrow={t("eyebrow")} title={t("titleGeneric")} />
        <NoticeCard>
          <p className="text-sm text-ink-soft">
            {t("clientsOnly")}
          </p>
        </NoticeCard>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <PageHeader
        icon={Wallet}
        eyebrow={t("eyebrow")}
        title={t("title")}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm leading-6 text-ink-soft">
            {t("intro")}
          </p>
          <p className="mt-1 text-xs text-ink-soft/70">
            {t("security")}
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
          {t("addMethod")}
        </Button>
      </div>

      {ajoutOuvert && (
        <FormulaireMoyen
          titre={t("addTitle")}
          description={t("addDescription")}
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
              {t("addFirst")}
            </Button>
          }
        >
          {t("empty")}
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
          titre={t("editTitle")}
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
        titre={t("primaryTitle")}
        description={
          moyenSelectionne
            ? t("primaryDescription", { numero: moyenSelectionne.numero })
            : undefined
        }
        libelleConfirmer={t("setPrimary")}
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
                : t("errPrimary"),
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
            ? t("deactivateTitle")
            : t("reactivateTitle")
        }
        description={
          moyenSelectionne?.actif
            ? t("deactivateDescription")
            : t("reactivateDescription")
        }
        libelleConfirmer={moyenSelectionne?.actif ? t("deactivate") : t("reactivate")}
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
                : t("errToggle"),
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
        titre={t("deleteTitle")}
        description={t("deleteDescription")}
        libelleConfirmer={t("delete")}
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
                : t("errDelete"),
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
  const t = useTranslations("settings.clientMethods");
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
                      {t("primary")}
                    </span>
                  </Tag>
                )}
                {!moyen.actif && <Tag tone="ink">{t("deactivated")}</Tag>}
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
                aria-label={t("actions")}
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
                      {t("edit")}
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
                        {t("setPrimary")}
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
                      {moyen.actif ? t("deactivate") : t("reactivate")}
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
                      {t("delete")}
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
  const t = useTranslations("settings.clientMethods");
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
      setErreur(t("errNumberRequired"));
      return;
    }
    if (!titulaireNettoye) {
      setErreur(t("errHolderRequired"));
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
          : t("errSave"),
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
          aria-label={t("close")}
        >
          <X size={16} />
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <Field label={t("operator")} htmlFor="type-moyen">
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
              {t("onlyMvola")}
            </p>
          )}
        </Field>

        <Field label={t("number")} htmlFor="numero-moyen">
          <Input
            id="numero-moyen"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="0341234567"
            disabled={envoi}
          />
        </Field>

        <Field label={t("holderName")} htmlFor="titulaire-moyen">
          <Input
            id="titulaire-moyen"
            value={nomTitulaire}
            onChange={(e) => setNomTitulaire(e.target.value)}
            placeholder={t("holderPlaceholder")}
            disabled={envoi}
          />
        </Field>

        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={principal}
            onChange={(e) => setPrincipal(e.target.checked)}
            disabled={envoi}
            className="h-4 w-4 rounded border-ink/30 accent-ocre"
          />
          {t("setAsPrimaryMethod")}
        </label>

        {erreur && <p className="text-sm text-brique-dark">{erreur}</p>}

        <div className="flex justify-end gap-2.5">
          <Button type="button" variant="ghost" onClick={onFermer} disabled={envoi}>
            {t("cancel")}
          </Button>
          <Button type="submit" variant="primary" disabled={envoi}>
            {envoi ? t("saving") : estModification ? t("save") : t("add")}
          </Button>
        </div>
      </form>
    </NoticeCard>
  );
}
