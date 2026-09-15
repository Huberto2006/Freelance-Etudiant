"use client";

import { use, useEffect, useMemo, useState } from "react";
import { Check, Crown, Loader2, Search, UserPlus, Users, X } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { EtudiantProfile, Groupe } from "@/lib/types";
import { formatDate, roleMembreGroupeLabel } from "@/lib/format";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { NoticeCard, PageHeader, Tag } from "@/components/ui/Notice";
import { BoutonRetour } from "@/components/ui/BoutonRetour";

export default function GroupeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { utilisateur } = useAuth();

  const [groupe, setGroupe] = useState<Groupe | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  /**
   * Annuaire public des étudiants (GET /etudiants).
   *
   * GET /groupes/:id ne charge pas la relation membres.etudiant.utilisateur
   * (uniquement membres.etudiant) : le nom et la photo des membres ne sont
   * donc pas disponibles directement depuis le détail du groupe. On
   * réutilise l'annuaire public des étudiants, qui lui charge bien
   * utilisateur, pour résoudre ces informations d'affichage.
   */
  const [annuaire, setAnnuaire] = useState<EtudiantProfile[]>([]);

  const [afficherInvitation, setAfficherInvitation] = useState(false);

  const charger = async () => {
    setChargement(true);
    setErreur(null);

    try {
      const data = await api.get<Groupe>(`/groupes/${id}`);
      setGroupe(data);
    } catch (error) {
      console.error("Erreur lors du chargement du groupe :", error);

      setErreur(
        error instanceof ApiError
          ? error.message
          : "Impossible de charger ce groupe.",
      );
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    async function chargerAnnuaire() {
      try {
        const data = await api.get<EtudiantProfile[]>("/etudiants");
        if (!cancelled) setAnnuaire(data);
      } catch {
        // L'affichage retombe alors sur un nom générique.
      }
    }

    chargerAnnuaire();

    return () => {
      cancelled = true;
    };
  }, []);

  const annuaireParId = useMemo(() => {
    const map = new Map<string, EtudiantProfile>();
    for (const etudiant of annuaire) {
      map.set(etudiant.utilisateurId, etudiant);
    }
    return map;
  }, [annuaire]);

  function nomEtudiant(etudiantId: string): string {
    return annuaireParId.get(etudiantId)?.utilisateur?.nom ?? "Étudiant";
  }

  function photoEtudiant(etudiantId: string): string | null | undefined {
    return annuaireParId.get(etudiantId)?.utilisateur?.photoUrl;
  }

  const monMembre = groupe?.membres?.find(
    (m) => m.etudiantId === utilisateur?.id,
  );
  const estChef = monMembre?.role === "chef";

  /*
   * ==========================================================
   * CHARGEMENT / ERREURS
   * ==========================================================
   */

  if (chargement) {
    return (
      <p className="flex items-center gap-2 text-sm text-ink-soft">
        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        Chargement du groupe…
      </p>
    );
  }

  if (!groupe) {
    return (
      <div>
        <BoutonRetour repli="/tableau-de-bord/groupes" className="mb-6" />

        <NoticeCard>
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-full bg-brique/10 text-brique"
              aria-hidden="true"
            >
              <Users size={22} />
            </span>
            <p className="text-sm text-brique">
              {erreur ?? "Ce groupe est introuvable."}
            </p>
            <Button variant="secondary" size="sm" href="/tableau-de-bord/groupes">
              Retour à mes groupes
            </Button>
          </div>
        </NoticeCard>
      </div>
    );
  }

  const membres = groupe.membres ?? [];

  return (
    <div>
      <BoutonRetour repli="/tableau-de-bord/groupes" className="mb-6" />

      <PageHeader icon={Users} eyebrow="Espace étudiant" title={groupe.nom} />

      {erreur && (
        <NoticeCard className="mb-6">
          <p className="text-sm text-brique">{erreur}</p>
        </NoticeCard>
      )}

      {/* =====================================================
          INFORMATIONS DU GROUPE
          ===================================================== */}
      <NoticeCard className="mb-6">
        {groupe.description && (
          <p className="text-sm text-ink-soft">{groupe.description}</p>
        )}

        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-ink-soft/70">
          <p>Mission : {groupe.mission?.titre ?? "Aucune"}</p>
          {groupe.dateCreation && (
            <p>Créé le {formatDate(groupe.dateCreation)}</p>
          )}
        </div>
      </NoticeCard>

      {/* =====================================================
          MEMBRES
          ===================================================== */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-lg font-semibold">
          Membres ({membres.length})
        </h2>

        {estChef && (
          <Button
            size="sm"
            variant="secondary"
            className="gap-2"
            onClick={() => setAfficherInvitation((v) => !v)}
          >
            {afficherInvitation ? (
              <>
                <X size={15} />
                Fermer
              </>
            ) : (
              <>
                <UserPlus size={15} />
                Inviter un étudiant
              </>
            )}
          </Button>
        )}
      </div>

      <NoticeCard className="mb-6">
        <ul className="flex flex-col divide-y divide-ink/10">
          {membres.map((membre) => (
            <li
              key={membre.id}
              className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
            >
              <Avatar
                nom={nomEtudiant(membre.etudiantId)}
                photoUrl={photoEtudiant(membre.etudiantId)}
                size={36}
              />

              <p className="flex-1 truncate text-sm font-medium">
                {nomEtudiant(membre.etudiantId)}
                {membre.etudiantId === utilisateur?.id && (
                  <span className="ml-1 text-ink-soft/60">(vous)</span>
                )}
              </p>

              <Tag tone={membre.role === "chef" ? "ocre" : "ink"}>
                {membre.role === "chef" && (
                  <Crown size={11} className="mr-1 inline" aria-hidden="true" />
                )}
                {roleMembreGroupeLabel[membre.role]}
              </Tag>
            </li>
          ))}
        </ul>
      </NoticeCard>

      {/* =====================================================
          INVITATION
          ===================================================== */}
      {afficherInvitation && estChef && (
        <PanneauInvitation
          groupeId={groupe.id}
          annuaire={annuaire}
          membresActuels={membres.map((m) => m.etudiantId)}
          moiId={utilisateur?.id}
        />
      )}
    </div>
  );
}

