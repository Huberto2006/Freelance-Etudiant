"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  BriefcaseBusiness,
  Layers3,
  Loader2,
  PauseCircle,
  Pencil,
  PlayCircle,
  Plus,
  RotateCcw,
  Trash2,
  Wrench,
} from "lucide-react";

import { api, ApiError } from "@/lib/api";
import type { Mission, ServiceOffert } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";

import { PanneauFiltres, type Filtres } from "@/components/ui/PanneauFiltres";
import { CarteMission } from "@/components/ui/CarteMission";
import { CarteService } from "@/components/ui/CarteService";
import { MessageVide, NoticeCard, PageHeader, Tag } from "@/components/ui/Notice";
import { Button } from "@/components/ui/Button";
import { SqueletteCatalogue } from "@/components/ui/SqueletteCatalogue";

/**
 * « Mes publications » : contrairement à /publications (catalogue général
 * de tout Kianja), cette page n'affiche QUE les missions ou services de
 * l'utilisateur connecté.
 *
 * Un compte n'a jamais les deux à la fois (un client publie des missions,
 * un étudiant propose des services — voir lib/types.ts Role), mais les
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
          : "Impossible de charger vos publications pour le moment.",
      );
    } finally {
      setChargement(false);
    }
  }, [authChargement, role]);

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
      ...missions.map(
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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          icon={Layers3}
          eyebrow="Tableau de bord"
          title="Mes publications"
          className="mb-0"
        />

        {(role === "client" || role === "etudiant") && (
          <Link href={lienPublier}>
            <Button variant="secondary" className="gap-2">
              <Plus size={16} />
              {role === "client" ? "Publier une mission" : "Proposer un service"}
            </Button>
          </Link>
        )}
      </div>

      {role === "admin" ? (
        <NoticeCard>
          <MessageVide>
            Les comptes administrateur ne publient pas de missions ou de
            services. Retrouvez la gestion de la plateforme dans la section
            Administration.
          </MessageVide>
        </NoticeCard>
      ) : (
        <>
          {/* --------------------------------- TYPE SELON LE RÔLE */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div
              className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 bg-paper-light px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-wider text-ink"
              aria-label={role === "client" ? "Mes missions" : "Mes services"}
            >
              {role === "client" ? (
                <BriefcaseBusiness size={14} aria-hidden="true" />
              ) : (
                <Wrench size={14} aria-hidden="true" />
              )}
              <span>
                {role === "client"
                  ? `Missions (${chargement ? "…" : nbMissions})`
                  : `Services (${chargement ? "…" : nbServices})`}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            {/* --------------------------------- FILTRES */}
            <aside className="w-full shrink-0 lg:sticky lg:top-[7.5rem] lg:w-72">
              <PanneauFiltres
                filtresInitiaux={filtres}
                placeholder="Rechercher dans mes publications…"
                labelBudget="Budget ou tarif (Ar)"
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
                      <RotateCcw size={13} className="mr-1.5" />
                      Réessayer
                    </Button>
                  </div>
                </NoticeCard>
              ) : items.length === 0 ? (
                <NoticeCard>
                  <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                    <span
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-ink/5 text-ink-soft"
                      aria-hidden="true"
                    >
                      <Layers3 size={22} />
                    </span>

                    <MessageVide>
                      {nbTotal === 0
                        ? role === "client"
                          ? "Vous n'avez encore publié aucune mission."
                          : "Vous n'avez encore proposé aucun service."
                        : "Aucune publication ne correspond à votre recherche."}
                    </MessageVide>

                    <Link href={lienPublier}>
                      <Button variant="secondary" size="sm" className="gap-1.5 text-xs">
                        <Plus size={14} />
                        {role === "client"
                          ? "Publier une mission"
                          : "Proposer un service"}
                      </Button>
                    </Link>
                  </div>
                </NoticeCard>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((item) =>
                    item.type === "mission" ? (
                      <div key={`m-${item.id}`} className="flex flex-col gap-2">
                        <CarteMission mission={item.mission} />
                        <Link href={LIEN_GERER_MISSIONS} className="self-start">
                          <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                            <Pencil size={13} />
                            Modifier
                          </Button>
                        </Link>
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
                </div>
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
        err instanceof ApiError ? err.message : "Impossible de modifier la disponibilité.",
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
          ? "Impossible de restaurer le service."
          : "Impossible d'archiver le service.",
      );
    } finally {
      setEnCours(null);
    }
  }

  async function supprimer() {
    const confirmation = window.confirm(
      `Voulez-vous vraiment supprimer « ${service.titre} » ?`,
    );
    if (!confirmation) return;

    setEnCours("suppression");
    setErreur(null);
    try {
      await api.delete(`/services/${service.id}`);
      onSupprime(service.id);
    } catch (err) {
      setErreur(
        err instanceof ApiError ? err.message : "Impossible de supprimer ce service.",
      );
      setEnCours(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <CarteService service={service} />

      <div className="flex flex-wrap items-center gap-1.5">
        {service.estArchive && <Tag tone="ink">Archivé</Tag>}
        {!service.estArchive && !service.disponible && (
          <Tag tone="ocre">Masqué</Tag>
        )}

        <Link href={LIEN_GERER_SERVICES}>
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
            <Pencil size={13} />
            Modifier
          </Button>
        </Link>

        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs"
          disabled={enCours !== null || service.estArchive}
          onClick={basculerDisponibilite}
        >
          {enCours === "disponibilite" ? (
            <Loader2 size={13} className="animate-spin" />
          ) : service.disponible ? (
            <PauseCircle size={13} />
          ) : (
            <PlayCircle size={13} />
          )}
          {service.disponible ? "Mettre en pause" : "Activer"}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs"
          disabled={enCours !== null}
          onClick={basculerArchive}
        >
          {enCours === "archive" ? (
            <Loader2 size={13} className="animate-spin" />
          ) : service.estArchive ? (
            <ArchiveRestore size={13} />
          ) : (
            <Archive size={13} />
          )}
          {service.estArchive ? "Restaurer" : "Archiver"}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs text-brique hover:border-brique/40"
          disabled={enCours !== null}
          onClick={supprimer}
        >
          {enCours === "suppression" ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Trash2 size={13} />
          )}
          Supprimer
        </Button>
      </div>

      {erreur && <p className="text-xs text-brique">{erreur}</p>}
    </div>
  );
}
