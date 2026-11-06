import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Lien « Retour au site » des pages de connexion et d'inscription, qui
 * n'affichent ni Navbar ni Footer : c'est la sortie explicite vers l'accueil.
 */
export function LienRetourSite({ className = "" }: { className?: string }) {
  const t = useTranslations("auth.shared");

  return (
    <Link
      href="/"
      className={`inline-flex w-fit items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink ${className}`}
    >
      <ArrowLeft size={16} aria-hidden="true" />
      {t("backToSite")}
    </Link>
  );
}
