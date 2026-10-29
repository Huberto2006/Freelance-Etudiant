"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Plus,
  Wallet,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";

import { Button } from "@/components/ui/Button";

import {
  NoticeCard,
  PageHeader,
} from "@/components/ui/Notice";
import { MoyenPaiement, ActionMoyen } from "@/features/moyens-paiement/moyens-paiement.types";
import { FormulaireAjoutMoyen } from "@/features/moyens-paiement/components/FormulaireAjoutMoyen";
import { ModalModifierMoyen } from "@/features/moyens-paiement/components/ModalModifierMoyen";
import { CarteMoyenPaiement } from "@/features/moyens-paiement/components/CarteMoyenPaiement";
import { ModalPrincipal } from "@/features/moyens-paiement/components/ModalPrincipal";
import { ModalActivation } from "@/features/moyens-paiement/components/ModalActivation";
import { ModalSuppression } from "@/features/moyens-paiement/components/ModalSuppression";

// ============================================================
// PAGE PRINCIPALE
// ============================================================

export default function MoyensPaiementPage() {
  const t = useTranslations("settings.studentMethods");
  const { utilisateur } = useAuth();

  const [moyens, setMoyens] = useState<MoyenPaiement[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const [ajoutOuvert, setAjoutOuvert] = useState(false);

  const [moyenSelectionne, setMoyenSelectionne] =
    useState<MoyenPaiement | null>(null);

  const [action, setAction] = useState<ActionMoyen>(null);

  const obtenirMoyens = useCallback(
    () => api.get<MoyenPaiement[]>("/moyens-paiement"),
    [],
  );

  async function rechargerMoyens() {
    setChargement(true);
    setErreur(null);
    try {
      setMoyens(await obtenirMoyens());
    } catch (err) {
      setErreur(
        err instanceof ApiError
          ? err.message
          : t("errLoad"),
      );
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    if (utilisateur?.role !== "etudiant") return;

    let cancelled = false;
    obtenirMoyens()
      .then((resultat) => {
        if (!cancelled) setMoyens(resultat);
      })
      .catch((err) => {
        if (!cancelled) {
          setErreur(
            err instanceof ApiError
              ? err.message
              : t("errLoad"),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setChargement(false);
      });

    return () => {
      cancelled = true;
    };
  }, [utilisateur?.role, obtenirMoyens, t]);

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
          eyebrow={t("eyebrow")}
          title={t("titleGeneric")}
        />

        <NoticeCard>
          <p className="text-sm text-ink-soft">
            {t("studentsOnly")}
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
            {t("privacy")}
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

      {/* ======================================================
          FORMULAIRE AJOUT
          ====================================================== */}

      {ajoutOuvert && (
        <FormulaireAjoutMoyen
          onFermer={() => setAjoutOuvert(false)}
          onAjoute={async () => {
            setAjoutOuvert(false);
            await rechargerMoyens();
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
            {t("loading")}
          </p>
        </NoticeCard>
      ) : moyens.length === 0 ? (
        <NoticeCard>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <span
              className="
                flex h-12 w-12 items-center justify-center
                rounded-full bg-ocre/10 text-ocre-dark
              "
            >
              <Wallet size={22} />
            </span>

            <h2 className="mt-4 font-display text-lg font-medium">
              {t("emptyTitle")}
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-ink-soft">
              {t("emptyDescription")}
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
              {t("addFirst")}
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
            await rechargerMoyens();
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
              await rechargerMoyens();
            } catch (err) {
              setErreur(
                err instanceof ApiError
                  ? err.message
                  : t("errPrimary"),
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
              await rechargerMoyens();
            } catch (err) {
              setErreur(
                err instanceof ApiError
                  ? err.message
                  : t("errToggle"),
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
              await rechargerMoyens();
            } catch (err) {
              setErreur(
                err instanceof ApiError
                  ? err.message
                  : t("errDelete"),
              );
            }
          }}
        />
      )}
    </div>
  );
}
