"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  Check,
  MoreVertical,
  Pencil,
  Play,
  Plus,
  Smartphone,
  Star,
  Trash2,
  Wallet,
  X,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";

import { Button } from "@/components/ui/Button";
import {
  Field,
  Input,
  Select,
} from "@/components/ui/Field";

import {
  NoticeCard,
  PageHeader,
  Tag,
} from "@/components/ui/Notice";

// ============================================================
// TYPES
// ============================================================

type TypeMoyenPaiement =
  | "MVOLA"
  | "ORANGE_MONEY"
  | "AIRTEL_MONEY"
  | "BANQUE";

interface MoyenPaiement {
  id: string;
  type: TypeMoyenPaiement;
  operateur: string | null;
  nomBanque: string | null;
  numero: string;
  nomTitulaire: string;
  principal: boolean;
  actif: boolean;
  dateCreation: string;
  dateMaj: string;
}

type ActionMoyen =
  | "modifier"
  | "principal"
  | "actif"
  | "supprimer"
  | null;

// ============================================================
// LIBELLES
// ============================================================

const typeLabel: Record<TypeMoyenPaiement, string> = {
  MVOLA: "MVola",
  ORANGE_MONEY: "Orange Money",
  AIRTEL_MONEY: "Airtel Money",
  BANQUE: "Compte bancaire",
};

// ============================================================
// ICONE
// ============================================================

function IconeMoyen({
  type,
}: {
  type: TypeMoyenPaiement;
}) {
  if (type === "BANQUE") {
    return <Building2 size={20} />;
  }

  return <Smartphone size={20} />;
}

// ============================================================
// PAGE PRINCIPALE
// ============================================================

