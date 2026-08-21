"use client";

import { useCallback, useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Transaction } from "@/lib/types";
import {
  formatArgent,
  formatDateCourte,
  methodePaiementLabel,
  statutTransactionLabel,
} from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { NoticeCard, PageHeader, Tag } from "@/components/ui/Notice";

const toneParStatut: Record<string, "ocre" | "rice" | "brique" | "ink"> = {
  en_attente: "ocre",
  confirmee: "rice",
  liberee: "rice",
  annulee: "brique",
};

export default function AdminPaiementsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState<string | null>(null);

  const charger = useCallback(() => {
    setChargement(true);
    api
      .get<Transaction[]>("/paiements")
      .then(setTransactions)
      .finally(() => setChargement(false));
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  async function confirmer(id: string) {
    setEnCours(id);
    setErreur(null);
    try {
      await api.patch(`/paiements/${id}/confirmer`);
      charger();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : "Erreur");
    } finally {
      setEnCours(null);
    }
  }

  async function annuler(id: string) {
    setEnCours(id);
    setErreur(null);
    try {
      await api.patch(`/paiements/${id}/annuler`);
      charger();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : "Erreur");
    } finally {
      setEnCours(null);
    }
  }

  const enAttente = transactions.filter((t) => t.statut === "en_attente");
  const traitees = transactions.filter((t) => t.statut !== "en_attente");

  return (
    <div>
      <PageHeader icon={Wallet} eyebrow="Administration" title="Paiements" />
      {erreur && <p className="text-sm text-brique mb-4">{erreur}</p>}

      {chargement ? (
        <p className="text-sm text-ink-soft">Chargement…</p>
      ) : (
        <>
          <h2 className="font-display text-lg font-semibold mb-3">
            À vérifier ({enAttente.length})
          </h2>
          {enAttente.length === 0 ? (
            <NoticeCard className="mb-8">
              <p className="text-sm text-ink-soft/70">
                Aucun paiement en attente de vérification.
              </p>
            </NoticeCard>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 mb-8">
              {enAttente.map((t) => (
                <NoticeCard key={t.id} className="flex flex-col gap-2">
                  <p className="font-display font-medium">
                    {t.candidature?.mission?.titre ?? "Mission"}
                  </p>
                  <p className="text-xs font-mono text-ink-soft/70">
                    {methodePaiementLabel[t.methode]} · réf. {t.reference}
                  </p>
                  <p className="font-mono text-sm text-ocre-dark">
                    {formatArgent(t.montant)}
                  </p>
                  <div className="flex gap-2 mt-1">
                    <Button
                      variant="secondary"
                      disabled={enCours === t.id}
                      onClick={() => confirmer(t.id)}
                    >
                      Confirmer
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={enCours === t.id}
                      onClick={() => annuler(t.id)}
                    >
                      Annuler
                    </Button>
                  </div>
                </NoticeCard>
              ))}
            </div>
          )}

          <h2 className="font-display text-lg font-semibold mb-3">
            Historique
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {traitees.map((t) => (
              <NoticeCard key={t.id} className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display font-medium">
                    {t.candidature?.mission?.titre ?? "Mission"}
                  </p>
                  <Tag tone={toneParStatut[t.statut]}>
                    {statutTransactionLabel[t.statut]}
                  </Tag>
                </div>
                <p className="font-mono text-sm text-ocre-dark">
                  {formatArgent(t.montant)}
                </p>
                <p className="text-xs text-ink-soft/60">
                  {formatDateCourte(t.dateCreation)}
                </p>
              </NoticeCard>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
