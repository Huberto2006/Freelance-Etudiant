"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Building2, BriefcaseBusiness } from "lucide-react";
import { api } from "@/lib/api";
import type { ClientProfile, Mission } from "@/lib/types";
import { formatArgent } from "@/lib/format";
import { NoticeCard, Tag } from "@/components/ui/Notice";
import { ReactionProfil } from "@/components/ui/ReactionProfil";
import { SignalerBouton } from "@/components/ui/SignalerBouton";

export default function ProfilClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<ClientProfile>(`/clients/${id}`, { auth: false }),
      api.get<Mission[]>(`/missions`, { auth: false }),
    ])
      .then(([profil, toutesMissions]) => {
        setClient(profil);
        setMissions(toutesMissions.filter((m) => m.clientId === id));
      })
      .finally(() => setChargement(false));
  }, [id]);

  if (chargement) {
    return <p className="mx-auto max-w-3xl px-5 py-16 text-sm text-ink-soft">Chargement…</p>;
  }

  if (!client) {
    return (
      <p className="mx-auto max-w-3xl px-5 py-16 text-sm text-brique">
        Profil introuvable.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div className="flex items-start gap-5">
          <span
            className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-ocre/10 text-ocre-dark"
            aria-hidden="true"
          >
            <Building2 size={28} />
          </span>
          <div>
            <h1 className="font-display text-3xl font-semibold">
              {client.nomEntreprise || client.utilisateur?.nom}
            </h1>
            <p className="text-sm text-ink-soft mt-1">
              {client.typeClient === "entreprise" ? "Entreprise" : "Particulier"}
            </p>
            <p className="text-xs text-ink-soft/70 mt-1 font-mono">
              {missions.length} mission(s) publiée(s)
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <ReactionProfil utilisateurId={id} />
          <SignalerBouton cibleType="utilisateur" cibleId={id} />
        </div>
      </div>

      <div>
        <h2 className="font-display text-lg font-semibold mb-4">
          Missions publiées
        </h2>
        {missions.length === 0 ? (
          <p className="text-sm text-ink-soft/70">
            Aucune mission publiée pour le moment.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {missions.map((mission) => (
              <Link key={mission.id} href={`/missions/${mission.id}`}>
                <NoticeCard className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-ocre-dark">
                    <BriefcaseBusiness size={14} />
                    <p className="font-display font-medium">{mission.titre}</p>
                  </div>
                  <p className="font-mono text-sm text-ink-soft">
                    {formatArgent(mission.budget)}
                  </p>
                  <Tag tone="ink">{mission.statut.replace("_", " ")}</Tag>
                </NoticeCard>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
