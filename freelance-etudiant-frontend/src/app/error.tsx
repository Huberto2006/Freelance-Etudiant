"use client";

import { Button } from "@/components/ui/Button";
import { useTranslations } from "next-intl";

/** Frontière d'erreur traduite : propose de réessayer sans perdre la page. */
export default function ErreurPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors.crash");

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-5 py-16 text-center">
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        {t("title")}
      </h1>
      <p className="mt-2 text-sm text-ink-soft">{t("text")}</p>
      <Button variant="secondary" onClick={reset} className="mt-6">
        {t("retry")}
      </Button>
    </main>
  );
}
