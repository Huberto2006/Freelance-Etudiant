"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  X,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";

import { Button } from "@/components/ui/Button";
import {
  Field,
  Input,
  Select,
} from "@/components/ui/Field";

import {
  NoticeCard,
} from "@/components/ui/Notice";
import { TypeMoyenPaiement, MoyenPaiement } from "@/features/moyens-paiement/moyens-paiement.types";

// ============================================================
// FORMULAIRE COMMUN
// ============================================================

export function FormulaireMoyen({
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
  const t = useTranslations("settings.studentMethods");
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
          ? t("errAccountRequired")
          : t("errNumberRequired"),
      );
      return;
    }

    if (!titulaireNettoye) {
      setErreur(t("errHolderRequired"));
      return;
    }

    if (estBanque && !nomBanque.trim()) {
      setErreur(t("errBankRequired"));
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
            ? t("errEdit")
            : t("errAdd"),
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
          aria-label={t("close")}
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
          label={t("methodType")}
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
              {t("bankAccount")}
            </option>
          </Select>
        </Field>

        {/* OPERATEUR */}
        {!estBanque && (
          <Field
            label={t("operator")}
            htmlFor="operateur"
            hint={t("operatorHint")}
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
            label={t("bankName")}
            htmlFor="nom-banque"
          >
            <Input
              id="nom-banque"
              value={nomBanque}
              onChange={(e) =>
                setNomBanque(e.target.value)
              }
              placeholder={t("bankPlaceholder")}
              disabled={envoi}
              required
            />
          </Field>
        )}

        {/* NUMERO */}
        <Field
          label={
            estBanque
              ? t("accountNumber")
              : t("number")
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
                ? t("accountNumber")
                : "0341234567"
            }
            disabled={envoi}
            required
          />
        </Field>

        {/* TITULAIRE */}
        <Field
          label={t("holderName")}
          htmlFor="nom-titulaire"
        >
          <Input
            id="nom-titulaire"
            value={nomTitulaire}
            onChange={(e) =>
              setNomTitulaire(e.target.value)
            }
            placeholder={t("holderPlaceholder")}
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
              {t("setAsPrimaryMethod")}
            </span>

            <span className="mt-0.5 block text-xs text-ink-soft">
              {t("primaryHint")}
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
            {t("cancel")}
          </Button>

          <Button
            type="submit"
            variant="primary"
            disabled={envoi}
          >
            {envoi
              ? estModification
                ? t("editing")
                : t("adding")
              : estModification
                ? t("save")
                : t("addTheMethod")}
          </Button>
        </div>
      </form>
    </NoticeCard>
  );
}
