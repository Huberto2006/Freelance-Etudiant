"use client";

import {
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  Package,
  FileUp,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
  Search,
  FolderGit2,
  Wallet,
  Timer,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useFormats } from "@/i18n/use-formats";
import { useLabels } from "@/i18n/use-labels";
import { useOptionLabels } from "@/i18n/use-option-labels";

import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

import type { Candidature } from "@/types/candidatures";
import type { Livraison } from "@/types/livraisons";
import type { Transaction } from "@/types/paiements";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import {
  Input,
  Select,
} from "@/components/ui/Field";

import {
  NoticeCard,
  PageHeader,
  StatCard,
  Tag,
} from "@/components/ui/Notice";
import { BoutonRetour } from "@/components/ui/BoutonRetour";
import { SousNavigation } from "@/components/ui/SousNavigation";
import { LivraisonEtudiant } from "@/features/livraisons/components/LivraisonEtudiant";
import { LivraisonClient } from "@/features/livraisons/components/LivraisonClient";

// ============================================================
// PAGE PRINCIPALE
// ============================================================

export default function LivraisonsPage() {
  const t = useTranslations("deliveriesPage");
  return (
    <Suspense
      fallback={
        <div>
          <p className="text-sm text-ink-soft">
            {t("loading")}
          </p>
        </div>
      }
    >
      <LivraisonsContent />
    </Suspense>
  );
}

// ============================================================
// CONTENU
// ============================================================

