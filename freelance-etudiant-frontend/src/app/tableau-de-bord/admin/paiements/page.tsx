"use client";

import { useCallback, useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Transaction } from "@/lib/types";
import { useTranslations } from "next-intl";
import { useFormats } from "@/i18n/use-formats";
import { useLabels } from "@/i18n/use-labels";
import { Button } from "@/components/ui/Button";
import { NoticeCard, PageHeader, Tag } from "@/components/ui/Notice";
import { BoutonRetour } from "@/components/ui/BoutonRetour";

const toneParStatut: Record<string, "ocre" | "rice" | "brique" | "ink"> = {
  en_attente: "ocre",
  confirmee: "rice",
  liberee: "rice",
  annulee: "brique",
};

export default function AdminPaiementsPage() {
  const t = useTranslations("payments");
  const { argent, dateCourte } = useFormats();
  const { methodePaiement, statutTransaction } = useLabels();
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
    // Differre l'appel hors du corps synchrone de l'effet (react-hooks/
    // set-state-in-effect) : charger() met a jour l'etat des son entree.
    void Promise.resolve().then(() => {
      charger();
    });
  }, [charger]);

  async function confirmer(id: string) {
    setEnCours(id);
    setErreur(null);
    try {
      await api.patch(`/paiements/${id}/confirmer`);
      charger();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : t("adminList.genericError"));
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
      setErreur(err instanceof ApiError ? err.message : t("adminList.genericError"));
    } finally {
      setEnCours(null);
    }
  }

  const enAttente = transactions.filter((x) => x.statut === "en_attente");
  const traitees = transactions.filter((x) => x.statut !== "en_attente");

  return (
    <div>
      <div className="mb-4">
        <BoutonRetour repli="/tableau-de-bord/admin" forcer />
      </div>

      <PageHeader icon={Wallet} eyebrow={t("adminList.eyebrow")} title={t("adminList.title")} />
      {erreur && <p className="text-sm text-brique mb-4">{erreur}</p>}

      {chargement ? (
        <p className="text-sm text-ink-soft">{t("adminList.loading")}</p>
      ) : (
        <>
          <h2 className="font-display text-lg font-semibold mb-3">
            {t("adminList.toVerify", { count: enAttente.length })}
          </h2>
          {enAttente.length === 0 ? (
            <NoticeCard className="mb-7">
              <p className="text-sm text-ink-soft/70">
                {t("adminList.noneToVerify")}
              </p>
            </NoticeCard>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 mb-7">
              {enAttente.map((x) => (
                <NoticeCard key={x.id} className="flex flex-col gap-2">
                  <p className="font-display font-medium">
                    {x.candidature?.mission?.titre ?? t("adminList.missionFallback")}
                  </p>
                  <p className="text-xs font-mono text-ink-soft/70">
                    {t("adminList.methodRef", {
                      methode: methodePaiement(x.methode),
                      reference: x.reference,
                    })}
                  </p>
                  <p className="font-mono text-sm text-ocre-dark">
                    {argent(x.montant)}
                  </p>
                  {x.provider === "papi" || x.provider === "mvola" ? (
                    <p className="mt-1 text-xs text-ink-soft">
                      {t("adminList.onlineAuto")}
                    </p>
                  ) : (
                    <div className="flex gap-2 mt-1">
                      <Button
                        variant="secondary"
                        disabled={enCours === x.id}
                        onClick={() => confirmer(x.id)}
                      >
                        {t("adminList.confirm")}
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={enCours === x.id}
                        onClick={() => annuler(x.id)}
                      >
                        {t("adminList.cancel")}
                      </Button>
                    </div>
                  )}
                </NoticeCard>
              ))}
            </div>
          )}

          <h2 className="font-display text-lg font-semibold mb-3">
            {t("adminList.history")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {traitees.map((x) => (
              <NoticeCard key={x.id} className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display font-medium">
                    {x.candidature?.mission?.titre ?? t("adminList.missionFallback")}
                  </p>
                  <Tag tone={toneParStatut[x.statut]}>
                    {statutTransaction(x.statut)}
                  </Tag>
                </div>
                <p className="font-mono text-sm text-ocre-dark">
                  {argent(x.montant)}
                </p>
                <p className="text-xs text-ink-soft/60">
                  {dateCourte(x.dateCreation)}
                </p>
              </NoticeCard>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
