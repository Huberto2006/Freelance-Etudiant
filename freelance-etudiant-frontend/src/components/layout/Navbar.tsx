"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { LogOut, User, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

import { useAuth, roleLabel } from "@/lib/auth-context";
import { getFileUrl } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { BasculeTheme } from "@/components/ui/BasculeTheme";
import { NotificationBell } from "@/components/ui/NotificationBell";
import {
  liensNavbarParRole,
  liensNavbarPublics,
} from "@/lib/nav-links";

export function Navbar() {
  const { utilisateur, deconnecter, chargement } = useAuth();
  const pathname = usePathname();

  const [menuOuvert, setMenuOuvert] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const liens = utilisateur
    ? liensNavbarParRole[utilisateur.role]
    : liensNavbarPublics;

  /**
   * Fermer le menu si on clique en dehors
   */
  useEffect(() => {
    function fermerMenu(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setMenuOuvert(false);
      }
    }

    document.addEventListener("mousedown", fermerMenu);

    return () => {
      document.removeEventListener("mousedown", fermerMenu);
    };
  }, []);

  /**
   * Déconnexion
   */
  function handleDeconnexion() {
    setMenuOuvert(false);
    deconnecter();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-ink/15 bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">

        {/* ===================================================== */}
        {/* LOGO */}
        {/* ===================================================== */}

        <Link
          href={utilisateur ? "/tableau-de-bord" : "/"}
          className="flex items-center gap-2"
        >
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-rice font-mono text-xs font-bold text-rice"
            aria-hidden="true"
          >
            K
          </span>

          <span className="font-display text-xl font-semibold tracking-tight">
            Kianja
          </span>
        </Link>

        {/* ===================================================== */}
        {/* NAVIGATION */}
        {/* ===================================================== */}

        <nav className="hidden items-center gap-6 md:flex">
          {liens.map((lien) => (
            <Link
              key={lien.href}
              href={lien.href}
              className={clsx(
                "font-body text-sm transition-colors hover:text-ocre-dark",
                pathname?.startsWith(lien.href)
                  ? "font-medium text-ocre-dark"
                  : "text-ink-soft",
              )}
            >
              {lien.label}
            </Link>
          ))}
        </nav>

        {/* ===================================================== */}
        {/* PARTIE DROITE */}
        {/* ===================================================== */}

        <div className="flex items-center gap-3">
          <BasculeTheme />

          {chargement ? null : utilisateur ? (
            <div className="flex items-center gap-3 border-l border-ink/15 pl-4">

              {/* Notification */}
              <NotificationBell />

              {/* ================================================= */}
              {/* PROFIL + MENU */}
              {/* ================================================= */}

              <div
                ref={menuRef}
                className="relative"
              >
                <button
                  type="button"
                  onClick={() => setMenuOuvert((ouvert) => !ouvert)}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-ink/5"
                  aria-expanded={menuOuvert}
                  aria-haspopup="menu"
                >
                  {/* Avatar */}
                  <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-ocre/10 text-ocre-dark">
                    {utilisateur.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getFileUrl(utilisateur.photoUrl) ?? undefined}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User size={16} />
                    )}
                  </div>

                  {/* Nom + rôle */}
                  <div className="hidden flex-col text-left leading-tight sm:flex">
                    <span className="text-sm text-ink">
                      {utilisateur.nom}
                    </span>

                    <span className="text-[11px] font-mono uppercase tracking-wider text-ink-soft/70">
                      {roleLabel(utilisateur.role)}
                    </span>
                  </div>

                  <ChevronDown
                    size={15}
                    className={clsx(
                      "hidden transition-transform sm:block",
                      menuOuvert && "rotate-180",
                    )}
                  />
                </button>

                {/* ================================================= */}
                {/* MENU PROFIL */}
                {/* ================================================= */}

                {menuOuvert && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-ink/10 bg-paper shadow-lg"
                  >
                    {/* Informations utilisateur */}
                    <div className="border-b border-ink/10 px-4 py-3">
                      <p className="truncate text-sm font-medium text-ink">
                        {utilisateur.nom}
                      </p>

                      <p className="truncate text-xs text-ink-soft">
                        {utilisateur.email}
                      </p>
                    </div>

                    {/* Tableau de bord */}
                    <Link
                      href="/tableau-de-bord"
                      onClick={() => setMenuOuvert(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink"
                      role="menuitem"
                    >
                      <User size={16} />
                      Mon profil
                    </Link>

                    {/* Déconnexion */}
                    <button
                      type="button"
                      onClick={handleDeconnexion}
                      className="flex w-full items-center gap-3 border-t border-ink/10 px-4 py-3 text-left text-sm text-brique transition-colors hover:bg-brique/5"
                      role="menuitem"
                    >
                      <LogOut size={16} />
                      Se déconnecter
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ===================================================== */
            /* UTILISATEUR NON CONNECTÉ */
            /* ===================================================== */

            <div className="flex items-center gap-2 border-l border-ink/15 pl-4">

              {/* Connexion */}
              <Link href="/connexion">
                <Button
                  variant="ghost"
                  size="sm"
                  title="Se connecter"
                  aria-label="Se connecter"
                >
                  <User size={17} />
                </Button>
              </Link>

              {/* Inscription */}
              <Link href="/inscription">
                <Button
                  variant="primary"
                  size="sm"
                  title="Rejoindre"
                  aria-label="Rejoindre"
                >
                  +
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}