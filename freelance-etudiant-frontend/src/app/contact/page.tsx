import type { Metadata } from "next";
import Link from "next/link";
import { CircleHelp, LifeBuoy } from "lucide-react";

import { EnTetePagePublique } from "@/components/layout/EnTetePagePublique";
import { FormulaireContact } from "@/components/contact/FormulaireContact";

export const metadata: Metadata = {
  title: "Contact et assistance — Kianja",
  description:
    "Une question ou un problème ? Écrivez à l'équipe Kianja grâce au formulaire de contact.",
};

export default function PageContact() {
  return (
    <div className="mx-auto max-w-5xl px-5 pb-8 pt-10 sm:pt-14">
      <EnTetePagePublique
        icon={LifeBuoy}
        eyebrow="Centre d'aide"
        titre="Contact et assistance"
        introduction="Une question, un souci avec votre compte ou une suggestion ? Écrivez-nous en remplissant le formulaire."
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <FormulaireContact />

        <aside className="h-fit rounded-2xl border border-ink/10 bg-paper-light p-5 shadow-xs">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-bleu-soft text-bleu-dark"
          >
            <CircleHelp size={18} />
          </span>
          <h2 className="mt-3 text-sm font-semibold text-ink">
            Avant d&apos;écrire
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            La réponse à votre question se trouve peut-être déjà dans la
            FAQ : inscription, candidatures, livraisons, paiements…
          </p>
          <Link
            href="/faq"
            className="mt-4 inline-flex items-center justify-center rounded-lg border border-ink/30 px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:border-ink hover:bg-ink/5"
          >
            Consulter la FAQ
          </Link>
        </aside>
      </div>
    </div>
  );
}