export default function MoyensPaiementPage() {
  const { utilisateur } = useAuth();

  const [moyens, setMoyens] = useState<MoyenPaiement[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const [ajoutOuvert, setAjoutOuvert] = useState(false);

  const [moyenSelectionne, setMoyenSelectionne] =
    useState<MoyenPaiement | null>(null);

  const [action, setAction] = useState<ActionMoyen>(null);

  const chargerMoyens = useCallback(async () => {
    setChargement(true);
    setErreur(null);

    try {
      const resultat = await api.get<MoyenPaiement[]>(
        "/moyens-paiement",
      );

      setMoyens(resultat);
    } catch (err) {
      setErreur(
        err instanceof ApiError
          ? err.message
          : "Impossible de charger vos moyens de paiement.",
      );
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    if (utilisateur?.role === "etudiant") {
      void chargerMoyens();
    } else {
      setChargement(false);
    }
  }, [utilisateur, chargerMoyens]);

  function fermerActions() {
    setMoyenSelectionne(null);
    setAction(null);
  }

  if (!utilisateur) {
    return null;
  }

  if (utilisateur.role !== "etudiant") {
    return (
      <div className="space-y-6">
        <PageHeader
          icon={Wallet}
          eyebrow="Paiements"
          title="Moyens de paiement"
        />

        <NoticeCard>
          <p className="text-sm text-ink-soft">
            Cette page est réservée aux étudiants.
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
            Gérez les coordonnées sur lesquelles vos clients pourront
            effectuer leurs paiements.
          </p>

          <p className="mt-1 text-xs text-ink-soft/70">
            Vos coordonnées ne sont pas affichées sur votre profil public.
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

      {/* ======================================================
          FORMULAIRE AJOUT
          ====================================================== */}

      {ajoutOuvert && (
        <FormulaireAjoutMoyen
          onFermer={() => setAjoutOuvert(false)}
          onAjoute={async () => {
            setAjoutOuvert(false);
            await chargerMoyens();
          }}
        />
      )}

      {/* ======================================================
          ERREUR
          ====================================================== */}

      {erreur && (
        <NoticeCard>
          <p className="text-sm text-brique-dark">
            {erreur}
          </p>
        </NoticeCard>
      )}

      {/* ======================================================
          LISTE
          ====================================================== */}

      {chargement ? (
        <NoticeCard>
          <p className="text-sm text-ink-soft">
            Chargement de vos moyens de paiement…
          </p>
        </NoticeCard>
      ) : moyens.length === 0 ? (
        <NoticeCard>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <span
              className="
                flex h-12 w-12 items-center justify-center
                rounded-full bg-ocre/10 text-ocre-dark
              "
            >
              <Wallet size={22} />
            </span>

            <h2 className="mt-4 font-display text-lg font-medium">
              Aucun moyen de paiement
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-ink-soft">
              Ajoutez un numéro Mobile Money ou un compte bancaire afin
              de pouvoir recevoir vos paiements.
            </p>

            <Button
              variant="secondary"
              className="mt-5"
              onClick={() => {
                setErreur(null);
                setAjoutOuvert(true);
              }}
            >
              <Plus size={16} />
              Ajouter mon premier moyen
            </Button>
          </div>
        </NoticeCard>
      ) : (
        <div className="space-y-4">
          {moyens.map((moyen) => (
            <CarteMoyenPaiement
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

      {/* ======================================================
          MODALE ACTION
          ====================================================== */}

      {moyenSelectionne && action === "modifier" && (
        <ModalModifierMoyen
          moyen={moyenSelectionne}
          onFermer={fermerActions}
          onModifie={async () => {
            fermerActions();
            await chargerMoyens();
          }}
        />
      )}

      {moyenSelectionne && action === "principal" && (
        <ModalPrincipal
          moyen={moyenSelectionne}
          onFermer={fermerActions}
          onConfirmer={async () => {
            try {
              setErreur(null);

              await api.patch(
                `/moyens-paiement/${moyenSelectionne.id}/principal`,
                {},
              );

              fermerActions();
              await chargerMoyens();
            } catch (err) {
              setErreur(
                err instanceof ApiError
                  ? err.message
                  : "Impossible de définir ce moyen comme principal.",
              );
            }
          }}
        />
      )}

      {moyenSelectionne && action === "actif" && (
        <ModalActivation
          moyen={moyenSelectionne}
          onFermer={fermerActions}
          onConfirmer={async () => {
            try {
              setErreur(null);

              await api.patch(
                `/moyens-paiement/${moyenSelectionne.id}/actif`,
                {
                  actif: !moyenSelectionne.actif,
                },
              );

              fermerActions();
              await chargerMoyens();
            } catch (err) {
              setErreur(
                err instanceof ApiError
                  ? err.message
                  : "Impossible de modifier l'état de ce moyen.",
              );
            }
          }}
        />
      )}

      {moyenSelectionne && action === "supprimer" && (
        <ModalSuppression
          moyen={moyenSelectionne}
          onFermer={fermerActions}
          onConfirmer={async () => {
            try {
              setErreur(null);

              await api.delete(
                `/moyens-paiement/${moyenSelectionne.id}`,
              );

              fermerActions();
              await chargerMoyens();
            } catch (err) {
              setErreur(
                err instanceof ApiError
                  ? err.message
                  : "Impossible de supprimer ce moyen de paiement.",
              );
            }
          }}
        />
      )}
    </div>
  );
}

// ============================================================
// CARTE MOYEN
// ============================================================

function CarteMoyenPaiement({
  moyen,
  onAction,
}: {
  moyen: MoyenPaiement;
  onAction: (action: Exclude<ActionMoyen, null>) => void;
}) {
  const [menuOuvert, setMenuOuvert] = useState(false);

  return (
    <NoticeCard className="relative">
      <div className="flex items-start gap-4">
        <span
          className="
            flex h-11 w-11 shrink-0 items-center justify-center
            rounded-full bg-ocre/10 text-ocre-dark
          "
        >
          <IconeMoyen type={moyen.type} />
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

                <Tag tone={moyen.actif ? "rice" : "brique"}>
                  {moyen.actif ? "Actif" : "Inactif"}
                </Tag>
              </div>

              {moyen.type === "BANQUE" &&
                moyen.nomBanque && (
                  <p className="mt-1 text-sm text-ink-soft">
                    {moyen.nomBanque}
                  </p>
                )}

              {moyen.type !== "BANQUE" &&
                moyen.operateur && (
                  <p className="mt-1 text-sm text-ink-soft">
                    {moyen.operateur}
                  </p>
                )}
            </div>

            {/* MENU ⋮ */}
            <div className="relative shrink-0">
              <button
                type="button"
                aria-label={`Actions pour ${typeLabel[moyen.type]}`}
                aria-expanded={menuOuvert}
                className="
                  rounded-lg p-2
                  text-ink-soft
                  transition-colors
                  hover:bg-paper-light
                  hover:text-ink
                "
                onClick={() =>
                  setMenuOuvert((ouvert) => !ouvert)
                }
              >
                <MoreVertical size={18} />
              </button>

              {menuOuvert && (
                <>
                  <button
                    type="button"
                    aria-label="Fermer le menu"
                    className="fixed inset-0 z-20 cursor-default"
                    onClick={() => setMenuOuvert(false)}
                  />

                  <div
                    className="
                      absolute right-0 top-10 z-30
                      w-56 overflow-hidden
                      rounded-xl
                      border border-ink/10
                      bg-paper
                      p-1
                      shadow-lg
                    "
                  >
                    {/* MODIFIER */}
                    <button
                      type="button"
                      className="
                        flex w-full items-center gap-3
                        rounded-lg px-3 py-2.5
                        text-left text-sm text-ink
                        transition-colors
                        hover:bg-paper-light
                      "
                      onClick={() => {
                        setMenuOuvert(false);
                        onAction("modifier");
                      }}
                    >
                      <Pencil size={16} />
                      Modifier
                    </button>

                    {/* PRINCIPAL */}
                    {!moyen.principal && moyen.actif && (
                      <button
                        type="button"
                        className="
                          flex w-full items-center gap-3
                          rounded-lg px-3 py-2.5
                          text-left text-sm text-ink
                          transition-colors
                          hover:bg-paper-light
                        "
                        onClick={() => {
                          setMenuOuvert(false);
                          onAction("principal");
                        }}
                      >
                        <Star size={16} />
                        Définir comme principal
                      </button>
                    )}

                    {/* ACTIVATION */}
                    <button
                      type="button"
                      className="
                        flex w-full items-center gap-3
                        rounded-lg px-3 py-2.5
                        text-left text-sm text-ink
                        transition-colors
                        hover:bg-paper-light
                      "
                      onClick={() => {
                        setMenuOuvert(false);
                        onAction("actif");
                      }}
                    >
                      {moyen.actif ? (
                        <>
                          <Check size={16} />
                          Désactiver
                        </>
                      ) : (
                        <>
                          <Play size={16} />
                          Activer
                        </>
                      )}
                    </button>

                    <div className="my-1 border-t border-ink/10" />

                    {/* SUPPRIMER */}
                    <button
                      type="button"
                      className="
                        flex w-full items-center gap-3
                        rounded-lg px-3 py-2.5
                        text-left text-sm
                        text-brique-dark
                        transition-colors
                        hover:bg-brique/5
                      "
                      onClick={() => {
                        setMenuOuvert(false);
                        onAction("supprimer");
                      }}
                    >
                      <Trash2 size={16} />
                      Supprimer
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mt-4">
            <p className="font-mono text-base tracking-wide text-ink">
              {moyen.numero}
            </p>

            <p className="mt-1 text-sm text-ink-soft">
              Titulaire : {moyen.nomTitulaire}
            </p>
          </div>
        </div>
      </div>
    </NoticeCard>
  );
}

// ============================================================
// FORMULAIRE AJOUT
// ============================================================

function FormulaireAjoutMoyen({
  onFermer,
  onAjoute,
}: {
  onFermer: () => void;
  onAjoute: () => Promise<void>;
}) {
  return (
    <FormulaireMoyen
      titre="Ajouter un moyen de paiement"
      description="Ajoutez les coordonnées sur lesquelles vous souhaitez recevoir vos paiements."
      moyenInitial={null}
      onFermer={onFermer}
      onTermine={onAjoute}
    />
  );
}

// ============================================================
// FORMULAIRE MODIFICATION
// ============================================================

function ModalModifierMoyen({
  moyen,
  onFermer,
  onModifie,
}: {
  moyen: MoyenPaiement;
  onFermer: () => void;
  onModifie: () => Promise<void>;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto">
        <FormulaireMoyen
          titre="Modifier le moyen de paiement"
          description="Modifiez les coordonnées de ce moyen de paiement."
          moyenInitial={moyen}
          onFermer={onFermer}
          onTermine={onModifie}
        />
      </div>
    </div>
  );
}

// ============================================================
// FORMULAIRE COMMUN
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
  moyenInitial: MoyenPaiement | null;
  onFermer: () => void;
  onTermine: () => Promise<void>;
}) {
  const [type, setType] = useState<TypeMoyenPaiement>(
    moyenInitial?.type ?? "MVOLA",
  );

  const [numero, setNumero] = useState(
    moyenInitial?.numero ?? "",
  );

  const [nomTitulaire, setNomTitulaire] = useState(
    moyenInitial?.nomTitulaire ?? "",
  );

  const [nomBanque, setNomBanque] = useState(
    moyenInitial?.nomBanque ?? "",
  );

  const [operateur, setOperateur] = useState(
    moyenInitial?.operateur ?? "",
  );

  const [principal, setPrincipal] = useState(
    moyenInitial?.principal ?? false,
  );

  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const estBanque = type === "BANQUE";
  const estModification = moyenInitial !== null;

  function changerType(
    nouveauType: TypeMoyenPaiement,
  ) {
    setType(nouveauType);
    setErreur(null);

    if (nouveauType !== "BANQUE") {
      setNomBanque("");
    } else {
      setOperateur("");
    }
  }

  async function onSubmit(
    e: React.FormEvent,
  ) {
    e.preventDefault();
    setErreur(null);

    const numeroNettoye = numero.trim();
    const titulaireNettoye = nomTitulaire.trim();

    if (!numeroNettoye) {
      setErreur(
        estBanque
          ? "Le numéro de compte est obligatoire."
          : "Le numéro est obligatoire.",
      );
      return;
    }

    if (!titulaireNettoye) {
      setErreur(
        "Le nom du titulaire est obligatoire.",
      );
      return;
    }

    if (estBanque && !nomBanque.trim()) {
      setErreur(
        "Le nom de la banque est obligatoire.",
      );
      return;
    }

    setEnvoi(true);

    try {
      const donnees = {
        type,
        numero: numeroNettoye,
        nomTitulaire: titulaireNettoye,
        nomBanque: estBanque
          ? nomBanque.trim()
          : undefined,
        operateur: estBanque
          ? undefined
          : operateur.trim() || undefined,
        principal,
      };

      if (estModification) {
        await api.patch<MoyenPaiement>(
          `/moyens-paiement/${moyenInitial.id}`,
          donnees,
        );
      } else {
        await api.post<MoyenPaiement>(
          "/moyens-paiement",
          donnees,
        );
      }

      await onTermine();
    } catch (err) {
      setErreur(
        err instanceof ApiError
          ? err.message
          : estModification
            ? "Impossible de modifier ce moyen de paiement."
            : "Impossible d'ajouter ce moyen de paiement.",
      );
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <NoticeCard>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-xl font-medium">
            {titre}
          </p>

          <p className="mt-1 text-sm text-ink-soft">
            {description}
          </p>
        </div>

        <button
          type="button"
          onClick={onFermer}
          aria-label="Fermer"
          disabled={envoi}
          className="
            rounded-lg p-2
            text-ink-soft
            transition-colors
            hover:bg-paper-light
            hover:text-ink
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          <X size={18} />
        </button>
      </div>

      {erreur && (
        <div
          className="
            mb-5 rounded-lg
            border border-brique/20
            bg-brique/5
            px-4 py-3
          "
        >
          <p className="text-sm text-brique-dark">
            {erreur}
          </p>
        </div>
      )}

      <form
        onSubmit={(e) => void onSubmit(e)}
        className="space-y-5"
      >
        {/* TYPE */}
        <Field
          label="Type de moyen de paiement"
          htmlFor="type-moyen-paiement"
        >
          <Select
            id="type-moyen-paiement"
            value={type}
            onChange={(e) =>
              changerType(
                e.target.value as TypeMoyenPaiement,
              )
            }
            disabled={envoi}
          >
            <option value="MVOLA">MVola</option>
            <option value="ORANGE_MONEY">
              Orange Money
            </option>
            <option value="AIRTEL_MONEY">
              Airtel Money
            </option>
            <option value="BANQUE">
              Compte bancaire
            </option>
          </Select>
        </Field>

        {/* OPERATEUR */}
        {!estBanque && (
          <Field
            label="Opérateur"
            htmlFor="operateur"
            hint="Facultatif. Le type sélectionné permet déjà d'identifier l'opérateur."
          >
            <Input
              id="operateur"
              value={operateur}
              onChange={(e) =>
                setOperateur(e.target.value)
              }
              placeholder={
                type === "MVOLA"
                  ? "MVola"
                  : type === "ORANGE_MONEY"
                    ? "Orange Money"
                    : "Airtel Money"
              }
              disabled={envoi}
            />
          </Field>
        )}

        {/* BANQUE */}
        {estBanque && (
          <Field
            label="Nom de la banque"
            htmlFor="nom-banque"
          >
            <Input
              id="nom-banque"
              value={nomBanque}
              onChange={(e) =>
                setNomBanque(e.target.value)
              }
              placeholder="Ex. BNI Madagascar"
              disabled={envoi}
              required
            />
          </Field>
        )}

        {/* NUMERO */}
        <Field
          label={
            estBanque
              ? "Numéro de compte"
              : "Numéro"
          }
          htmlFor="numero"
        >
          <Input
            id="numero"
            value={numero}
            onChange={(e) =>
              setNumero(e.target.value)
            }
            placeholder={
              estBanque
                ? "Numéro de compte"
                : "0341234567"
            }
            disabled={envoi}
            required
          />
        </Field>

        {/* TITULAIRE */}
        <Field
          label="Nom du titulaire"
          htmlFor="nom-titulaire"
        >
          <Input
            id="nom-titulaire"
            value={nomTitulaire}
            onChange={(e) =>
              setNomTitulaire(e.target.value)
            }
            placeholder="Nom complet du titulaire"
            disabled={envoi}
            required
          />
        </Field>

        {/* PRINCIPAL */}
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={principal}
            onChange={(e) =>
              setPrincipal(e.target.checked)
            }
            disabled={envoi}
            className="
              mt-1 h-4 w-4 rounded
              border-ink-soft/30
              accent-ocre
            "
          />

          <span>
            <span className="block text-sm font-medium text-ink">
              Définir comme moyen principal
            </span>

            <span className="mt-0.5 block text-xs text-ink-soft">
              Ce moyen sera proposé en priorité lors d'un paiement.
            </span>
          </span>
        </label>

        {/* ACTIONS */}
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={onFermer}
            disabled={envoi}
          >
            Annuler
          </Button>

          <Button
            type="submit"
            variant="primary"
            disabled={envoi}
          >
            {envoi
              ? estModification
                ? "Modification…"
                : "Ajout en cours…"
              : estModification
                ? "Enregistrer"
                : "Ajouter le moyen"}
          </Button>
        </div>
      </form>
    </NoticeCard>
  );
}

// ============================================================
// MODALE PRINCIPAL
// ============================================================

function ModalPrincipal({
  moyen,
  onFermer,
  onConfirmer,
}: {
  moyen: MoyenPaiement;
  onFermer: () => void;
  onConfirmer: () => Promise<void>;
}) {
  const [chargement, setChargement] = useState(false);

  async function confirmer() {
    setChargement(true);

    try {
      await onConfirmer();
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4">
      <NoticeCard className="w-full max-w-md">
        <div className="flex items-start gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ocre/10 text-ocre-dark">
            <Star size={20} />
          </span>

          <div>
            <h2 className="font-display text-lg font-medium">
              Définir comme principal ?
            </h2>

            <p className="mt-2 text-sm leading-6 text-ink-soft">
              {typeLabel[moyen.type]} — {moyen.numero}
            </p>

            <p className="mt-2 text-sm leading-6 text-ink-soft">
              Ce moyen sera proposé en priorité lors des paiements.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            onClick={onFermer}
            disabled={chargement}
          >
            Annuler
          </Button>

          <Button
            variant="primary"
            onClick={() => void confirmer()}
            disabled={chargement}
          >
            {chargement ? "Enregistrement…" : "Confirmer"}
          </Button>
        </div>
      </NoticeCard>
    </div>
  );
}

// ============================================================
// MODALE ACTIVATION
// ============================================================

function ModalActivation({
  moyen,
  onFermer,
  onConfirmer,
}: {
  moyen: MoyenPaiement;
  onFermer: () => void;
  onConfirmer: () => Promise<void>;
}) {
  const [chargement, setChargement] = useState(false);

  const activation = !moyen.actif;

  async function confirmer() {
    setChargement(true);

    try {
      await onConfirmer();
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4">
      <NoticeCard className="w-full max-w-md">
        <div className="flex items-start gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ocre/10 text-ocre-dark">
            {activation ? (
              <Play size={20} />
            ) : (
              <Check size={20} />
            )}
          </span>

          <div>
            <h2 className="font-display text-lg font-medium">
              {activation
                ? "Activer ce moyen ?"
                : "Désactiver ce moyen ?"}
            </h2>

            <p className="mt-2 text-sm leading-6 text-ink-soft">
              {typeLabel[moyen.type]} — {moyen.numero}
            </p>

            <p className="mt-2 text-sm leading-6 text-ink-soft">
              {activation
                ? "Ce moyen pourra de nouveau être utilisé pour recevoir des paiements."
                : "Ce moyen ne sera plus proposé pour les nouveaux paiements."}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            onClick={onFermer}
            disabled={chargement}
          >
            Annuler
          </Button>

          <Button
            variant="primary"
            onClick={() => void confirmer()}
            disabled={chargement}
          >
            {chargement
              ? "Enregistrement…"
              : activation
                ? "Activer"
                : "Désactiver"}
          </Button>
        </div>
      </NoticeCard>
    </div>
  );
}

// ============================================================
// MODALE SUPPRESSION
// ============================================================

function ModalSuppression({
  moyen,
  onFermer,
  onConfirmer,
}: {
  moyen: MoyenPaiement;
  onFermer: () => void;
  onConfirmer: () => Promise<void>;
}) {
  const [chargement, setChargement] = useState(false);

  async function confirmer() {
    setChargement(true);

    try {
      await onConfirmer();
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4">
      <NoticeCard className="w-full max-w-md">
        <div>
          <h2 className="font-display text-lg font-medium">
            Supprimer ce moyen de paiement ?
          </h2>

          <p className="mt-3 text-sm leading-6 text-ink-soft">
            Vous êtes sur le point de supprimer :
          </p>

          <div className="mt-3 rounded-lg bg-paper-light px-4 py-3">
            <p className="font-medium text-ink">
              {typeLabel[moyen.type]}
            </p>

            <p className="mt-1 font-mono text-sm text-ink-soft">
              {moyen.numero}
            </p>

            <p className="mt-1 text-sm text-ink-soft">
              {moyen.nomTitulaire}
            </p>
          </div>

          <p className="mt-4 text-sm leading-6 text-ink-soft">
            Si ce moyen a déjà été utilisé pour une transaction,
            il ne pourra pas être supprimé. Vous pourrez alors
            simplement le désactiver.
          </p>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            onClick={onFermer}
            disabled={chargement}
          >
            Annuler
          </Button>

          <Button
            variant="primary"
            onClick={() => void confirmer()}
            disabled={chargement}
          >
            {chargement
              ? "Suppression…"
              : "Supprimer"}
          </Button>
        </div>
      </NoticeCard>
    </div>
  );
}