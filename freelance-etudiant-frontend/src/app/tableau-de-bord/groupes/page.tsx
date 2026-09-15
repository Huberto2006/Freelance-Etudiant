"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Users, X } from "lucide-react";

import { api, ApiError } from "@/lib/api";
import type { Groupe, Mission } from "@/lib/types";

import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { NoticeCard, PageHeader } from "@/components/ui/Notice";

/**
 * Un groupe enrichi des informations affichées dans la liste (nombre de
 * membres, titre de la mission associée).
 *
 * GET /groupes/mes-groupes ne charge pas les relations `membres` et
 * `mission` (uniquement les colonnes du groupe). On complète donc chaque
 * groupe avec un appel à GET /groupes/:id, qui lui charge ces relations.
 */
type GroupeAffiche = Groupe & {
  nombreMembres?: number;
};

export default function GroupesPage() {
  const [groupes, setGroupes] = useState<GroupeAffiche[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [afficherFormulaire, setAfficherFormulaire] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);

    try {
      const base = await api.get<Groupe[]>("/groupes/mes-groupes");

      // Enrichissement : chaque groupe de la liste est complété avec ses
      // membres et sa mission via le détail, non fourni par mes-groupes.
      const enrichis = await Promise.all(
        base.map(async (groupe) => {
          try {
            const detail = await api.get<Groupe>(`/groupes/${groupe.id}`);
            return {
              ...groupe,
              membres: detail.membres,
              mission: detail.mission,
              nombreMembres: detail.membres?.length,
            } satisfies GroupeAffiche;
          } catch {
            // Le groupe reste affiché même si le détail échoue :
            // le compte de membres sera simplement masqué.
            return groupe as GroupeAffiche;
          }
        }),
      );

      setGroupes(enrichis);
    } catch (error) {
      console.error("Erreur lors du chargement des groupes :", error);

      setErreur(
        error instanceof ApiError
          ? error.message
          : "Impossible de charger vos groupes.",
      );
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  return (
    <div>
      {/* En-tête */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          icon={Users}
          eyebrow="Espace étudiant"
          title="Mes groupes"
          className="mb-0"
        />

        <Button
          variant="secondary"
          className="gap-2"
          onClick={() => setAfficherFormulaire((v) => !v)}
        >
          {afficherFormulaire ? (
            <>
              <X size={16} />
              Fermer
            </>
          ) : (
            <>
              <Plus size={16} />
              Créer un groupe
            </>
          )}
        </Button>
      </div>

      {/* Message d'erreur */}
      {erreur && (
        <NoticeCard className="mb-6">
          <p className="text-sm text-brique">{erreur}</p>
        </NoticeCard>
      )}

      {/* Formulaire de création */}
      {afficherFormulaire && (
        <div className="mb-8">
          <FormulaireGroupe
            onCree={async () => {
              setAfficherFormulaire(false);
              await charger();
            }}
          />
        </div>
      )}

      {/* Chargement */}
      {chargement ? (
        <p className="flex items-center gap-2 text-sm text-ink-soft">
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          Chargement de vos groupes…
        </p>
      ) : groupes.length === 0 ? (
        <NoticeCard>
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-full bg-ocre/10 text-ocre-dark"
              aria-hidden="true"
            >
              <Users size={22} />
            </span>
            <p className="text-sm text-ink-soft">
              Vous ne faites partie d&apos;aucun groupe pour le moment.
            </p>
            {!afficherFormulaire && (
              <Button
                variant="secondary"
                size="sm"
                className="gap-2"
                onClick={() => setAfficherFormulaire(true)}
              >
                <Plus size={14} aria-hidden="true" />
                Créer un groupe
              </Button>
            )}
          </div>
        </NoticeCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {groupes.map((groupe) => (
            <Link key={groupe.id} href={`/tableau-de-bord/groupes/${groupe.id}`}>
              <NoticeCard className="flex h-full flex-col gap-2 transition-colors hover:border-ink/30">
                <p className="font-display text-lg font-medium">{groupe.nom}</p>

                <p className="text-xs text-ink-soft/70">
                  {groupe.nombreMembres !== undefined
                    ? `${groupe.nombreMembres} membre${groupe.nombreMembres > 1 ? "s" : ""}`
                    : "Membres"}
                  {" · "}
                  {groupe.mission?.titre ?? "Sans mission"}
                </p>

                {groupe.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-ink-soft">
                    {groupe.description}
                  </p>
                )}
              </NoticeCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Formulaire de création d'un groupe.
 *
 * La mission est optionnelle : la liste proposée provient de GET
 * /missions (annuaire public des missions ouvertes), seule API existante
 * permettant de retrouver des missions côté frontend.
 */
function FormulaireGroupe({
  onCree,
}: {
  onCree: () => void | Promise<void>;
}) {
  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [missionId, setMissionId] = useState("");

  const [missions, setMissions] = useState<Mission[]>([]);

  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function chargerMissions() {
      try {
        const data = await api.get<Mission[]>("/missions");
        if (!cancelled) setMissions(data);
      } catch {
        // Le champ mission devient simplement indisponible ; la
        // création d'un groupe sans mission reste possible.
      }
    }

    chargerMissions();

    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setErreur(null);
    setEnvoi(true);

    try {
      await api.post("/groupes", {
        nom: nom.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(missionId ? { missionId } : {}),
      });

      await onCree();
    } catch (err) {
      console.error("Erreur lors de la création du groupe :", err);

      setErreur(
        err instanceof ApiError ? err.message : "Erreur inattendue.",
      );
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <NoticeCard>
      <h2 className="font-display text-xl font-semibold">Nouveau groupe</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Vous en serez automatiquement le chef et pourrez inviter d&apos;autres
        étudiants une fois le groupe créé.
      </p>

      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-5">
        {erreur && (
          <p className="text-sm text-brique">{erreur}</p>
        )}

        <Field label="Nom du groupe *" htmlFor="groupe-nom">
          <Input
            id="groupe-nom"
            required
            maxLength={150}
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Groupe Web"
            disabled={envoi}
          />
        </Field>

        <Field label="Description" htmlFor="groupe-description">
          <Textarea
            id="groupe-description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Décrivez l'objectif du groupe (facultatif)"
            disabled={envoi}
          />
        </Field>

        <Field label="Mission (optionnelle)" htmlFor="groupe-mission">
          <Select
            id="groupe-mission"
            value={missionId}
            onChange={(e) => setMissionId(e.target.value)}
            disabled={envoi}
          >
            <option value="">Aucune mission</option>
            {missions.map((mission) => (
              <option key={mission.id} value={mission.id}>
                {mission.titre}
              </option>
            ))}
          </Select>
        </Field>

        <div className="flex justify-end">
          <Button type="submit" disabled={envoi || !nom.trim()}>
            {envoi ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                Création…
              </span>
            ) : (
              "Créer le groupe"
            )}
          </Button>
        </div>
      </form>
    </NoticeCard>
  );
}
