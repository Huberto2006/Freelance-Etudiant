"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  Check,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Wrench,
  X,
} from "lucide-react";

import { api, ApiError, getFileUrl } from "@/lib/api";
import type { ServiceOffert } from "@/lib/types";
import { formatArgent } from "@/lib/format";
import { iconePourCategorie } from "@/lib/categories";

import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import {
  NoticeCard,
  PageHeader,
  StatCard,
  Tag,
} from "@/components/ui/Notice";
import { SelecteurImage } from "@/components/ui/SelecteurImage";
import { SousNavigation } from "@/components/ui/SousNavigation";

type OngletServices = "actifs" | "archives";

type ServiceOffertAvecDelai = ServiceOffert & {
  delaiJours?: number;
};

type FormulaireServiceData = {
  titre: string;
  description: string;
  categorie: string;
  prix: string;
  delaiJours: string;
  disponible: boolean;
  imageUrl: string;
};

const FORMULAIRE_INITIAL: FormulaireServiceData = {
  titre: "",
  description: "",
  categorie: "",
  prix: "",
  delaiJours: "",
  disponible: true,
  imageUrl: "",
};

function FormulaireService({
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
  const [formulaire, setFormulaire] =
    useState<FormulaireServiceData>(initialValues);

  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    setFormulaire(initialValues);
  }, [initialValues]);

  const modifierChamp = (
    champ: keyof FormulaireServiceData,
    valeur: string | boolean,
  ) => {
    setFormulaire((ancien) => ({
      ...ancien,
      [champ]: valeur,
    }));
  };

  const soumettre = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setErreur("");

    if (!formulaire.titre.trim()) {
      setErreur("Le titre est obligatoire.");
      return;
    }

    if (!formulaire.description.trim()) {
      setErreur("La description est obligatoire.");
      return;
    }

    if (!formulaire.categorie) {
      setErreur("La catégorie est obligatoire.");
      return;
    }

    if (!formulaire.prix) {
      setErreur("Le prix est obligatoire.");
      return;
    }

    if (!formulaire.delaiJours) {
      setErreur("Le délai est obligatoire.");
      return;
    }

    setChargement(true);

    try {
      const payload = {
        titre: formulaire.titre.trim(),
        description: formulaire.description.trim(),
        categorie: formulaire.categorie,
        prix: Number(formulaire.prix),
        delai: Number(formulaire.delaiJours),
        disponible: formulaire.disponible,
        imagesUrls: formulaire.imageUrl ? [formulaire.imageUrl] : [],
      };

      const service =
        mode === "creation"
          ? await api.post<ServiceOffert>("/services", payload)
          : await api.patch<ServiceOffert>(
              `/services/${serviceId}`,
              payload,
            );

      onSuccess(service);
    } catch (error) {
      if (error instanceof ApiError) {
        setErreur(error.message);
      } else {
        setErreur("Une erreur est survenue.");
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

      <Field label="Titre" htmlFor="service-titre">
        <Input
          id="service-titre"
          value={formulaire.titre}
          onChange={(event) =>
            modifierChamp("titre", event.target.value)
          }
          placeholder="Ex. Création d'un logo professionnel"
          disabled={chargement}
        />
      </Field>

      <Field label="Description" htmlFor="service-description">
        <Textarea
          id="service-description"
          value={formulaire.description}
          onChange={(event) =>
            modifierChamp("description", event.target.value)
          }
          placeholder="Décrivez votre service..."
          rows={5}
          disabled={chargement}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Catégorie" htmlFor="service-categorie">
          <Select
            id="service-categorie"
            value={formulaire.categorie}
            onChange={(event) =>
              modifierChamp("categorie", event.target.value)
            }
            disabled={chargement}
          >
            <option value="">Sélectionner une catégorie</option>
            <option value="Design">Design</option>
            <option value="Développement">Développement</option>
            <option value="Rédaction">Rédaction</option>
            <option value="Traduction">Traduction</option>
            <option value="Marketing">Marketing</option>
            <option value="Multimédia">Multimédia</option>
            <option value="Autre">Autre</option>
          </Select>
        </Field>

        <Field label="Prix (Ar)" htmlFor="service-prix">
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

        <Field label="Délai (jours)" htmlFor="service-delai">
          <Input
            id="service-delai"
            type="number"
            min="1"
            value={formulaire.delaiJours}
            onChange={(event) =>
              modifierChamp("delaiJours", event.target.value)
            }
            placeholder="3"
            disabled={chargement}
          />
        </Field>
      </div>

      <Field label="Image" htmlFor="service-image">
        <SelecteurImage
          valeur={formulaire.imageUrl}
          onChange={(value) => modifierChamp("imageUrl", value ?? "")}
        />
      </Field>

      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-ink/10 bg-paper px-4 py-3">
        <input
          type="checkbox"
          checked={formulaire.disponible}
          onChange={(event) =>
            modifierChamp("disponible", event.target.checked)
          }
          disabled={chargement}
          className="h-4 w-4"
        />

        <div>
          <p className="text-sm font-medium text-ink">
            Service disponible
          </p>
          <p className="text-xs text-ink-soft">
            Les clients pourront voir et commander ce service.
          </p>
        </div>
      </label>

      <div className="flex flex-wrap justify-end gap-3">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={chargement}
          >
            Annuler
          </Button>
        )}

        <Button 
          type="submit"
          className="flex items-center justify-center gap-2" 
          disabled={chargement}
        >
          {chargement ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Enregistrement...
            </>
          ) : mode === "creation" ? (
            <>
              <Plus size={16} />
              Publier le service
            </>
          ) : (
            <>
              <Check size={16} />
              Enregistrer
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export default function MesServicesPage() {
  const [services, setServices] = useState<ServiceOffert[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  const [ongletServices, setOngletServices] =
    useState<OngletServices>("actifs");

  const [recherche, setRecherche] = useState("");
  const [filtreCategorie, setFiltreCategorie] = useState("");

  const [serviceEnEdition, setServiceEnEdition] =
    useState<ServiceOffert | null>(null);

  const [afficherCreation, setAfficherCreation] = useState(false);

  const chargerServices = useCallback(async () => {
    setChargement(true);
    setErreur("");

    try {
      const resultat = await api.get<ServiceOffert[]>(
        "/services/me/mes-services",
      );

      setServices(resultat);
    } catch (error) {
      if (error instanceof ApiError) {
        setErreur(error.message);
      } else {
        setErreur("Impossible de charger vos services.");
      }
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    chargerServices();
  }, [chargerServices]);

  const categoriesDisponibles = Array.from(
    new Set(
      services
        .map((service) => service.categorie)
        .filter(Boolean),
    ),
  ).sort();

  const servicesFiltres = services.filter((service) => {
    const texte =
      `${service.titre} ${service.categorie}`.toLowerCase();

    const correspondRecherche =
      !recherche.trim() ||
      texte.includes(recherche.trim().toLowerCase());

    const correspondCategorie =
      !filtreCategorie ||
      service.categorie === filtreCategorie;

    return correspondRecherche && correspondCategorie;
  });

  const servicesAffiches = servicesFiltres.filter((service) =>
    ongletServices === "archives"
      ? service.estArchive
      : !service.estArchive,
  );

  const total = services.length;

  const actifs = services.filter(
    (service) => !service.estArchive,
  ).length;

  const archives = services.filter(
    (service) => service.estArchive,
  ).length;

  const masques = services.filter(
    (service) => !service.estArchive && !service.disponible,
  ).length;

  const changerDisponibilite = async (
    service: ServiceOffert,
  ) => {
    try {
      const serviceMisAJour = await api.patch<ServiceOffert>(
        `/services/${service.id}`,
        {
          disponible: !service.disponible,
        },
      );

      setServices((anciens) =>
        anciens.map((item) =>
          item.id === service.id ? serviceMisAJour : item,
        ),
      );
    } catch (error) {
      setErreur(
        error instanceof ApiError
          ? error.message
          : "Impossible de modifier la disponibilité.",
      );
    }
  };

  const archiver = async (service: ServiceOffert) => {
    try {
      const serviceMisAJour = await api.patch<ServiceOffert>(
        `/services/${service.id}/archiver`,
        {},
      );

      setServices((anciens) =>
        anciens.map((item) =>
          item.id === service.id ? serviceMisAJour : item,
        ),
      );
    } catch (error) {
      setErreur(
        error instanceof ApiError
          ? error.message
          : "Impossible d'archiver le service.",
      );
    }
  };

  const restaurer = async (service: ServiceOffert) => {
    try {
      const serviceMisAJour = await api.patch<ServiceOffert>(
        `/services/${service.id}/restaurer`,
        {},
      );

      setServices((anciens) =>
        anciens.map((item) =>
          item.id === service.id ? serviceMisAJour : item,
        ),
      );
    } catch (error) {
      setErreur(
        error instanceof ApiError
          ? error.message
          : "Impossible de restaurer le service.",
      );
    }
  };

  const supprimer = async (service: ServiceOffert) => {
    const confirmation = window.confirm(
      `Voulez-vous vraiment supprimer « ${service.titre} » ?`,
    );

    if (!confirmation) return;

    try {
      await api.delete(`/services/${service.id}`);

      setServices((anciens) =>
        anciens.filter((item) => item.id !== service.id),
      );
    } catch (error) {
      setErreur(
        error instanceof ApiError
          ? error.message
          : "Impossible de supprimer le service.",
      );
    }
  };

  const apresCreation = (service: ServiceOffert) => {
    setServices((anciens) => [service, ...anciens]);
    setAfficherCreation(false);
    setOngletServices("actifs");
  };

  const apresEdition = (service: ServiceOffert) => {
    setServices((anciens) =>
      anciens.map((item) =>
        item.id === service.id ? service : item,
      ),
    );

    setServiceEnEdition(null);
  };

  return (
    <div className="space-y-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          icon={Wrench}
          eyebrow="Espace étudiant"
          title="Mes services"
          className="mb-0"
        />

        <Button
          onClick={() => {
            setAfficherCreation(true);
            setServiceEnEdition(null);
          }}
          className="flex items-center justify-center gap-2"
        >
          <Plus size={17} />
          Nouveau service
        </Button>
      </div>

      {erreur && (
        <NoticeCard>
          <div className="flex items-start gap-3">
            <X size={18} className="mt-0.5 text-brique" />
            <div>
              <p className="font-medium text-ink">
                Une erreur est survenue
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                {erreur}
              </p>
            </div>
          </div>
        </NoticeCard>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total" value={total} icon={Wrench} />

        <StatCard label="Actifs" value={actifs} icon={Check} />

        <StatCard label="Archivés" value={archives} icon={Archive} />

        <StatCard label="Masqués" value={masques} icon={X} />
      </div>

      {afficherCreation && (
        <NoticeCard>
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">
                Nouveau service
              </h2>
              <p className="mt-1 text-sm text-ink-soft">
                Présentez clairement le service que vous proposez.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setAfficherCreation(false)}
              className="rounded-lg p-2 text-ink-soft transition hover:bg-ink/5 hover:text-ink"
              aria-label="Fermer"
            >
              <X size={18} />
            </button>
          </div>

          <FormulaireService
            mode="creation"
            onSuccess={apresCreation}
            onCancel={() => setAfficherCreation(false)}
          />
        </NoticeCard>
      )}

      <SousNavigation
        onglets={[
          { valeur: "actifs", label: "Actifs" },
          { valeur: "archives", label: "Archivés" },
        ]}
        actif={ongletServices}
        onChanger={(valeur) =>
          setOngletServices(valeur as OngletServices)
        }
      />

      {/* Filtres de l'onglet courant */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="relative">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft/60"
            aria-hidden="true"
          />

          <Input
            value={recherche}
            onChange={(event) =>
              setRecherche(event.target.value)
            }
            placeholder={
              ongletServices === "archives"
                ? "Rechercher un service archivé…"
                : "Rechercher un service actif…"
            }
            aria-label="Rechercher un service"
            className="pl-9"
          />
        </div>

        <Select
          value={filtreCategorie}
          onChange={(event) =>
            setFiltreCategorie(event.target.value)
          }
          aria-label="Filtrer par catégorie"
        >
          <option value="">Toutes les catégories</option>

          {categoriesDisponibles.map((categorie) => (
            <option key={categorie} value={categorie}>
              {categorie}
            </option>
          ))}
        </Select>
      </div>

      {chargement ? (
        <div className="flex min-h-48 items-center justify-center">
          <Loader2
            size={24}
            className="animate-spin text-ink-soft"
          />
        </div>
      ) : servicesAffiches.length === 0 ? (
        <NoticeCard>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-ink/5">
              <Wrench size={20} className="text-ink-soft" />
            </div>

            <h3 className="font-semibold text-ink">
              {ongletServices === "archives"
                ? "Aucun service archivé"
                : "Aucun service actif"}
            </h3>

            <p className="mt-1 max-w-md text-sm text-ink-soft">
              {recherche || filtreCategorie
                ? "Aucun service ne correspond aux filtres sélectionnés."
                : ongletServices === "archives"
                  ? "Les services que vous archivez apparaîtront ici."
                  : "Créez votre premier service pour commencer à proposer vos compétences."}
            </p>

            {ongletServices === "actifs" &&
              !recherche &&
              !filtreCategorie && (
                <Button
                  className="mt-5"
                  onClick={() => setAfficherCreation(true)}
                >
                  <Plus size={16} />
                  Créer un service
                </Button>
              )}
          </div>
        </NoticeCard>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {servicesAffiches.map((service) => {
            const IconeCategorie = iconePourCategorie(
              service.categorie,
            );
            const delaiJours = Number(service.delai ?? 0);
            const imagePrincipale = getFileUrl(
              service.imagesUrls?.[0] ?? null,
            );

            return (
              <article
                key={service.id}
                className="group relative overflow-visible rounded-2xl border border-ink/10 bg-paper p-5 shadow-sm transition hover:border-ink/20 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ink/5 text-ink-soft">
                    <IconeCategorie size={21} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-ink">
                          {service.titre}
                        </h3>

                        <p className="mt-1 text-sm text-ink-soft">
                          {service.categorie}
                        </p>
                      </div>

                      {/* Menu ⋮ */}
                      <details className="relative shrink-0">
                        <summary
                          className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-lg text-ink-soft transition hover:bg-ink/5 hover:text-ink [&::-webkit-details-marker]:hidden"
                          aria-label={`Actions pour ${service.titre}`}
                        >
                          <MoreVertical size={19} />
                        </summary>

                        <div className="absolute right-0 top-11 z-30 w-44 overflow-hidden rounded-xl border border-ink/10 bg-paper p-1.5 shadow-lg">
                          <Link
                            href={`/services/${service.id}`}
                            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink transition hover:bg-ink/5"
                          >
                            <Search size={15} />
                            Voir
                          </Link>

                          {!service.estArchive && (
                            <button
                              type="button"
                              onClick={() =>
                                setServiceEnEdition(service)
                              }
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink transition hover:bg-ink/5"
                            >
                              <Pencil size={15} />
                              Modifier
                            </button>
                          )}

                          {!service.estArchive && (
                            <button
                              type="button"
                              onClick={() => supprimer(service)}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-brique transition hover:bg-brique/5"
                            >
                              <X size={15} />
                              Supprimer
                            </button>
                          )}
                        </div>
                      </details>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Tag>{formatArgent(service.prix)}</Tag>

                      <Tag>
                        {delaiJours} jour
                        {delaiJours > 1 ? "s" : ""}
                      </Tag>

                      {service.estArchive ? (
                        <Tag>Archivé</Tag>
                      ) : service.disponible ? (
                        <Tag>Disponible</Tag>
                      ) : (
                        <Tag>Masqué</Tag>
                      )}
                    </div>
                  </div>
                </div>

                {imagePrincipale && (
                  <div className="mt-4 overflow-hidden rounded-xl">
                    <img
                      src={imagePrincipale}
                      alt=""
                      className="h-44 w-full object-cover"
                    />
                  </div>
                )}

                {service.description && (
                  <p className="mt-4 line-clamp-3 text-sm leading-6 text-ink-soft">
                    {service.description}
                  </p>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-ink/10 pt-4">
                  {!service.estArchive && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center justify-center gap-2"
                      onClick={() =>
                        changerDisponibilite(service)
                      }
                    >
                      {service.disponible ? (
                        <>
                          <X size={15} />
                          Masquer
                        </>
                      ) : (
                        <>
                          <Check size={15} />
                          Republier
                        </>
                      )}
                    </Button>
                  )}

                  {service.estArchive ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center justify-center gap-2"
                      onClick={() => restaurer(service)}
                    >
                      <ArchiveRestore size={15} />
                      Restaurer
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center justify-center gap-2"
                      onClick={() => archiver(service)}
                    >
                      <Archive size={15} />
                      Archiver
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {serviceEnEdition && (
        <NoticeCard>
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">
                Modifier le service
              </h2>

              <p className="mt-1 text-sm text-ink-soft">
                Modifiez les informations de votre service.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setServiceEnEdition(null)}
              className="rounded-lg p-2 text-ink-soft transition hover:bg-ink/5 hover:text-ink"
              aria-label="Fermer"
            >
              <X size={18} />
            </button>
          </div>

          <FormulaireService
            mode="edition"
            serviceId={serviceEnEdition.id}
            initialValues={{
              titre: serviceEnEdition.titre,
              description: serviceEnEdition.description,
              categorie: serviceEnEdition.categorie,
              prix: String(serviceEnEdition.prix),
              delaiJours: String(Number(serviceEnEdition.delai ?? 0)),
              disponible: serviceEnEdition.disponible,
              imageUrl: serviceEnEdition.imagesUrls?.[0] ?? "",
            }}
            onSuccess={apresEdition}
            onCancel={() => setServiceEnEdition(null)}
          />
        </NoticeCard>
      )}
    </div>
  );
}