function LivraisonsContent() {
  const t = useTranslations("deliveriesPage");
  const { argent: formatArgent, dateCourte: formatDateCourte } = useFormats();
  const { statutLivraison: libelleStatutLivraison } = useLabels();
  const { categorie: libelleCategorie } = useOptionLabels();
  const searchParams = useSearchParams();

  // L'ID de candidature sert uniquement à sélectionner
  // la livraison concernée par une notification.
  const candidatureParam =
    searchParams.get("candidature");

  const {
    utilisateur,
    chargement: chargementAuth,
  } = useAuth();

  const [
    candidatures,
    setCandidatures,
  ] = useState<Candidature[]>([]);

  const [
    livraisons,
    setLivraisons,
  ] = useState<Livraison[]>([]);

  // Paiements du client connecté (GET /paiements/me) : ils permettent
  // de connaître l'état réel du paiement de chaque candidature
  // (en attente / confirmé / libéré / annulé) et d'afficher le
  // workflow de fin de projet dans LivraisonClient. Source de
  // vérité : le backend (le frontend n'évalue jamais un paiement).
  const [
    paiements,
    setPaiements,
  ] = useState<Transaction[]>([]);

  // Chargeur exposé via une ref : permet à LivraisonClient de
  // provoquer un rafraîchissement silencieux des données (sans
  // recharger toute la page) après une évaluation réussie.
  const rafraichirRef =
    useRef<
      | ((
          silencieux?: boolean,
        ) => Promise<void>)
      | null
    >(null);

  async function rafraichirDonnees() {
    await rafraichirRef.current?.(true);
  }

  const [
    chargement,
    setChargement,
  ] = useState(true);

  const [
    erreur,
    setErreur,
  ] = useState<string | null>(null);

  // Sous-menu actif : À traiter / Corrections demandées /
  // En attente de validation / Validées.
  const [
    ongletLivraisons,
    setOngletLivraisons,
  ] = useState("toutes");

  const [recherche, setRecherche] = useState("");
  const [filtreClient, setFiltreClient] = useState("");
  const [filtreMission, setFiltreMission] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("");
  const [filtreMethode, setFiltreMethode] = useState("");

  // ==========================================================
  // RÔLE RÉEL DE L'UTILISATEUR
  // ==========================================================

  const role =
    utilisateur?.role === "client"
      ? "client"
      : utilisateur?.role === "etudiant"
        ? "etudiant"
        : null;

  // ==========================================================
  // CHARGEMENT INITIAL
  // ==========================================================

  useEffect(() => {
    // Attendre que AuthContext ait terminé
    // de restaurer la session utilisateur.
    if (
      chargementAuth ||
      !utilisateur ||
      !role
    ) {
      return;
    }

    let cancelled = false;

    async function chargerInitial(
      silencieux = false,
    ) {
      if (!silencieux) {
        setChargement(true);
      }
      setErreur(null);

      try {
        // ======================================================
        // CLIENT
        // ======================================================

        if (role === "client") {
          const [
            livraisonsData,
            paiementsData,
          ] = await Promise.all([
            api.get<Livraison[]>(
              "/livraisons/client/toutes",
            ),

            // Un échec du chargement des paiements (ex. erreur
            // réseau ponctuelle) ne doit pas masquer les
            // livraisons : on continue avec une liste vide.
            api
              .get<Transaction[]>(
                "/paiements/me",
              )
              .catch(
                () => [] as Transaction[],
              ),
          ]);

          if (cancelled) {
            return;
          }

          setLivraisons(livraisonsData);
          setPaiements(paiementsData);

          /*
           * Les candidatures sont déjà présentes
           * dans les livraisons renvoyées par le backend.
           */
          const candidaturesDepuisLivraisons =
            livraisonsData
              .map(
                (livraison) =>
                  livraison.candidature,
              )
              .filter(
                (
                  candidature,
                ): candidature is Candidature =>
                  Boolean(candidature),
              );

          setCandidatures(
            candidaturesDepuisLivraisons,
          );

          return;
        }

        // ======================================================
        // ÉTUDIANT
        // ======================================================

        const [
          candidaturesData,
          livraisonsData,
          paiementsData,
        ] = await Promise.all([
          api.get<Candidature[]>(
            "/candidatures/me",
          ),

          api.get<Livraison[]>(
            "/livraisons/me",
          ),

          // Paiements reçus (RG-066) : l'étudiant a besoin de
          // savoir si le paiement de la mission est confirmé
          // pour savoir quand il peut évaluer son client.
          // Un échec ne doit pas masquer les livraisons.
          api
            .get<Transaction[]>(
              "/paiements/recus",
            )
            .catch(
              () => [] as Transaction[],
            ),
        ]);

        if (cancelled) {
          return;
        }

        setCandidatures(
          candidaturesData,
        );

        setLivraisons(
          livraisonsData,
        );

        setPaiements(paiementsData);
      } catch (error) {
        console.error(
          "Erreur lors du chargement des livraisons :",
          error,
        );

        if (!cancelled) {
          setErreur(
            error instanceof ApiError
              ? error.message
              : t("loadError"),
          );
        }
      } finally {
        if (!cancelled && !silencieux) {
          setChargement(false);
        }
      }
    }

    // Le rafraîchissement silencieux réutilise le même chargeur ;
    // le garde "cancelled" du rendu d'effet courant neutralise les
    // mises à jour d'état après démontage ou changement de session.
    rafraichirRef.current = chargerInitial;

    void chargerInitial();

    return () => {
      cancelled = true;
    };
  }, [
    chargementAuth,
    utilisateur,
    role,
    t,
  ]);

  // ==========================================================
  // CALCULS
  // Aucun Hook ici.
  // ==========================================================

  const candidaturesFiltrees =
    role === "client"
      ? candidatures
      : candidatures.filter(
          (candidature) =>
            candidature.statut ===
            "acceptee",
        );

  // Catégorie de sous-menu correspondant à la livraison (ou son
  // absence) d'une candidature. Sert uniquement à filtrer la liste
  // affichée : la sélection (candidatureSelectionnee) reste calculée
  // sur l'ensemble complet pour ne pas casser les liens venant des
  // notifications.
  function categorieLivraison(
    candidature: Candidature,
  ): "a_traiter" | "corrections" | "attente_validation" | "validees" {
    const livraison = livraisons.find(
      (item) => item.candidatureId === candidature.id,
    );

    if (!livraison) return "a_traiter";
    if (livraison.statut === "correction_demandee") return "corrections";
    if (livraison.statut === "validee") return "validees";
    return "attente_validation";
  }

  const compteLivraisons = {
    a_traiter: candidaturesFiltrees.filter(
      (c) => categorieLivraison(c) === "a_traiter",
    ).length,
    corrections: candidaturesFiltrees.filter(
      (c) => categorieLivraison(c) === "corrections",
    ).length,
    attente_validation: candidaturesFiltrees.filter(
      (c) => categorieLivraison(c) === "attente_validation",
    ).length,
    validees: candidaturesFiltrees.filter(
      (c) => categorieLivraison(c) === "validees",
    ).length,
  };

  function livraisonPour(candidature: Candidature) {
    return livraisons.find((item) => item.candidatureId === candidature.id);
  }

  function methodeLivraison(livraison: Livraison | undefined) {
    if (livraison?.piecesJointes?.length) return "fichiers";
    if (livraison?.lienLivrable?.toLowerCase().includes("gitlab.com")) return "gitlab";
    if (livraison?.lienLivrable) return "github";
    return "";
  }

  // Identité de l'autre partie affichée sur chaque ligne / le panneau
  // de détail : l'étudiant pour un client, le client pour un étudiant.
  function infosAutrePersonne(candidature: Candidature) {
    if (role === "client") {
      return {
        nom: candidature.etudiant?.utilisateur?.nom ?? t("student"),
        photoUrl: candidature.etudiant?.utilisateur?.photoUrl ?? null,
        label: t("student"),
      };
    }
    return {
      nom:
        candidature.mission?.client?.utilisateur?.nom ??
        candidature.mission?.client?.nomEntreprise ??
        t("client"),
      photoUrl: candidature.mission?.client?.utilisateur?.photoUrl ?? null,
      label: t("client"),
    };
  }

  const candidaturesAvecFiltres = candidaturesFiltrees.filter((candidature) => {
    const livraison = livraisonPour(candidature);
    const client = candidature.mission?.client?.utilisateur?.nom ?? candidature.mission?.client?.nomEntreprise ?? "";
    const mission = candidature.mission?.titre ?? "";
    const texte = `${client} ${mission} ${candidature.missionId} ${livraison?.id ?? ""}`.toLowerCase();
    return (
      (!recherche.trim() || texte.includes(recherche.trim().toLowerCase())) &&
      (!filtreClient || client === filtreClient) &&
      (!filtreMission || mission === filtreMission) &&
      (!filtreStatut || livraison?.statut === filtreStatut) &&
      (!filtreMethode || methodeLivraison(livraison) === filtreMethode)
    );
  });

  const candidaturesAffichees =
    ongletLivraisons === "toutes"
      ? candidaturesAvecFiltres
      : candidaturesAvecFiltres.filter(
          (c) => categorieLivraison(c) === ongletLivraisons,
        );

  // Contrairement à l'ancienne disposition « maître-détail » (liste +
  // détail toujours visibles côte à côte), l'écran de détail n'est
  // affiché que si une candidature est explicitement demandée via
  // l'URL (clic sur « Voir » ou lien depuis une notification). Sans
  // paramètre, l'écran liste (cartes stats + tableau) reste affiché.
  const candidatureSelectionnee = candidatureParam
    ? (candidaturesFiltrees.find(
        (candidature) => candidature.id === candidatureParam,
      ) ?? candidaturesFiltrees[0] ?? null)
    : null;

  const livraisonSelectionnee =
    candidatureSelectionnee
      ? livraisons.find(
          (livraison) =>
            livraison.candidatureId ===
            candidatureSelectionnee.id,
        ) ?? null
      : null;

  // ==========================================================
  // CHARGEMENT DE LA SESSION
  // ==========================================================

  if (chargementAuth) {
    return (
      <div>
        <p className="text-sm text-ink-soft">
          {t("checkingSession")}
        </p>
      </div>
    );
  }

  // ==========================================================
  // UTILISATEUR NON CONNECTÉ
  // ==========================================================

  if (!utilisateur) {
    return (
      <div>
        <NoticeCard>
          <p className="text-sm text-ink-soft">
            {t("mustLogin")}
          </p>

          <Link
            href="/connexion"
            className="mt-4 inline-block"
          >
            <Button
              size="sm"
              variant="secondary"
            >
              {t("login")}
            </Button>
          </Link>
        </NoticeCard>
      </div>
    );
  }

  // ==========================================================
  // ADMIN / RÔLE NON AUTORISÉ
  // ==========================================================

  if (!role) {
    return (
      <div>
        <NoticeCard>
          <p className="text-sm text-brique">
            {t("notAllowed")}
          </p>
        </NoticeCard>
      </div>
    );
  }

  // ==========================================================
  // AFFICHAGE
  // ==========================================================

  // ==========================================================
  // ÉCRAN DE DÉTAIL (une livraison sélectionnée via l'URL)
  // ==========================================================

  if (candidatureSelectionnee) {
    const infos = infosAutrePersonne(candidatureSelectionnee);

    return (
      <div>
        {/* FIL D'ARIANE + RETOUR */}

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <nav
            aria-label={t("breadcrumb")}
            className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-ink-soft"
          >
            <Link
              href="/tableau-de-bord/livraisons"
              className="hover:text-ink hover:underline"
            >
              {t("breadcrumbDeliveries")}
            </Link>
            <ChevronRight size={13} aria-hidden="true" />
            <span className="text-ink">{t("detail")}</span>
          </nav>

          <BoutonRetour
            label={t("back")}
            repli="/tableau-de-bord/livraisons"
            forcer
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
          {/* CONTENU PRINCIPAL */}

          <div>
            {role === "client" ? (
              livraisonSelectionnee ? (
                <LivraisonClient
                  key={candidatureSelectionnee.id}
                  candidature={candidatureSelectionnee}
                  livraison={livraisonSelectionnee}
                  paiements={paiements}
                  onRafraichir={rafraichirDonnees}
                />
              ) : (
                <NoticeCard>
                  <p className="text-sm text-ink-soft">
                    {t("noneSubmitted")}
                  </p>
                </NoticeCard>
              )
            ) : (
              <LivraisonEtudiant
                key={candidatureSelectionnee.id}
                candidature={candidatureSelectionnee}
                livraison={livraisonSelectionnee}
                paiements={paiements}
                onRafraichir={rafraichirDonnees}
              />
            )}
          </div>

          {/* PANNEAU LATÉRAL — DÉTAILS DE LA MISSION */}

          <div className="flex flex-col gap-5">
            <NoticeCard>
              <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">
                {t("missionDetails")}
              </p>

              <Link
                href={`/missions/${candidatureSelectionnee.missionId}`}
                className="mt-3 block"
              >
                <Button size="sm" variant="ghost" className="w-full">
                  {t("viewMission")}
                </Button>
              </Link>

              <div className="mt-4 space-y-3 border-t border-ink/15 pt-4 text-sm">
                <div className="flex items-center gap-2">
                  <Wallet size={15} className="shrink-0 text-ink-soft" aria-hidden="true" />
                  <span>{formatArgent(candidatureSelectionnee.prixPropose)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Timer size={15} className="shrink-0 text-ink-soft" aria-hidden="true" />
                  <span>
                    {t("deliveryIn", {
                      count: candidatureSelectionnee.delaiPropose,
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Avatar
                    nom={infos.nom}
                    photoUrl={infos.photoUrl}
                    size={22}
                  />
                  <span>
                    {infos.label} : {infos.nom}
                  </span>
                </div>
              </div>

              {livraisonSelectionnee && (
                <div className="mt-4 border-t border-ink/15 pt-4">
                  <p className="mb-2 text-xs text-ink-soft">
                    {t("deliveryStatus")}
                  </p>
                  <Tag
                    tone={
                      livraisonSelectionnee.statut === "validee"
                        ? "rice"
                        : livraisonSelectionnee.statut === "correction_demandee"
                          ? "brique"
                          : "ocre"
                    }
                  >
                    {libelleStatutLivraison(livraisonSelectionnee.statut)}
                  </Tag>
                </div>
              )}
            </NoticeCard>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================
  // ÉCRAN LISTE
  // ==========================================================

  return (
    <div>

      <PageHeader
        icon={
          role === "client"
            ? Users
            : Package
        }
        eyebrow={
          role === "client"
            ? t("clientSpace")
            : t("studentSpace")
        }
        title={
          role === "client"
            ? t("receivedDeliveries")
            : t("myDeliveries")
        }
      />

      {/* ========================================================
          ERREUR
          ======================================================== */}

      {erreur && (
        <NoticeCard className="mb-6">
          <p className="text-sm text-brique">
            {erreur}
          </p>
        </NoticeCard>
      )}

      {/* ========================================================
          CARTES STATISTIQUES
          ======================================================== */}

      {!chargement && candidaturesFiltrees.length > 0 && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => setOngletLivraisons("a_traiter")}
            className="text-left"
          >
            <StatCard
              icon={Package}
              tone="ink"
              label={t("toProcess")}
              value={compteLivraisons.a_traiter}
              sublabel={t("deliveriesToSend")}
            />
          </button>

          <button
            type="button"
            onClick={() => setOngletLivraisons("corrections")}
            className="text-left"
          >
            <StatCard
              icon={XCircle}
              tone="brique"
              label={t("correctionsRequested")}
              value={compteLivraisons.corrections}
              sublabel={t("toRedo")}
            />
          </button>

          <button
            type="button"
            onClick={() => setOngletLivraisons("attente_validation")}
            className="text-left"
          >
            <StatCard
              icon={Clock}
              tone="ocre"
              label={t("awaitingValidation")}
              value={compteLivraisons.attente_validation}
              sublabel={t("atClient")}
            />
          </button>

          <button
            type="button"
            onClick={() => setOngletLivraisons("validees")}
            className="text-left"
          >
            <StatCard
              icon={CheckCircle}
              tone="rice"
              label={t("validatedDeliveries")}
              value={compteLivraisons.validees}
              sublabel={t("completed")}
            />
          </button>
        </div>
      )}

      {/* ========================================================
          FILTRES
          ======================================================== */}

      {!chargement && candidaturesFiltrees.length > 0 && (
        <div className="mb-6 grid gap-3 rounded-xl border border-ink/15 bg-paper p-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft/60"
              aria-hidden="true"
            />
            <Input
              value={recherche}
              onChange={(event) => setRecherche(event.target.value)}
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchLabel")}
              className="pl-9 text-sm sm:text-base"
            />
          </div>
          <Select value={filtreClient} onChange={(event) => setFiltreClient(event.target.value)} aria-label={t("filterClient")}>
            <option value="" disabled hidden>{t("allClients")}</option>
            {Array.from(new Set(candidaturesFiltrees.map((c) => c.mission?.client?.utilisateur?.nom ?? c.mission?.client?.nomEntreprise ?? t("client")))).map((client) => <option key={client} value={client}>{client}</option>)}
          </Select>
          <Select value={filtreMission} onChange={(event) => setFiltreMission(event.target.value)} aria-label={t("filterMission")}>
            <option value="" disabled hidden>{t("allMissions")}</option>
            {Array.from(new Set(candidaturesFiltrees.map((c) => c.mission?.titre ?? t("mission")))).map((mission) => <option key={mission} value={mission}>{mission}</option>)}
          </Select>
          <Select value={filtreStatut} onChange={(event) => setFiltreStatut(event.target.value)} aria-label={t("filterStatus")}>
            <option value="" disabled hidden>{t("allStatuses")}</option>
            {["en_attente", "validee", "correction_demandee"].map((valeur) => <option key={valeur} value={valeur}>{libelleStatutLivraison(valeur)}</option>)}
          </Select>
          <Select value={filtreMethode} onChange={(event) => setFiltreMethode(event.target.value)} aria-label={t("filterMethod")}>
            <option value="" disabled hidden>{t("allMethods")}</option>
            <option value="github">GitHub</option>
            <option value="gitlab">GitLab</option>
            <option value="fichiers">{t("files")}</option>
          </Select>
        </div>
      )}

      {/* ========================================================
          CHARGEMENT DES DONNÉES
          ======================================================== */}

      {chargement ? (
        <p className="text-sm text-ink-soft">
          {t("loadingDeliveries")}
        </p>
      ) : candidaturesFiltrees.length ===
        0 ? (
        <NoticeCard>
          <p className="text-sm text-ink-soft">
            {role === "client"
              ? t("emptyClient")
              : t("emptyStudent")}
          </p>

          <Link
            href={
              role === "client"
                ? "/tableau-de-bord/mes-missions"
                : "/tableau-de-bord/candidatures"
            }
            className="mt-4 inline-block"
          >
            <Button
              size="sm"
              variant="ghost"
            >
              {role === "client"
                ? t("viewMyMissions")
                : t("viewMyApplications")}
            </Button>
          </Link>
        </NoticeCard>
      ) : (
        <>
          <SousNavigation
            onglets={[
              {
                valeur: "toutes",
                label: t("all"),
                compte: candidaturesFiltrees.length,
              },
              {
                valeur: "a_traiter",
                label: t("toProcess"),
                compte: compteLivraisons.a_traiter,
              },
              {
                valeur: "corrections",
                label: t("correctionsRequested"),
                compte: compteLivraisons.corrections,
              },
              {
                valeur: "attente_validation",
                label: t("awaitingValidation"),
                compte: compteLivraisons.attente_validation,
              },
              {
                valeur: "validees",
                label: t("validated"),
                compte: compteLivraisons.validees,
              },
            ]}
            actif={ongletLivraisons}
            onChanger={setOngletLivraisons}
          />

          {/* ====================================================
              LISTE (lignes façon tableau)
              ==================================================== */}

          <div className="flex flex-col gap-3">
            {candidaturesAffichees.length === 0 && (
              <NoticeCard>
                <p className="text-sm text-ink-soft">
                  {t("noneInCategory")}
                </p>
              </NoticeCard>
            )}

            {candidaturesAffichees.map((candidature) => {
              const livraison = livraisonPour(candidature);
              const infos = infosAutrePersonne(candidature);
              const methode = methodeLivraison(livraison);

              return (
                <NoticeCard
                  key={candidature.id}
                  className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-center">
                    {/* PERSONNE */}
                    <div className="flex items-center gap-3 sm:w-44 sm:shrink-0">
                      <Avatar nom={infos.nom} photoUrl={infos.photoUrl} size={36} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{infos.nom}</p>
                        <p className="text-xs text-ink-soft">{infos.label}</p>
                      </div>
                    </div>

                    {/* MISSION */}
                    <div className="min-w-0 sm:flex-1">
                      <p className="truncate text-sm font-medium">
                        {candidature.mission?.titre ?? t("mission")}
                      </p>
                      {candidature.mission?.categorie && (
                        <Tag tone="ink">{libelleCategorie(candidature.mission.categorie)}</Tag>
                      )}
                    </div>

                    {/* MÉTHODE */}
                    <div className="flex items-center gap-1.5 text-xs text-ink-soft sm:w-32 sm:shrink-0">
                      {(methode === "github" || methode === "gitlab") && (
                        <FolderGit2 size={14} aria-hidden="true" />
                      )}
                      {methode === "fichiers" && <FileUp size={14} aria-hidden="true" />}
                      <span>
                        {methode === "github"
                          ? `GitHub${livraison?.branche ? ` · ${livraison.branche}` : ""}`
                          : methode === "gitlab"
                            ? `GitLab${livraison?.branche ? ` · ${livraison.branche}` : ""}`
                            : methode === "fichiers"
                              ? t("filesCount", { count: livraison?.piecesJointes?.length ?? 0 })
                              : "—"}
                      </span>
                    </div>

                    {/* DATE */}
                    <div className="text-xs text-ink-soft sm:w-20 sm:shrink-0">
                      {formatDateCourte(
                        livraison?.dateLivraison ?? candidature.dateCandidature,
                      )}
                    </div>

                    {/* STATUT */}
                    <div className="sm:w-40 sm:shrink-0">
                      <Tag
                        tone={
                          !livraison
                            ? "ink"
                            : livraison.statut === "validee"
                              ? "rice"
                              : livraison.statut === "correction_demandee"
                                ? "brique"
                                : "ocre"
                        }
                      >
                        {livraison ? libelleStatutLivraison(livraison.statut) : t("noDelivery")}
                      </Tag>
                    </div>
                  </div>

                  <Link
                    href={`/tableau-de-bord/livraisons?candidature=${encodeURIComponent(candidature.id)}`}
                    className="shrink-0"
                  >
                    <Button size="sm" variant="ghost">
                      {t("see")}
                    </Button>
                  </Link>
                </NoticeCard>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