/**
 * Panneau d'invitation : sélection d'un étudiant parmi l'annuaire public
 * (GET /etudiants), seule API existante permettant de rechercher des
 * étudiants. Aucun champ de recherche par nom n'existe côté backend : le
 * filtrage se fait donc côté client sur la liste déjà chargée.
 */
function PanneauInvitation({
  groupeId,
  annuaire,
  membresActuels,
  moiId,
}: {
  groupeId: string;
  annuaire: EtudiantProfile[];
  membresActuels: string[];
  moiId?: string;
}) {
  const [recherche, setRecherche] = useState("");
  const [envoiPourId, setEnvoiPourId] = useState<string | null>(null);
  const [invitesEnvoyes, setInvitesEnvoyes] = useState<Set<string>>(new Set());
  const [erreur, setErreur] = useState<string | null>(null);

  const candidats = annuaire.filter((etudiant) => {
    if (etudiant.utilisateurId === moiId) return false;
    if (membresActuels.includes(etudiant.utilisateurId)) return false;
    if (invitesEnvoyes.has(etudiant.utilisateurId)) return false;

    if (recherche.trim()) {
      const nom = etudiant.utilisateur?.nom?.toLowerCase() ?? "";
      return nom.includes(recherche.trim().toLowerCase());
    }

    return true;
  });

  async function inviter(etudiantId: string) {
    setErreur(null);
    setEnvoiPourId(etudiantId);

    try {
      await api.post(`/groupes/${groupeId}/invitations`, { etudiantId });
      setInvitesEnvoyes((prev) => new Set(prev).add(etudiantId));
    } catch (err) {
      console.error("Erreur lors de l'envoi de l'invitation :", err);

      setErreur(
        err instanceof ApiError ? err.message : "Erreur inattendue.",
      );
    } finally {
      setEnvoiPourId(null);
    }
  }

  return (
    <NoticeCard>
      <h3 className="font-display text-lg font-semibold">
        Inviter un étudiant
      </h3>

      {erreur && <p className="mt-2 text-sm text-brique">{erreur}</p>}

      <div className="relative mt-4">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft/60"
          aria-hidden="true"
        />
        <Input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher un étudiant par nom…"
          aria-label="Rechercher un étudiant"
          className="pl-9"
        />
      </div>

      <ul className="mt-4 flex max-h-80 flex-col divide-y divide-ink/10 overflow-y-auto">
        {candidats.length === 0 ? (
          <p className="py-4 text-sm text-ink-soft/70">
            Aucun étudiant disponible à inviter.
          </p>
        ) : (
          candidats.map((etudiant) => {
            const enCours = envoiPourId === etudiant.utilisateurId;

            return (
              <li
                key={etudiant.utilisateurId}
                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <Avatar
                  nom={etudiant.utilisateur?.nom ?? "Étudiant"}
                  photoUrl={etudiant.utilisateur?.photoUrl}
                  size={32}
                />

                <p className="flex-1 truncate text-sm">
                  {etudiant.utilisateur?.nom ?? "Étudiant"}
                </p>

                <Button
                  size="sm"
                  variant="ghost"
                  disabled={enCours}
                  onClick={() => inviter(etudiant.utilisateurId)}
                  className="gap-1.5"
                >
                  {enCours ? (
                    <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <UserPlus size={14} aria-hidden="true" />
                  )}
                  Inviter
                </Button>
              </li>
            );
          })
        )}

        {invitesEnvoyes.size > 0 && (
          <li className="flex items-center gap-2 pt-3 text-xs text-rice">
            <Check size={13} aria-hidden="true" />
            {invitesEnvoyes.size} invitation
            {invitesEnvoyes.size > 1 ? "s" : ""} envoyée
            {invitesEnvoyes.size > 1 ? "s" : ""}.
          </li>
        )}
      </ul>
    </NoticeCard>
  );
}
