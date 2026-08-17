"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { ServiceOffert } from "@/lib/types";
import { formatArgent } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { NoticeCard, Tag } from "@/components/ui/Notice";

export default function MesServicesPage() {
  const [services, setServices] = useState<ServiceOffert[]>([]);
  const [chargement, setChargement] = useState(true);
  const [afficherFormulaire, setAfficherFormulaire] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const data = await api.get<ServiceOffert[]>("/services/me/mes-services");
      setServices(data);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  async function basculerDisponibilite(service: ServiceOffert) {
    await api.patch(`/services/${service.id}`, {
      disponible: !service.disponible,
    });
    charger();
  }

  async function supprimer(service: ServiceOffert) {
    if (!confirm(`Supprimer « ${service.titre} » ?`)) return;
    await api.delete(`/services/${service.id}`);
    charger();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl font-semibold">Mes services</h1>
        <Button
          variant="secondary"
          onClick={() => setAfficherFormulaire((v) => !v)}
        >
          {afficherFormulaire ? "Fermer" : "+ Publier un service"}
        </Button>
      </div>

      {afficherFormulaire && (
        <div className="mb-8">
          <FormulaireService
            onCree={() => {
              setAfficherFormulaire(false);
              charger();
            }}
          />
        </div>
      )}

      {chargement ? (
        <p className="text-sm text-ink-soft">Chargement…</p>
      ) : services.length === 0 ? (
        <p className="text-sm text-ink-soft">
          Vous n&apos;avez pas encore publié de service.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {services.map((service) => (
            <NoticeCard key={service.id}>
              <div className="flex items-start justify-between gap-3">
                <Tag tone={service.disponible ? "rice" : "ink"}>
                  {service.disponible ? "Disponible" : "Masqué"}
                </Tag>
                <span className="font-mono text-sm text-ocre-dark">
                  {formatArgent(service.prix)}
                </span>
              </div>
              <p className="mt-3 font-display text-lg font-medium">
                {service.titre}
              </p>
              <p className="mt-2 text-sm text-ink-soft line-clamp-2">
                {service.description}
              </p>
              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => basculerDisponibilite(service)}
                >
                  {service.disponible ? "Masquer" : "Republier"}
                </Button>
                <Button size="sm" variant="danger" onClick={() => supprimer(service)}>
                  Supprimer
                </Button>
              </div>
            </NoticeCard>
          ))}
        </div>
      )}
    </div>
  );
}

function FormulaireService({ onCree }: { onCree: () => void }) {
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [categorie, setCategorie] = useState("");
  const [prix, setPrix] = useState("");
  const [delai, setDelai] = useState("");
  const [competences, setCompetences] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      await api.post("/services", {
        titre,
        description,
        categorie,
        prix: Number(prix),
        delai: Number(delai),
        competences: competences
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean),
      });
      onCree();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : "Erreur inattendue");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <NoticeCard>
      <h2 className="font-display text-xl font-semibold mb-4">
        Nouveau service
      </h2>
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <Field label="Titre" htmlFor="titre">
          <Input
            id="titre"
            required
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            placeholder="Création d'une maquette Figma"
          />
        </Field>
        <Field label="Description" htmlFor="description">
          <Textarea
            id="description"
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Catégorie" htmlFor="categorie">
            <Input
              id="categorie"
              required
              value={categorie}
              onChange={(e) => setCategorie(e.target.value)}
              placeholder="Design"
            />
          </Field>
          <Field label="Prix (Ar)" htmlFor="prix">
            <Input
              id="prix"
              type="number"
              min={0}
              required
              value={prix}
              onChange={(e) => setPrix(e.target.value)}
            />
          </Field>
          <Field label="Délai (jours)" htmlFor="delai">
            <Input
              id="delai"
              type="number"
              min={1}
              required
              value={delai}
              onChange={(e) => setDelai(e.target.value)}
            />
          </Field>
        </div>
        <Field
          label="Compétences"
          htmlFor="competences"
          hint="Séparées par des virgules"
        >
          <Input
            id="competences"
            value={competences}
            onChange={(e) => setCompetences(e.target.value)}
            placeholder="Figma, UI/UX"
          />
        </Field>

        {erreur && <p className="text-sm text-brique">{erreur}</p>}

        <Button type="submit" disabled={envoi} className="self-start">
          {envoi ? "Publication…" : "Publier"}
        </Button>
      </form>
    </NoticeCard>
  );
}
