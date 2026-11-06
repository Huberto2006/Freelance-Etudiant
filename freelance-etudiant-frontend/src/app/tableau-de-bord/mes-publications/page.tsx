"use client";

import { useConfirmation } from "@/components/ui/ConfirmDialog";
import { StaggerContainer } from "@/components/ui/motion/StaggerContainer";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  BriefcaseBusiness,
  Layers3,
  LoaderCircle,
  PauseCircle,
  Pencil,
  PlayCircle,
  Plus,
  RotateCcw,
  Trash2,
  Wrench,
} from "lucide-react";

import { api, ApiError } from "@/lib/api";
import type { Mission } from "@/types/missions";
import type { ServiceOffert } from "@/types/services";
import { useAuth } from "@/lib/auth-context";
import { useTranslations } from "next-intl";

import { PanneauFiltres, type Filtres } from "@/features/catalogue/components/PanneauFiltres";
import { CarteMission } from "@/features/missions/components/CarteMission";
import { CarteService } from "@/features/services/components/CarteService";
import {
  MessageVide,
  NoticeCard,
  PageHeader,
  Tag,
  EtatVide,
} from "@/components/ui/Notice";
import { Button } from "@/components/ui/Button";
import { SqueletteCatalogue } from "@/features/catalogue/components/SqueletteCatalogue";

/**
 * « Mes publications » : contrairement à /publications (catalogue général
 * de tout Kianja), cette page n'affiche QUE les missions ou services de
 * l'utilisateur connecté.
 *
 * Un compte n'a jamais les deux à la fois (un client publie des missions,
 * un étudiant propose des services — voir types/utilisateurs.ts Role), mais les
 * onglets Toutes/Missions/Services restent affichés pour la cohérence
 * visuelle avec /publications ; l'onglet sans contenu affiche simplement
 * un état vide.
 *
 * La création et l'édition détaillée d'une mission/d'un service restent
 * dans mes-missions / mes-services (formulaires déjà existants, non
 * dupliqués ici) : « Modifier » y renvoie. Les actions rapides sur les
 * services (disponibilité, archivage, suppression) appellent exactement
 * les mêmes endpoints que mes-services/page.tsx.
 */

type PublicationItem =
  | { type: "mission"; id: string; date: string; mission: Mission }
  | { type: "service"; id: string; date: string; service: ServiceOffert };

const LIEN_GERER_MISSIONS = "/tableau-de-bord/mes-missions";
const LIEN_GERER_SERVICES = "/tableau-de-bord/mes-services";

