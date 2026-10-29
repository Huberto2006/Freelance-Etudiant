"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";

import { api, ApiError } from "@/lib/api";
import type { Mission } from "@/types/missions";
import { CATEGORIE_AUTRE } from "@/lib/categories";
import { useTranslations } from "next-intl";
import { useOptionLabels } from "@/i18n/use-option-labels";

import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { MultiSelectCreatable } from "@/components/ui/MultiSelectCreatable";
import { NoticeCard } from "@/components/ui/Notice";
import { SelecteurImage } from "@/components/ui/SelecteurImage";
import { COMPETENCES_PREDEFINIES } from "@/data/field-options";

/* =========================================================
   FORMULAIRE DE CRÉATION D'UNE MISSION
   ========================================================= */

export function FormulaireMission({
  missionExistante,
  onCree,
  onAnnuler,
}: {
  missionExistante?: Mission;
  onCree: () => void | Promise<void>;
  onAnnuler?: () => void;
}) {
  const t = useTranslations("dashboardPages.myMissions.form");
  const { optionsCategories } = useOptionLabels();
  const enEdition = Boolean(missionExistante);

  const [titre, setTitre] = useState(missionExistante?.titre ?? "");
  const [description, setDescription] = useState(missionExistante?.description ?? "");
  const categorieInitiale = missionExistante?.categorie ?? "";
  // optionsCategories(categorieInitiale) ajoute la categorie existante a la
  // liste si elle n'est pas dans le referentiel : elle reste donc toujours
  // selectionnable telle quelle (pas de bascule forcee vers "Autre").
  const [categorie, setCategorie] = useState(categorieInitiale);
  const [categoriePersonnalisee, setCategoriePersonnalisee] = useState("");
  const [budget, setBudget] = useState(
    missionExistante ? String(missionExistante.budget) : "",
  );
  // Date limite d'origine (pour ne l'envoyer au backend que si elle change :
  // une mission dont l'echeance approche ou est passee doit rester
  // modifiable pour tout le reste — voir MissionsService.update).
  const dateLimiteInitiale = missionExistante
    ? missionExistante.dateLimite.slice(0, 10)
    : "";
  const [dateLimite, setDateLimite] = useState(dateLimiteInitiale);
  const [competencesRequises, setCompetencesRequises] = useState(
    missionExistante?.competencesRequises.join(", ") ?? "",
  );
  const [imageUrl, setImageUrl] = useState<string | null>(
    missionExistante?.imageUrl ?? null,
  );
  const [imageModifiee, setImageModifiee] = useState(false);

  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setErreur(null);
    setEnvoi(true);

    try {
      const categorieFinale =
        categorie === CATEGORIE_AUTRE
          ? categoriePersonnalisee.trim()
          : categorie;

      const payload = {
        titre: titre.trim(),
        description: description.trim(),
        categorie: categorieFinale,
        budget: Number(budget),
        // N'envoie la date limite que si elle a change : elle reste
        // sinon simplement absente du PATCH, et la mission garde son
        // echeance meme si elle est proche ou passee.
        ...(dateLimite !== dateLimiteInitiale ? { dateLimite } : {}),
        // On n'envoie imageUrl que si elle a réellement été modifiée :
        // le PATCH backend ne modifie que les champs présents dans le
        // payload, donc omettre ce champ conserve l'image actuelle.
        // On envoie explicitement `null` (et non `undefined`, qui serait
        // supprimé par JSON.stringify) pour permettre de retirer l'image.
        ...(imageModifiee ? { imageUrl } : {}),

        competencesRequises: competencesRequises
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean),
      };

      if (enEdition && missionExistante) {
        await api.patch(`/missions/${missionExistante.id}`, payload);
      } else {
        await api.post("/missions", payload);
      }

      await onCree();
    } catch (err) {
      console.error("Erreur lors de la création de la mission :", err);

      setErreur(err instanceof ApiError ? err.message : t("unexpectedError"));
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <NoticeCard>
      <h2 className="font-display text-xl font-semibold">
        {enEdition ? t("editTitle") : t("newTitle")}
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        {enEdition
          ? t("editHint")
          : t("newHint")}
      </p>

      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-5">
        {/* — 01 · VISUEL */}

        <p className="font-mono text-[0.6875rem] uppercase tracking-[0.15em] text-ink-soft/70">
          {t("sectionVisual")}
        </p>

        <div className="grid items-start gap-4 sm:grid-cols-[auto,1fr]">
          <Field label={t("mainImage")} htmlFor="imageMission">
            <SelecteurImage
              valeur={imageUrl}
              onChange={(url) => {
                setImageUrl(url);
                setImageModifiee(true);
              }}
              disabled={envoi}
            />
          </Field>

          <ul className="grid gap-2 self-center text-xs text-ink-soft/80">
            <li className="flex items-start gap-2">
              <Check
                size={12}
                className="mt-0.5 shrink-0 text-rice"
                aria-hidden="true"
              />
              {t("tipImageOptional")}
            </li>
            <li className="flex items-start gap-2">
              <Check
                size={12}
                className="mt-0.5 shrink-0 text-rice"
                aria-hidden="true"
              />
              {t("tipImageBright")}
            </li>
            <li className="flex items-start gap-2">
              <Check
                size={12}
                className="mt-0.5 shrink-0 text-rice"
                aria-hidden="true"
              />
              {t("tipRealistic")}
            </li>
          </ul>
        </div>

        {/* — 02 · CONTENU */}

        <p className="mt-2 border-t border-ink/10 pt-5 font-mono text-[0.6875rem] uppercase tracking-[0.15em] text-ink-soft/70">
          {t("sectionContent")}
        </p>

        {/* Titre */}

        <Field label={t("titleLabel")} htmlFor="titre">
          <Input
            id="titre"
            required
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            placeholder={t("titlePlaceholder")}
            disabled={envoi}
          />
        </Field>

        {/* Description */}

        <Field label={t("descriptionLabel")} htmlFor="description">
          <Textarea
            id="description"
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("descriptionPlaceholder")}
            disabled={envoi}
          />
        </Field>

        {/* — 03 · PARAMÈTRES */}

        <p className="mt-2 border-t border-ink/10 pt-5 font-mono text-[0.6875rem] uppercase tracking-[0.15em] text-ink-soft/70">
          {t("sectionSettings")}
        </p>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field label={t("categoryLabel")} htmlFor="categorie">
            <Select
              id="categorie"
              required
              value={categorie}
              onChange={(e) => setCategorie(e.target.value)}
              disabled={envoi}
            >
              <option value="" disabled hidden>{t("selectCategory")}</option>
              {optionsCategories(categorieInitiale).map((option) => (
                <option key={option.valeur} value={option.valeur}>
                  {option.libelle}
                </option>
              ))}
            </Select>
            {categorie === CATEGORIE_AUTRE && (
              <Input
                className="mt-2"
                value={categoriePersonnalisee}
                onChange={(e) => setCategoriePersonnalisee(e.target.value)}
                placeholder={t("customCategory")}
                required
                disabled={envoi}
              />
            )}
          </Field>

          <Field label={t("budgetLabel")} htmlFor="budget">
            <Input
              id="budget"
              type="number"
              min={0}
              required
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              disabled={envoi}
            />
          </Field>

          <Field label={t("deadlineLabel")} htmlFor="dateLimite">
            <Input
              id="dateLimite"
              type="date"
              required
              value={dateLimite}
              onChange={(e) => setDateLimite(e.target.value)}
              disabled={envoi}
            />
          </Field>
        </div>

        {/* — 04 · COMPÉTENCES */}

        <p className="mt-2 border-t border-ink/10 pt-5 font-mono text-[0.6875rem] uppercase tracking-[0.15em] text-ink-soft/70">
          {t("sectionSkills")}
        </p>

        <Field
          label={t("requiredSkills")}
          htmlFor="competencesRequises"
          hint={t("skillsHint")}
        >
          <MultiSelectCreatable
            id="competencesRequises"
            value={competencesRequises}
            onChange={setCompetencesRequises}
            options={COMPETENCES_PREDEFINIES}
            placeholder={t("skillsSearch")}
            allowCreate
            disabled={envoi}
          />
        </Field>

        {/* Erreur */}

        {erreur && <p className="text-sm text-brique">{erreur}</p>}

        {/* — ACTIONS */}

        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-ink/10 pt-5">
          <p className="mr-auto text-xs text-ink-soft/60">
            {t("optionalNote")}
          </p>

          {enEdition && onAnnuler && (
            <Button
              type="button"
              variant="ghost"
              disabled={envoi}
              onClick={onAnnuler}
            >
              {t("cancel")}
            </Button>
          )}

          <Button
            type="submit"
            variant="secondary"
            disabled={envoi}
            className="gap-2"
          >
            {envoi && (
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            )}
            {envoi
              ? enEdition
                ? t("saving")
                : t("publishing")
              : enEdition
                ? t("saveChanges")
                : t("publishMission")}
          </Button>
        </div>
      </form>
    </NoticeCard>
  );
}
