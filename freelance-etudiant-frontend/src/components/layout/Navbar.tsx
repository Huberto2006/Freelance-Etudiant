"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { useAuth, roleLabel } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { BasculeTheme } from "@/components/ui/BasculeTheme";
import { liensNavbarParRole, liensNavbarPublics } from "@/lib/nav-links";

export function Navbar() {
  const { utilisateur, deconnecter, chargement } = useAuth();
  const pathname = usePathname();

  // La liste de liens depend du role de la personne connectee ; sans
  // utilisateur, on retombe sur les liens publics.
  const liens = utilisateur
    ? liensNavbarParRole[utilisateur.role]
    : liensNavbarPublics;

  return (
    <header className="sticky top-0 z-40 border-b border-ink/15 bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        {/* --- Identite de la marque --- */}
        <Link href="/" className="flex items-center gap-2">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-rice text-rice font-mono text-xs font-bold"
            aria-hidden="true"
          >
            K
          </span>
          <span className="font-display text-xl font-semibold tracking-tight">
            Kianja
          </span>
        </Link>

        {/* --- Navigation centrale, adaptee au role --- */}
        <nav className="hidden items-center gap-6 md:flex">
          {liens.map((lien) => (
            <Link
              key={lien.href}
              href={lien.href}
              className={clsx(
                "font-body text-sm transition-colors hover:text-ocre-dark",
                pathname?.startsWith(lien.href)
                  ? "text-ocre-dark font-medium"
                  : "text-ink-soft",
              )}
            >
              {lien.label}
            </Link>
          ))}
        </nav>

        {/* --- Groupe de droite : theme / identite / actions --- */}
        <div className="flex items-center gap-4">
          <BasculeTheme />

          {chargement ? null : utilisateur ? (
            <div className="flex items-center gap-3 border-l border-ink/15 pl-4">
              <Link
                href="/tableau-de-bord"
                className="hidden flex-col items-end leading-tight sm:flex"
              >
                <span className="text-sm text-ink hover:text-ocre-dark">
                  {utilisateur.nom}
                </span>
                <span className="text-[11px] font-mono uppercase tracking-wider text-ink-soft/70">
                  {roleLabel(utilisateur.role)}
                </span>
              </Link>
              <Link href="/tableau-de-bord">
                <Button variant="secondary" size="sm">
                  Tableau de bord
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={deconnecter}>
                Quitter
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 border-l border-ink/15 pl-4">
              <Link href="/connexion">
                <Button variant="ghost" size="sm">
                  Se connecter
                </Button>
              </Link>
              <Link href="/inscription">
                <Button variant="primary" size="sm">
                  Rejoindre
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
