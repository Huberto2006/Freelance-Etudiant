"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { BasculeTheme } from "@/components/ui/BasculeTheme";

const liensPublics = [
  { href: "/missions", label: "Missions" },
  { href: "/services", label: "Services" },
];

export function Navbar() {
  const { utilisateur, deconnecter, chargement } = useAuth();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-ink/15 bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
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

        <nav className="hidden items-center gap-6 md:flex">
          {liensPublics.map((lien) => (
            <Link
              key={lien.href}
              href={lien.href}
              className={clsx(
                "font-body text-sm transition-colors hover:text-ocre-dark",
                pathname?.startsWith(lien.href) ? "text-ocre-dark font-medium" : "text-ink-soft",
              )}
            >
              {lien.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <BasculeTheme />
          {chargement ? null : utilisateur ? (
            <>
              <Link
                href="/tableau-de-bord"
                className="hidden text-sm text-ink-soft hover:text-ink sm:inline"
              >
                {utilisateur.nom}
              </Link>
              <Link href="/tableau-de-bord">
                <Button variant="secondary" size="sm">
                  Tableau de bord
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={deconnecter}>
                Quitter
              </Button>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </header>
  );
}
