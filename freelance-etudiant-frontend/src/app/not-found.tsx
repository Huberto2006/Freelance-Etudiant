import Link from "next/link";
import { getTranslations } from "next-intl/server";

/** Page 404 traduite (langue lue depuis le cookie par la config next-intl). */
export default async function NotFound() {
  const t = await getTranslations("errors.notFound");

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-5 py-16 text-center">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-ocre-dark">
        404
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">
        {t("title")}
      </h1>
      <p className="mt-2 text-sm text-ink-soft">{t("text")}</p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center justify-center rounded-lg border border-ink bg-ink px-4 py-2.5 text-sm font-medium text-paper-light transition-colors hover:bg-ink-soft"
      >
        {t("home")}
      </Link>
    </main>
  );
}
