"use client";

import { useState } from "react";
import {
  Check,
  Loader2,
  Plus,
} from "lucide-react";

import { api, ApiError } from "@/lib/api";
import type { ServiceOffert } from "@/types/services";
import { useTranslations } from "next-intl";
import { useOptionLabels } from "@/i18n/use-option-labels";

import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { MultiSelectCreatable } from "@/components/ui/MultiSelectCreatable";
import { SelecteurImages } from "@/components/ui/SelecteurImages";
import { COMPETENCES_PREDEFINIES } from "@/data/field-options";
import { FormulaireServiceData, FORMULAIRE_INITIAL } from "@/features/services/formulaire-service";

export function FormulaireService({
  initialValues = FORMULAIRE_INITIAL,
  mode,
  serviceId,
  onSuccess,
  onCancel,
}: {
  initialValues?: FormulaireServiceData;
  mode: "creation" | "edition";
  serviceId?: number | string;
  onSuccess: (service: ServiceOffert) => void;
  onCancel?: () => void;
}) {
  const t = useTranslations("dashboardPages.myServices.form");
  const { optionsCategories } = useOptionLabels();
  const [formulaire, setFormulaire] =
    useState<FormulaireServiceData>(initialValues);

  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");

  const modifierChamp = (
    champ: keyof FormulaireServiceData,
    valeur: string | boolean | string[],
  ) => {
    setFormulaire((ancien) => ({
      ...ancien,
      [champ]: valeur,
    }));
  };

  const soumettre = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setErreur("");

    if (!formulaire.titre.trim()) {
      setErreur(t("titleRequired"));
      return;
    }

    if (!formulaire.description.trim()) {
      setErreur(t("descriptionRequired"));
      return;
    }

    if (!formulaire.categorie) {
      setErreur(t("categoryRequired"));
      return;
    }

    if (!formulaire.prix) {
      setErreur(t("priceRequired"));
      return;
    }

    if (!formulaire.delaiJours) {
      setErreur(t("delayRequired"));
      return;
    }

    const prix = Number(formulaire.prix);
    const delai = Number(formulaire.delaiJours);

    if (!Number.isFinite(prix) || prix < 0) {
      setErreur(
        t("priceInvalid"),
      );
      return;
    }

    if (!Number.isInteger(delai) || delai < 1) {
      setErreur(
        t("delayInvalid"),
      );
      return;
    }

    if (mode === "edition" && !serviceId) {
      setErreur(
        t("missingId"),
      );
      return;
    }

    setChargement(true);

    try {
      /*
       * Données communes aux deux opérations.
       *
       * IMPORTANT :
       * `disponible` n'est pas envoyé lors de la création,
       * car CreateServiceDto ne l'autorise pas.
       */
      const donneesCommunes = {
        titre: formulaire.titre.trim(),
        description: formulaire.description.trim(),
        categorie: formulaire.categorie,
        prix,
        delai,
        imagesUrls: formulaire.imagesUrls,
        competences: formulaire.competences
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean),
      };

      let service: ServiceOffert;

      if (mode === "creation") {
        service = await api.post<ServiceOffert>(
          "/services",
          donneesCommunes,
        );
      } else {
        service = await api.patch<ServiceOffert>(
          `/services/${serviceId}`,
          {
            ...donneesCommunes,
            disponible: formulaire.disponible,
          },
        );
      }

      onSuccess(service);
    } catch (error) {
      if (error instanceof ApiError) {
        setErreur(error.message);
      } else {
        setErreur(t("genericError"));
      }
    } finally {
      setChargement(false);
    }
  };

  return (
    <form onSubmit={soumettre} className="space-y-5">
      {erreur && (
        <div className="rounded-xl border border-brique/20 bg-brique/5 px-4 py-3 text-sm text-brique">
          {erreur}
        </div>
      )}

      <Field label={t("titleLabel")} htmlFor="service-titre">
        <Input
          id="service-titre"
          value={formulaire.titre}
          onChange={(event) =>
            modifierChamp("titre", event.target.value)
          }
          placeholder={t("titlePlaceholder")}
          disabled={chargement}
        />
      </Field>

      <Field label={t("descriptionLabel")} htmlFor="service-description">
        <Textarea
          id="service-description"
          value={formulaire.description}
          onChange={(event) =>
            modifierChamp("description", event.target.value)
          }
          placeholder={t("descriptionPlaceholder")}
          rows={5}
          disabled={chargement}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("categoryLabel")} htmlFor="service-categorie">
          <Select
            id="service-categorie"
            value={formulaire.categorie}
            onChange={(event) =>
              modifierChamp("categorie", event.target.value)
            }
            disabled={chargement}
          >
            <option value="" disabled hidden>
              {t("selectCategory")}
            </option>

            {optionsCategories(formulaire.categorie).map((option) => (
              <option key={option.valeur} value={option.valeur}>
                {option.libelle}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={t("priceLabel")} htmlFor="service-prix">
          <Input
            id="service-prix"
            type="number"
            min="0"
            value={formulaire.prix}
            onChange={(event) =>
              modifierChamp("prix", event.target.value)
            }
            placeholder="50000"
            disabled={chargement}
          />
        </Field>

        <Field label={t("delayLabel")} htmlFor="service-delai">
          <Input
            id="service-delai"
            type="number"
            min="1"
            value={formulaire.delaiJours}
            onChange={(event) =>
              modifierChamp(
                "delaiJours",
                event.target.value,
              )
            }
            placeholder="3"
            disabled={chargement}
          />
        </Field>
      </div>

      <Field
        label={t("skillsLabel")}
        htmlFor="service-competences"
        hint={t("skillsHint")}
      >
        <MultiSelectCreatable
          id="service-competences"
          value={formulaire.competences}
          onChange={(value) => modifierChamp("competences", value)}
          options={COMPETENCES_PREDEFINIES}
          placeholder={t("skillsSearch")}
          allowCreate
          disabled={chargement}
        />
      </Field>

      <Field label={t("imagesLabel")} htmlFor="service-images">
        <SelecteurImages
          valeur={formulaire.imagesUrls}
          onChange={(urls) => modifierChamp("imagesUrls", urls)}
          disabled={chargement}
        />
      </Field>

      {mode === "edition" && (
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-ink/10 bg-paper px-4 py-3">
          <input
            type="checkbox"
            checked={formulaire.disponible}
            onChange={(event) =>
              modifierChamp(
                "disponible",
                event.target.checked,
              )
            }
            disabled={chargement}
            className="h-4 w-4 accent-ocre"
          />

          <div>
            <p className="text-sm font-medium text-ink">
              {t("serviceAvailable")}
            </p>

            <p className="text-xs text-ink-soft">
              {t("serviceAvailableHint")}
            </p>
          </div>
        </label>
      )}

      {mode === "creation" && (
        <div className="rounded-xl border border-ink/10 bg-ink/5 px-4 py-3">
          <p className="text-sm font-medium text-ink">
            {t("publicationTitle")}
          </p>

          <p className="mt-1 text-xs leading-5 text-ink-soft">
            {t("publicationHint")}
          </p>
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-3">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={chargement}
          >
            {t("cancel")}
          </Button>
        )}

        <Button
          type="submit"
          className="flex items-center justify-center gap-2"
          disabled={chargement}
        >
          {chargement ? (
            <>
              <Loader2
                size={16}
                className="animate-spin"
              />
              {t("saving")}
            </>
          ) : mode === "creation" ? (
            <>
              <Plus size={16} />
              {t("publishService")}
            </>
          ) : (
            <>
              <Check size={16} />
              {t("save")}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
