"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Printer } from "lucide-react";

import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Facture } from "@/lib/types";
import {
  formatArgent,
  formatDate,
  methodePaiementLabel,
} from "@/lib/format";

import { Button } from "@/components/ui/Button";
import { NoticeCard } from "@/components/ui/Notice";
import { BoutonRetour } from "@/components/ui/BoutonRetour";

/**
 * Facture d'un paiement confirmé : feuille A4 imprimable. « Imprimer /
 * Enregistrer en PDF » ouvre la boîte d'impression du navigateur (choisir
 * « Enregistrer au format PDF »). Seule la feuille est imprimée (voir les
 * règles @media print de globals.css).
 */
export default function FacturePaiementPage() {
  const { utilisateur } = useAuth();
  const params = useParams<{ id: string }>();
  const idPaiement = params?.id;

  const [facture, setFacture] = useState<Facture | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    if (!utilisateur || !idPaiement) return;
    let actif = true;

    async function charger() {
      try {
        const data = await api.get<Facture>(`/paiements/${idPaiement}/facture`);
        if (actif) setFacture(data);
      } catch (err) {
        if (actif) {
          setErreur(
            err instanceof ApiError
              ? err.message
              : "Impossible de charger la facture.",
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
  }, [utilisateur, idPaiement]);

  // Active les règles d'impression propres à la facture.
  useEffect(() => {
    document.body.classList.add("impression-facture");
    return () => document.body.classList.remove("impression-facture");
  }, []);

  if (!utilisateur) return null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <BoutonRetour repli="/tableau-de-bord/factures" forcer />

        {facture && (
          <Button onClick={() => window.print()} className="gap-2">
            <Printer size={16} aria-hidden="true" />
            Imprimer / Enregistrer en PDF
          </Button>
        )}
      </div>

      {chargement ? (
        <p className="text-sm text-ink-soft">Chargement de la facture…</p>
      ) : erreur || !facture ? (
        <NoticeCard>
          <p role="alert" className="text-sm text-brique">
            {erreur ?? "Facture introuvable."}
          </p>
        </NoticeCard>
      ) : (
        <article
          id="facture-imprimable"
          aria-label={`Facture ${facture.numero}`}
          className="mx-auto w-full max-w-[52rem] rounded-xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm sm:p-10 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none"
        >
          {/* En-tête */}
          <header className="flex flex-col gap-6 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-display text-2xl font-bold">
                {facture.emetteurNom}
              </p>
              {facture.emetteurMention && (
                <p className="mt-1 max-w-xs whitespace-pre-line text-xs leading-relaxed text-slate-600">
                  {facture.emetteurMention}
                </p>
              )}
            </div>

            <div className="sm:text-right">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-slate-500">
                Facture
              </p>
              <p className="font-display text-2xl font-bold">
                {facture.numero}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Émise le {formatDate(facture.dateEmission)}
              </p>
            </div>
          </header>

          {/* Parties */}
          <section className="grid gap-6 py-6 sm:grid-cols-2">
            <div>
              <p className="mb-1 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-slate-500">
                Facturé à
              </p>
              <p className="font-medium">
                {facture.clientEntreprise || facture.clientNom}
              </p>
              {facture.clientEntreprise && (
                <p className="text-sm text-slate-600">{facture.clientNom}</p>
              )}
              <p className="text-sm text-slate-600">{facture.clientEmail}</p>
            </div>

            <div>
              <p className="mb-1 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-slate-500">
                Prestataire
              </p>
              <p className="font-medium">{facture.etudiantNom}</p>
              <p className="text-sm text-slate-600">
                Étudiant · via la plateforme {facture.emetteurNom}
              </p>
            </div>
          </section>

          {/* Détail */}
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-y border-slate-200 text-left font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-slate-500">
                <th className="py-2.5 pr-4 font-medium">Désignation</th>
                <th className="py-2.5 text-right font-medium">Montant</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-200 align-top">
                <td className="py-3.5 pr-4">
                  <p className="font-medium">{facture.titreMission}</p>
                  <p className="text-xs text-slate-600">
                    Prestation réalisée par {facture.etudiantNom}
                  </p>
                </td>
                <td className="py-3.5 text-right font-mono">
                  {formatArgent(facture.montant)}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td className="pt-4 pr-4 text-right font-medium">
                  Total payé
                </td>
                <td className="pt-4 text-right font-mono text-lg font-bold">
                  {formatArgent(facture.montant)}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Paiement */}
          <section className="mt-8 rounded-lg bg-slate-50 p-4 text-sm print:border print:border-slate-200 print:bg-white">
            <p className="mb-2 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-slate-500">
              Paiement
            </p>
            <dl className="grid gap-x-6 gap-y-1.5 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-slate-500">Moyen</dt>
                <dd>
                  {methodePaiementLabel[facture.methode] ?? facture.methode}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Référence</dt>
                <dd className="font-mono">{facture.referencePaiement}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Date de paiement</dt>
                <dd>{formatDate(facture.datePaiement)}</dd>
              </div>
            </dl>
          </section>

          <p className="mt-8 text-xs leading-relaxed text-slate-500">
            Facture acquittée : le paiement a été reçu et confirmé par la
            plateforme. Document généré automatiquement.
          </p>
        </article>
      )}
    </div>
  );
}