export default function MesPublicationsPage() {
  const t = useTranslations("dashboardPages.myPublications");
  const { utilisateur, chargement: authChargement } = useAuth();
  const role = utilisateur?.role;

  const [missions, setMissions] = useState<Mission[]>([]);
  const [services, setServices] = useState<ServiceOffert[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [declencheur, setDeclencheur] = useState(0);

  const [filtres, setFiltres] = useState<Filtres>({});

  const charger = useCallback(async () => {
    if (authChargement) return;

    if (role !== "client" && role !== "etudiant") {
      setChargement(false);
      return;
    }

    setChargement(true);
    setErreur(null);

    try {
      if (role === "client") {
        const data = await api.get<Mission[]>("/missions/me/mes-missions");
        setMissions(data);
        setServices([]);
      } else {
        const data = await api.get<ServiceOffert[]>("/services/me/mes-services");
        setServices(data);
        setMissions([]);
      }
    } catch (err) {
      setErreur(
        err instanceof ApiError
          ? err.message
          : t("loadError"),
      );
    } finally {
      setChargement(false);
    }
  }, [authChargement, role, t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void charger();
  }, [charger, declencheur]);

  function retirerService(id: string) {
    setServices((anciens) => anciens.filter((s) => s.id !== id));
  }

  function remplacerService(service: ServiceOffert) {
    setServices((anciens) =>
      anciens.map((s) => (s.id === service.id ? service : s)),
    );
  }

  const items = useMemo<PublicationItem[]>(() => {
    let resultat: PublicationItem[] = [
      // Les missions privees nees d'une commande de service (RGds3,
      // estModere = false) ne sont pas des « publications » : elles ne
      // sont jamais publiques et se suivent depuis les livraisons/commandes.
      ...missions
        .filter((m) => m.estModere !== false)
        .map(
          (m): PublicationItem => ({
            type: "mission",
            id: m.id,
            date: m.dateCreation,
            mission: m,
          }),
        ),
      ...services.map(
        (s): PublicationItem => ({
          type: "service",
          id: s.id,
          date: s.dateCreation,
          service: s,
        }),
      ),
    ];

    const motsCles = filtres.motsCles?.trim().toLowerCase();
    if (motsCles) {
      resultat = resultat.filter((item) => {
        const titre =
          item.type === "mission" ? item.mission.titre : item.service.titre;
        const description =
          item.type === "mission"
            ? item.mission.description
            : item.service.description;
        return (
          titre.toLowerCase().includes(motsCles) ||
          description.toLowerCase().includes(motsCles)
        );
      });
    }

    const competence = filtres.competence?.trim().toLowerCase();
    if (competence) {
      resultat = resultat.filter((item) => {
        const competences =
          item.type === "mission"
            ? item.mission.competencesRequises
            : item.service.competences;
        return competences?.some((c) => c.toLowerCase().includes(competence));
      });
    }

    const budgetMin = filtres.budgetMin ? Number(filtres.budgetMin) : undefined;
    const budgetMax = filtres.budgetMax ? Number(filtres.budgetMax) : undefined;
    if (budgetMin !== undefined || budgetMax !== undefined) {
      resultat = resultat.filter((item) => {
        const valeur =
          item.type === "mission"
            ? Number(item.mission.budget)
            : Number(item.service.prix);
        if (budgetMin !== undefined && valeur < budgetMin) return false;
        if (budgetMax !== undefined && valeur > budgetMax) return false;
        return true;
      });
    }

    return resultat.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [missions, services, filtres]);

  const nbMissions = missions.length;
  const nbServices = services.length;
  const nbTotal = nbMissions + nbServices;

  const lienPublier =
    role === "client" ? LIEN_GERER_MISSIONS : LIEN_GERER_SERVICES;

  return (
    <div>
      <PageHeader
          icon={Layers3}
          eyebrow={t("eyebrow")}
          title={t("title")}
        actions={
          <>

        {(role === "client" || role === "etudiant") && (chargement || nbTotal > 0) && (
          <Button href={lienPublier} variant="secondary" className="gap-2">
              <Plus size={16} />
              {role === "client" ? t("publishMission") : t("offerService")}
            </Button>
        )}
          </>
        }
      />

      {role === "admin" ? (
        <NoticeCard>
          <MessageVide>
            {t("adminNotice")}
          </MessageVide>
        </NoticeCard>
      ) : (
        <>
          {/* --------------------------------- TYPE SELON LE RÔLE */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div
              className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 bg-paper-light px-3.5 py-1.5 text-xs text-ink font-medium"
              aria-label={role === "client" ? t("myMissions") : t("myServices")}
            >
              {role === "client" ? (
                <BriefcaseBusiness size={14} aria-hidden="true" />
              ) : (
                <Wrench size={14} aria-hidden="true" />
              )}
              <span>
                {role === "client"
                  ? t("missionsCount", { count: chargement ? "…" : nbMissions })
                  : t("servicesCount", { count: chargement ? "…" : nbServices })}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            {/* --------------------------------- FILTRES */}
            <aside className="w-full shrink-0 lg:sticky lg:top-[7.5rem] lg:w-72">
              <PanneauFiltres
                filtresInitiaux={filtres}
                placeholder={t("searchPlaceholder")}
                labelBudget={t("budgetLabel")}
                onFiltrer={setFiltres}
              />
            </aside>

            {/* --------------------------------- RÉSULTATS */}
            <div className="min-w-0 flex-1">
              {chargement ? (
                <SqueletteCatalogue nombre={4} />
              ) : erreur ? (
                <NoticeCard>
                  <div className="py-4 text-center">
                    <p className="text-sm font-medium text-brique">{erreur}</p>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setDeclencheur((d) => d + 1)}
                      className="mt-3"
                    >
                      <RotateCcw size={14} className="mr-1.5" />
                      {t("retry")}
                    </Button>
                  </div>
                </NoticeCard>
              ) : items.length === 0 ? (
                <EtatVide
                  icon={Layers3}
                  action={
                    <Button href={lienPublier} variant="secondary" size="sm" className="gap-1.5">
                      <Plus size={14} aria-hidden="true" />
                      {role === "client" ? t("publishMission") : t("offerService")}
                    </Button>
                  }
                >
                  {nbTotal === 0
                    ? role === "client"
                      ? t("emptyMissions")
                      : t("emptyServices")
                    : t("emptySearch")}
                </EtatVide>
              ) : (
                <StaggerContainer className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((item) =>
                    item.type === "mission" ? (
                      <div key={`m-${item.id}`} className="flex flex-col gap-2">
                        <CarteMission mission={item.mission} />
                        <Button
                          href={`${LIEN_GERER_MISSIONS}?editer=${item.mission.id}`} variant="ghost" size="sm" className="self-start gap-1.5 text-xs">
                            <Pencil size={14} />
                            {t("edit")}
                          </Button>
                      </div>
                    ) : (
                      <CarteServiceGeree
                        key={`s-${item.id}`}
                        service={item.service}
                        onSupprime={retirerService}
                        onMisAJour={remplacerService}
                      />
                    ),
                  )}
                </StaggerContainer>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Enveloppe CarteService (inchangée) avec les actions réellement
 * disponibles côté étudiant : mêmes endpoints, mêmes règles que
 * mes-services/page.tsx (disponibilité, archivage/restauration,
 * suppression). « Modifier » renvoie vers le formulaire existant plutôt
 * que d'en dupliquer la logique ici.
 */
function CarteServiceGeree({
  service,
  onSupprime,
  onMisAJour,
}: {
  service: ServiceOffert;
  onSupprime: (id: string) => void;
  onMisAJour: (service: ServiceOffert) => void;
}) {
  const t = useTranslations("dashboardPages.myPublications");
  const { confirmer, dialogueConfirmation } = useConfirmation();
  const tCommun = useTranslations("common");
  const [enCours, setEnCours] = useState<
    "disponibilite" | "archive" | "suppression" | null
  >(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function basculerDisponibilite() {
    setEnCours("disponibilite");
    setErreur(null);
    try {
      const maj = await api.patch<ServiceOffert>(`/services/${service.id}`, {
        disponible: !service.disponible,
      });
      onMisAJour(maj);
    } catch (err) {
      setErreur(
        err instanceof ApiError ? err.message : t("availabilityError"),
      );
    } finally {
      setEnCours(null);
    }
  }

  async function basculerArchive() {
    setEnCours("archive");
    setErreur(null);
    try {
      const maj = await api.patch<ServiceOffert>(
        `/services/${service.id}/${service.estArchive ? "restaurer" : "archiver"}`,
        {},
      );
      onMisAJour(maj);
    } catch (err) {
      setErreur(
        err instanceof ApiError
          ? err.message
          : service.estArchive
          ? t("restoreError")
          : t("archiveError"),
      );
    } finally {
      setEnCours(null);
    }
  }

  async function supprimer() {
    const confirmation = await confirmer({
      titre: t("confirmDelete", { titre: service.titre }),
      libelleConfirmer: tCommun("actions.delete"),
    });
    if (!confirmation) return;

    setEnCours("suppression");
    setErreur(null);
    try {
      await api.delete(`/services/${service.id}`);
      onSupprime(service.id);
    } catch (err) {
      setErreur(
        err instanceof ApiError ? err.message : t("deleteError"),
      );
      setEnCours(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <CarteService service={service} />

      <div className="flex flex-wrap items-center gap-1.5">
        {service.estArchive && <Tag tone="ink">{t("archived")}</Tag>}
        {!service.estArchive && !service.disponible && (
          <Tag tone="ocre">{t("hidden")}</Tag>
        )}

        <Button href={`${LIEN_GERER_SERVICES}?editer=${service.id}`} variant="ghost" size="sm" className="gap-1.5 text-xs">
            <Pencil size={14} />
            {t("edit")}
          </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs"
          disabled={enCours !== null || service.estArchive}
          onClick={basculerDisponibilite}
        >
          {enCours === "disponibilite" ? (
            <LoaderCircle size={14} className="motion-safe:animate-spin" />
          ) : service.disponible ? (
            <PauseCircle size={14} />
          ) : (
            <PlayCircle size={14} />
          )}
          {service.disponible ? t("pause") : t("activate")}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs"
          disabled={enCours !== null}
          onClick={basculerArchive}
        >
          {enCours === "archive" ? (
            <LoaderCircle size={14} className="motion-safe:animate-spin" />
          ) : service.estArchive ? (
            <ArchiveRestore size={14} />
          ) : (
            <Archive size={14} />
          )}
          {service.estArchive ? t("restore") : t("archive")}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs text-brique hover:border-brique/40"
          disabled={enCours !== null}
          onClick={supprimer}
        >
          {enCours === "suppression" ? (
            <LoaderCircle size={14} className="motion-safe:animate-spin" />
          ) : (
            <Trash2 size={14} />
          )}
          {t("delete")}
        </Button>
      </div>

      {erreur && <p className="text-xs text-brique">{erreur}</p>}
      {dialogueConfirmation}
    </div>
  );
}
