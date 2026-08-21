"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Wrench, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { ServiceOffert } from "@/lib/types";
import { formatArgent } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { NoticeCard, Tag } from "@/components/ui/Notice";

export default function MesServicesPage() {
  const [services, setServices] = useState<ServiceOffert[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [afficherFormulaire, setAfficherFormulaire] =
    useState(false);
  const [actionEnCours, setActionEnCours] = useState<string | null>(
    null,
  );

  /**
   * Recharge la liste des services.
   * Utilisé après une création, modification ou suppression.
   */
  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);

    try {
      const data = await api.get<ServiceOffert[]>(
        "/services/me/mes-services",
      );

      setServices(data);
    } catch (error) {
      console.error(
        "Erreur lors du chargement des services :",
        error,
      );

      setErreur(
        error instanceof ApiError
          ? error.message
          : "Impossible de charger vos services.",
      );
    } finally {
      setChargement(false);
    }
  }, []);

  /**
   * Chargement initial.
   *
   * On ne fait pas charger() ici car charger()
   * contient setChargement(true).
   */
  useEffect(() => {
    let cancelled = false;

    const chargerInitial = async () => {
      try {
        const data = await api.get<ServiceOffert[]>(
          "/services/me/mes-services",
        );

        if (!cancelled) {
          setServices(data);
          setErreur(null);
        }
      } catch (error) {
        console.error(
          "Erreur lors du chargement initial :",
          error,
        );

        if (!cancelled) {
          setErreur(
            error instanceof ApiError
              ? error.message
              : "Impossible de charger vos services.",
          );
        }
      } finally {
        if (!cancelled) {
          setChargement(false);
        }
      }
    };

    chargerInitial();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Masquer / Republier un service.
   */
  async function basculerDisponibilite(
    service: ServiceOffert,
  ) {
    setActionEnCours(service.id);
    setErreur(null);

    try {
      await api.patch(`/services/${service.id}`, {
        disponible: !service.disponible,
      });

      await charger();
    } catch (error) {
      console.error(
        "Erreur lors de la modification de la disponibilité :",
        error,
      );

      setErreur(
        error instanceof ApiError
          ? error.message
          : "Impossible de modifier la disponibilité du service.",
      );
    } finally {
      setActionEnCours(null);
    }
  }

  /**
   * Supprimer un service.
   */
  async function supprimer(service: ServiceOffert) {
    if (
      !window.confirm(
        `Supprimer « ${service.titre} » ?`,
      )
    ) {
      return;
    }

    setActionEnCours(service.id);
    setErreur(null);

    try {
      await api.delete(`/services/${service.id}`);

      await charger();
    } catch (error) {
      console.error(
        "Erreur lors de la suppression :",
        error,
      );

      setErreur(
        error instanceof ApiError
          ? error.message
          : "Impossible de supprimer ce service.",
      );
    } finally {
      setActionEnCours(null);
    }
  }

  return (
    <div>
      {/* En-tête */}
      <div className="flex items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ocre/10 text-ocre-dark"
            aria-hidden="true"
          >
            <Wrench size={20} />
          </span>
          <h1 className="font-display text-3xl font-semibold">
            Mes services
          </h1>
        </div>

        <Button
          variant="secondary"
          className="gap-2"
          onClick={() =>
            setAfficherFormulaire((v) => !v)
          }
        >
          {afficherFormulaire ? (
            <>
              <X size={16} />
              Fermer
            </>
          ) : (
            <>
              <Plus size={16} />
              Publier un service
            </>
          )}
        </Button>
      </div>

      {/* Message d'erreur */}
      {erreur && (
        <NoticeCard className="mb-6">
          <p className="text-sm text-brique">
            {erreur}
          </p>
        </NoticeCard>
      )}

      {/* Formulaire */}
      {afficherFormulaire && (
        <div className="mb-8">
          <FormulaireService
            onCree={async () => {
              setAfficherFormulaire(false);
              await charger();
            }}
          />
        </div>
      )}

      {/* Chargement */}
      {chargement ? (
        <p className="text-sm text-ink-soft">
          Chargement…
        </p>
      ) : services.length === 0 ? (
        <NoticeCard>
          <p className="text-sm text-ink-soft">
            Vous n&apos;avez pas encore publié de service.
          </p>
        </NoticeCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {services.map((service) => {
            const action =
              actionEnCours === service.id;

            return (
              <NoticeCard key={service.id}>
                {/* Statut + prix */}
                <div className="flex items-start justify-between gap-3">
                  <Tag
                    tone={
                      service.disponible
                        ? "rice"
                        : "ink"
                    }
                  >
                    {service.disponible
                      ? "Disponible"
                      : "Masqué"}
                  </Tag>

                  <span className="font-mono text-sm text-ocre-dark">
                    {formatArgent(service.prix)}
                  </span>
                </div>

                {/* Titre */}
                <p className="mt-3 font-display text-lg font-medium">
                  {service.titre}
                </p>

                {/* Description */}
                <p className="mt-2 text-sm text-ink-soft line-clamp-2">
                  {service.description}
                </p>

                {/* Catégorie / délai */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Tag tone="ink">
                    {service.categorie}
                  </Tag>

                  <span className="text-xs text-ink-soft">
                    livré en {service.delai} jour
                    {service.delai > 1 ? "s" : ""}
                  </span>
                </div>

                {/* Actions */}
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={action}
                    onClick={() =>
                      basculerDisponibilite(service)
                    }
                  >
                    {action
                      ? "..."
                      : service.disponible
                        ? "Masquer"
                        : "Republier"}
                  </Button>

                  <Button
                    size="sm"
                    variant="danger"
                    disabled={action}
                    onClick={() =>
                      supprimer(service)
                    }
                  >
                    {action
                      ? "..."
                      : "Supprimer"}
                  </Button>
                </div>
              </NoticeCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   FORMULAIRE DE CREATION D'UN SERVICE
   ========================================================= */

function FormulaireService({
  onCree,
}: {
  onCree: () => void | Promise<void>;
}) {
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [categorie, setCategorie] = useState("");
  const [prix, setPrix] = useState("");
  const [delai, setDelai] = useState("");
  const [competences, setCompetences] = useState("");

  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(
    null,
  );

  async function onSubmit(
    e: React.FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();

    setErreur(null);
    setEnvoi(true);

    try {
      await api.post("/services", {
        titre: titre.trim(),
        description: description.trim(),
        categorie: categorie.trim(),
        prix: Number(prix),
        delai: Number(delai),

        competences: competences
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean),
      });

      await onCree();
    } catch (err) {
      console.error(
        "Erreur lors de la création du service :",
        err,
      );

      setErreur(
        err instanceof ApiError
          ? err.message
          : "Erreur inattendue.",
      );
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <NoticeCard>
      <h2 className="font-display text-xl font-semibold mb-4">
        Nouveau service
      </h2>

      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-5"
      >
        {/* Titre */}
        <Field
          label="Titre"
          htmlFor="service-titre"
        >
          <Input
            id="service-titre"
            required
            value={titre}
            onChange={(e) =>
              setTitre(e.target.value)
            }
            placeholder="Création d'une maquette Figma"
            disabled={envoi}
          />
        </Field>

        {/* Description */}
        <Field
          label="Description"
          htmlFor="service-description"
        >
          <Textarea
            id="service-description"
            required
            rows={4}
            value={description}
            onChange={(e) =>
              setDescription(e.target.value)
            }
            disabled={envoi}
          />
        </Field>

        {/* Catégorie / prix / délai */}
        <div className="grid gap-5 sm:grid-cols-3">
          <Field
            label="Catégorie"
            htmlFor="service-categorie"
          >
            <Input
              id="service-categorie"
              required
              value={categorie}
              onChange={(e) =>
                setCategorie(e.target.value)
              }
              placeholder="Design"
              disabled={envoi}
            />
          </Field>

          <Field
            label="Prix (Ar)"
            htmlFor="service-prix"
          >
            <Input
              id="service-prix"
              type="number"
              min={0}
              required
              value={prix}
              onChange={(e) =>
                setPrix(e.target.value)
              }
              disabled={envoi}
            />
          </Field>

          <Field
            label="Délai (jours)"
            htmlFor="service-delai"
          >
            <Input
              id="service-delai"
              type="number"
              min={1}
              required
              value={delai}
              onChange={(e) =>
                setDelai(e.target.value)
              }
              disabled={envoi}
            />
          </Field>
        </div>

        {/* Compétences */}
        <Field
          label="Compétences"
          htmlFor="service-competences"
          hint="Séparées par des virgules"
        >
          <Input
            id="service-competences"
            value={competences}
            onChange={(e) =>
              setCompetences(e.target.value)
            }
            placeholder="Figma, UI/UX"
            disabled={envoi}
          />
        </Field>

        {/* Erreur */}
        {erreur && (
          <p className="text-sm text-brique">
            {erreur}
          </p>
        )}

        {/* Bouton */}
        <Button
          type="submit"
          disabled={envoi}
          className="self-start"
        >
          {envoi
            ? "Publication…"
            : "Publier"}
        </Button>
      </form>
    </NoticeCard>
  );
}