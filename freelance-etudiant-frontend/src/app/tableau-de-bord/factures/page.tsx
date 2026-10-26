"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";

import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Facture } from "@/lib/types";
import { useTranslations } from "next-intl";
import { useFormats } from "@/i18n/use-formats";
import { useLabels } from "@/i18n/use-labels";

import { NoticeCard, PageHeader } from "@/components/ui/Notice";
import { BoutonRetour } from "@/components/ui/BoutonRetour";

export default function FacturesPage() {
  const { utilisateur } = useAuth();
  const t = useTranslations("invoices");
  const { argent, date } = useFormats();
  const { methodePaiement } = useLabels();

  const [factures, setFactures] = useState<Facture[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!utilisateur) return;
    let actif = true;

    async function charger() {
      try {
        const data = await api.get<Facture[]>("/factures");
        if (actif) setFactures(data);
      } catch (err) {
        if (actif) {
          setErreur(
            err instanceof ApiError
              ? err.message
              : t("list.loadError"),
          );
        }
      } finally {
        if (actif) setChargement(false);
      }
    }

    void charger();
    return () => {
      actif = false;
    };
  }, [utilisateur, t]);

  if (!utilisateur) return null;

  const estEtudiant = utilisateur.role === "etudiant";

  return (
    <div>
      <div className="mb-4">
        <BoutonRetour repli="/tableau-de-bord" forcer />
      </div>

      <PageHeader
        icon={FileText}
        eyebrow={t("list.eyebrow")}
        title={t("list.title")}
      />

      <p className="mb-5 text-sm text-ink-soft">
        {estEtudiant ? t("list.introStudent") : t("list.introClient")}
      </p>

      {chargement ? (
        <p className="text-sm text-ink-soft">{t("list.loading")}</p>
      ) : erreur ? (
        <NoticeCard>
          <p role="alert" className="text-sm text-brique">
            {erreur}
          </p>
        </NoticeCard>
      ) : factures.length === 0 ? (
        <NoticeCard>
          <p className="py-6 text-center text-sm text-ink-soft">
            {t("list.empty")}
          </p>
        </NoticeCard>
      ) : (
        <ul className="divide-y divide-ink/10 overflow-hidden rounded-xl border border-ink/10 bg-paper-light">
          {factures.map((f) => (
            <li key={f.id}>
              <Link
                href={`/tableau-de-bord/paiements/${f.transactionId}/facture`}
                className="flex flex-col gap-1 px-4 py-3.5 transition-colors hover:bg-ink/[0.03] sm:flex-row sm:items-center sm:justify-between sm:gap-6"
              >
                <div className="min-w-0">
                  <p className="font-mono text-xs text-ink-soft">
                    {f.numero}
                  </p>
                  <p className="truncate font-display font-medium text-ink">
                    {f.titreMission}
                  </p>
                  <p className="text-xs text-ink-soft">
                    {estEtudiant
                      ? t("list.paidBy", { nom: f.clientNom })
                      : t("list.provider", { nom: f.etudiantNom })}
                    {" · "}
                    {methodePaiement(f.methode)}
                  </p>
                </div>

                <div className="flex shrink-0 items-baseline justify-between gap-4 sm:flex-col sm:items-end sm:gap-0.5">
                  <p className="font-mono text-sm font-medium text-ink">
                    {argent(f.montant)}
                  </p>
                  <p className="text-xs text-ink-soft">
                    {date(f.dateEmission)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
