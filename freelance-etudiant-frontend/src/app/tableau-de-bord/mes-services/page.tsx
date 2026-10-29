"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
import type { ServiceOffert } from "@/types/services";
import { useTranslations } from "next-intl";
import { useFormats } from "@/i18n/use-formats";
import { useOptionLabels } from "@/i18n/use-option-labels";
import { cleCategorie, iconePourCategorie } from "@/lib/categories";

import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import {
  NoticeCard,
  PageHeader,
  StatCard,
  Tag,
} from "@/components/ui/Notice";
import { ImageAvecRepli } from "@/components/ui/ImageAvecRepli";
import { SousNavigation } from "@/components/ui/SousNavigation";
import { FormulaireService } from "@/features/services/components/FormulaireService";

type OngletServices = "actifs" | "archives";

export default function MesServicesPage() {
  const t = useTranslations("dashboardPages.myServices");
  return (
    <Suspense fallback={<p className="text-sm text-ink-soft">{t("loading")}</p>}>
      <MesServicesContent />
    </Suspense>
  );
}

function MesServicesContent() {
  const t = useTranslations("dashboardPages.myServices");
  const { argent: formatArgent } = useFormats();
  const { categorie: libelleCategorie } = useOptionLabels();
  const searchParams = useSearchParams();
  const idAEditer = searchParams.get("editer");
  const [idAutoEditionFermee, setIdAutoEditionFermee] = useState<string | null>(
    null,
  );
  const [services, setServices] = useState<ServiceOffert[]>(
    [],
  );

  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  const [ongletServices, setOngletServices] =
    useState<OngletServices>("actifs");
  const [ongletChoisiManuellement, setOngletChoisiManuellement] =
    useState(false);

  const [recherche, setRecherche] = useState("");
  const [filtreCategorie, setFiltreCategorie] =
    useState("");

  const [serviceEnEdition, setServiceEnEdition] =
    useState<ServiceOffert | null>(null);

  const [afficherCreation, setAfficherCreation] =
    useState(false);

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
        setErreur(
          t("loadError"),
        );
      }
    } finally {
      setChargement(false);
    }
  }, [t]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void chargerServices();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [chargerServices]);

  const serviceAutoAEditer =
    idAEditer && idAutoEditionFermee !== idAEditer
      ? services.find((service) => service.id === idAEditer) ?? null
      : null;
  const serviceEdite = serviceEnEdition ?? serviceAutoAEditer;
  const ongletServicesAffiche =
    serviceAutoAEditer?.estArchive && !ongletChoisiManuellement
      ? "archives"
      : ongletServices;

  function fermerEdition() {
    setServiceEnEdition(null);
    setAfficherCreation(false);
    if (idAEditer) setIdAutoEditionFermee(idAEditer);
  }

  const categoriesDisponibles = Array.from(
    new Map(
      services
        .filter((service) => service.categorie)
        .map((service) => [
          cleCategorie(service.categorie),
          service.categorie,
        ]),
    ).values(),
  ).sort();

  const servicesFiltres = services.filter((service) => {
    const texte =
      `${service.titre} ${service.categorie}`.toLowerCase();

    const correspondRecherche =
      !recherche.trim() ||
      texte.includes(
        recherche.trim().toLowerCase(),
      );

    const correspondCategorie =
      !filtreCategorie ||
      cleCategorie(service.categorie) === cleCategorie(filtreCategorie);

    return (
      correspondRecherche && correspondCategorie
    );
  });

  const servicesAffiches = servicesFiltres.filter(
    (service) =>
      ongletServicesAffiche === "archives"
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
    (service) =>
      !service.estArchive &&
      !service.disponible,
  ).length;

  /*
   * Ouvre le formulaire d'édition.
   *
   * On ferme également le menu <details> afin que
   * le menu d'actions ne reste pas ouvert au-dessus
   * du formulaire.
   */
  const ouvrirEdition = (
    service: ServiceOffert,
    event?: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event?.currentTarget
      .closest("details")
      ?.removeAttribute("open");

    setAfficherCreation(false);
    setServiceEnEdition(service);
  };

  const changerDisponibilite = async (
    service: ServiceOffert,
  ) => {
    setErreur("");

    try {
      const serviceMisAJour =
        await api.patch<ServiceOffert>(
          `/services/${service.id}`,
          {
            disponible: !service.disponible,
          },
        );

      setServices((anciens) =>
        anciens.map((item) =>
          item.id === service.id
            ? serviceMisAJour
            : item,
        ),
      );
    } catch (error) {
      setErreur(
        error instanceof ApiError
          ? error.message
          : t("availabilityError"),
      );
    }
  };

  const archiver = async (
    service: ServiceOffert,
  ) => {
    setErreur("");

    try {
      const serviceMisAJour =
        await api.patch<ServiceOffert>(
          `/services/${service.id}/archiver`,
          {},
        );

      setServices((anciens) =>
        anciens.map((item) =>
          item.id === service.id
            ? serviceMisAJour
            : item,
        ),
      );

      if (serviceEdite?.id === service.id) {
        fermerEdition();
      }
    } catch (error) {
      setErreur(
        error instanceof ApiError
          ? error.message
          : t("archiveError"),
      );
    }
  };

  const restaurer = async (
    service: ServiceOffert,
  ) => {
    setErreur("");

    try {
      const serviceMisAJour =
        await api.patch<ServiceOffert>(
          `/services/${service.id}/restaurer`,
          {},
        );

      setServices((anciens) =>
        anciens.map((item) =>
          item.id === service.id
            ? serviceMisAJour
            : item,
        ),
      );
    } catch (error) {
      setErreur(
        error instanceof ApiError
          ? error.message
          : t("restoreError"),
      );
    }
  };

  const supprimer = async (
    service: ServiceOffert,
  ) => {
    const confirmation = window.confirm(
      t("confirmDelete", { titre: service.titre }),
    );

    if (!confirmation) return;

    setErreur("");

    try {
      await api.delete(`/services/${service.id}`);

      setServices((anciens) =>
        anciens.filter(
          (item) => item.id !== service.id,
        ),
      );

      if (serviceEdite?.id === service.id) {
        fermerEdition();
      }
    } catch (error) {
      setErreur(
        error instanceof ApiError
          ? error.message
          : t("deleteError"),
      );
    }
  };

  const apresCreation = (
    service: ServiceOffert,
  ) => {
    setServices((anciens) => [
      service,
      ...anciens,
    ]);

    setAfficherCreation(false);
    fermerEdition();
    setOngletServices("actifs");
  };

  const apresEdition = (
    service: ServiceOffert,
  ) => {
    setServices((anciens) =>
      anciens.map((item) =>
        item.id === service.id
          ? service
          : item,
      ),
    );

    fermerEdition();
  };

  return (
    <div className="space-y-6">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          icon={Wrench}
          eyebrow={t("eyebrow")}
          title={t("title")}
          className="mb-0"
        />

        <Button
          onClick={() => {
            fermerEdition();
            setAfficherCreation(true);
          }}
          className="flex items-center justify-center gap-2"
        >
          <Plus size={17} />
          {t("newService")}
        </Button>
      </div>

      {erreur && (
        <NoticeCard>
          <div className="flex items-start gap-3">
            <X
              size={18}
              className="mt-0.5 text-brique"
            />

            <div>
              <p className="font-medium text-ink">
                {t("errorTitle")}
              </p>

              <p className="mt-1 text-sm text-ink-soft">
                {erreur}
              </p>
            </div>
          </div>
        </NoticeCard>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("stats.total")}
          value={total}
          icon={Wrench}
        />

        <StatCard
          label={t("stats.active")}
          value={actifs}
          icon={Check}
        />

        <StatCard
          label={t("stats.archived")}
          value={archives}
          icon={Archive}
        />

        <StatCard
          label={t("stats.hidden")}
          value={masques}
          icon={X}
        />
      </div>

      {afficherCreation && !serviceAutoAEditer && (
        <NoticeCard>
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">
                {t("newService")}
              </h2>

              <p className="mt-1 text-sm text-ink-soft">
                {t("newServiceHint")}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setAfficherCreation(false)
              }
              className="rounded-lg p-2 text-ink-soft transition hover:bg-ink/5 hover:text-ink"
              aria-label={t("close")}
            >
              <X size={18} />
            </button>
          </div>

          <FormulaireService
            mode="creation"
            onSuccess={apresCreation}
            onCancel={() =>
              setAfficherCreation(false)
            }
          />
        </NoticeCard>
      )}

      <SousNavigation
        onglets={[
          {
            valeur: "actifs",
            label: t("tabs.active"),
          },
          {
            valeur: "archives",
            label: t("tabs.archived"),
          },
        ]}
        actif={ongletServicesAffiche}
        onChanger={(valeur) => {
          setOngletChoisiManuellement(true);
          setOngletServices(
            valeur as OngletServices,
          );
        }}
      />

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
              ongletServicesAffiche === "archives"
                ? t("search.archived")
                : t("search.active")
            }
            aria-label={t("search.label")}
            className="pl-9"
          />
        </div>

        <Select
          value={filtreCategorie}
          onChange={(event) =>
            setFiltreCategorie(event.target.value)
          }
          aria-label={t("filterCategory")}
        >
          <option value="" disabled hidden>
            {t("allCategories")}
          </option>

          {categoriesDisponibles.map(
            (categorie) => (
              <option
                key={categorie}
                value={categorie}
              >
                {libelleCategorie(categorie)}
              </option>
            ),
          )}
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
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-ink/5">
              <Wrench
                size={20}
                className="text-ink-soft"
              />
            </div>

            <h3 className="font-semibold text-ink">
              {ongletServicesAffiche === "archives"
                ? t("empty.archivedTitle")
                : t("empty.activeTitle")}
            </h3>

            <p className="mt-1 max-w-md text-sm text-ink-soft">
              {recherche || filtreCategorie
                ? t("empty.noMatch")
                : ongletServicesAffiche === "archives"
                  ? t("empty.archivedHint")
                  : t("empty.activeHint")}
            </p>

            {ongletServicesAffiche === "actifs" &&
              !recherche &&
              !filtreCategorie && (
                <Button
                  className="mt-5"
                  onClick={() => {
                    fermerEdition();
                    setAfficherCreation(true);
                  }}
                >
                  <Plus size={16} />
                  {t("createService")}
                </Button>
              )}
          </div>
        </NoticeCard>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {servicesAffiches.map((service) => {
            const IconeCategorie =
              iconePourCategorie(
                service.categorie,
              );

            const delaiJours = Number(
              service.delai ?? 0,
            );

            const imagePrincipale =
              getFileUrl(
                service.imagesUrls?.[0] ?? null,
              );
            const nombreImages = service.imagesUrls?.length ?? 0;

            return (
              <article
                key={service.id}
                className="group relative overflow-visible rounded-lg border border-ink/10 bg-paper p-5 transition hover:border-ink/20 hover:shadow-md"
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
                          {libelleCategorie(service.categorie)}
                        </p>
                      </div>

                      <details className="relative shrink-0">
                        <summary
                          className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-lg text-ink-soft transition hover:bg-ink/5 hover:text-ink [&::-webkit-details-marker]:hidden"
                          aria-label={t("actionsFor", { titre: service.titre })}
                        >
                          <MoreVertical size={19} />
                        </summary>

                        <div className="absolute right-0 top-11 z-30 w-44 overflow-hidden rounded-xl border border-ink/10 bg-paper p-1.5 shadow-lg">
                          <Link
                            href={`/services/${service.id}`}
                            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink transition hover:bg-ink/5"
                          >
                            <Search size={15} />
                            {t("view")}
                          </Link>

                          {!service.estArchive && (
                            <button
                              type="button"
                              onClick={(event) =>
                                ouvrirEdition(
                                  service,
                                  event,
                                )
                              }
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink transition hover:bg-ink/5"
                            >
                              <Pencil size={15} />
                              {t("edit")}
                            </button>
                          )}

                          {!service.estArchive && (
                            <button
                              type="button"
                              onClick={() =>
                                supprimer(service)
                              }
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-brique transition hover:bg-brique/5"
                            >
                              <X size={15} />
                              {t("delete")}
                            </button>
                          )}
                        </div>
                      </details>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Tag>
                        {formatArgent(service.prix)}
                      </Tag>

                      <Tag>
                        {t("days", { count: delaiJours })}
                      </Tag>

                      {service.estArchive ? (
                        <Tag>{t("tagArchived")}</Tag>
                      ) : service.disponible ? (
                        <Tag>{t("tagAvailable")}</Tag>
                      ) : (
                        <Tag>{t("tagHidden")}</Tag>
                      )}
                    </div>
                  </div>
                </div>

                {nombreImages > 0 && (
                  <div className="relative mt-4 h-44 overflow-hidden rounded-xl">
                    <ImageAvecRepli
                      src={imagePrincipale}
                      alt=""
                      categorie={service.categorie}
                      className="h-full w-full object-cover"
                    />
                    {nombreImages > 1 && (
                      <span className="absolute bottom-2 right-2 rounded-full bg-ink/70 px-2 py-0.5 text-[0.6875rem] font-medium text-paper-light">
                        +{nombreImages - 1}
                      </span>
                    )}
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
                        changerDisponibilite(
                          service,
                        )
                      }
                    >
                      {service.disponible ? (
                        <>
                          <X size={15} />
                          {t("hide")}
                        </>
                      ) : (
                        <>
                          <Check size={15} />
                          {t("republish")}
                        </>
                      )}
                    </Button>
                  )}

                  {service.estArchive ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center justify-center gap-2"
                      onClick={() =>
                        restaurer(service)
                      }
                    >
                      <ArchiveRestore size={15} />
                      {t("restore")}
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center justify-center gap-2"
                      onClick={() =>
                        archiver(service)
                      }
                    >
                      <Archive size={15} />
                      {t("archive")}
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {serviceEdite && (
        <NoticeCard>
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">
                {t("editService")}
              </h2>

              <p className="mt-1 text-sm text-ink-soft">
                {t("editServiceHint")}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                fermerEdition()
              }
              className="rounded-lg p-2 text-ink-soft transition hover:bg-ink/5 hover:text-ink"
              aria-label={t("close")}
            >
              <X size={18} />
            </button>
          </div>

          <FormulaireService
            key={serviceEdite.id}
            mode="edition"
            serviceId={serviceEdite.id}
            initialValues={{
              titre: serviceEdite.titre ?? "",
              description:
                serviceEdite.description ?? "",
              categorie:
                serviceEdite.categorie ?? "",
              prix: String(
                serviceEdite.prix ?? "",
              ),
              delaiJours: String(
                Number(
                  serviceEdite.delai ?? 0,
                ),
              ),
              disponible:
                serviceEdite.disponible ?? true,
              imagesUrls: serviceEdite.imagesUrls ?? [],
              competences: (
                serviceEdite.competences ?? []
              ).join(", "),
            }}
            onSuccess={apresEdition}
            onCancel={() =>
              fermerEdition()
            }
          />
        </NoticeCard>
      )}
    </div>
  );
}
