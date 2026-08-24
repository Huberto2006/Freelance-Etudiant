"use client";

import Link from "next/link";
import { clsx } from "clsx";
import {
  LogOut,
  User,
  ChevronDown,
  LayoutDashboard,
} from "lucide-react";
import {
  useState,
  useRef,
  useEffect,
} from "react";

import {
  useAuth,
  roleLabel,
} from "@/lib/auth-context";

import { getFileUrl } from "@/lib/api";

import { Button } from "@/components/ui/Button";
import { BasculeTheme } from "@/components/ui/BasculeTheme";

export function Navbar() {
  const {
    utilisateur,
    deconnecter,
    chargement,
  } = useAuth();

  const [menuOuvert, setMenuOuvert] =
    useState(false);

  const menuRef =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    function fermerMenu(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(
          event.target as Node,
        )
      ) {
        setMenuOuvert(false);
      }
    }

    document.addEventListener(
      "mousedown",
      fermerMenu,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        fermerMenu,
      );
    };
  }, []);

  function handleDeconnexion() {
    setMenuOuvert(false);
    deconnecter();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-ink/15 bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2">

        {/* LOGO */}
        <Link
          href={
            utilisateur
              ? "/tableau-de-bord"
              : "/"
          }
          className="flex items-center gap-2"
        >
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-rice font-mono text-[10px] font-bold text-rice"
            aria-hidden="true"
          >
            K
          </span>

          <span className="font-display text-lg font-semibold tracking-tight">
            Kianja
          </span>
        </Link>

        {/* PARTIE DROITE */}
        <div className="flex items-center gap-2">

          <BasculeTheme />

          {chargement ? null : utilisateur ? (
            <div className="flex items-center gap-2 border-l border-ink/15 pl-3">

              {/* PROFIL */}
              <div
                ref={menuRef}
                className="relative"
              >
                <button
                  type="button"
                  onClick={() =>
                    setMenuOuvert(
                      (ouvert) =>
                        !ouvert,
                    )
                  }
                  className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 transition-colors hover:bg-ink/5"
                  aria-expanded={menuOuvert}
                  aria-haspopup="menu"
                  title="Mon profil"
                >
                  {/* Avatar */}
                  <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-ocre/10 text-ocre-dark">
                    {utilisateur.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={
                          getFileUrl(
                            utilisateur.photoUrl,
                          ) ?? undefined
                        }
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User size={15} />
                    )}
                  </div>

                  {/* Nom + rôle */}
                  <div className="hidden flex-col text-left leading-tight sm:flex">
                    <span className="text-xs text-ink">
                      {utilisateur.nom}
                    </span>

                    <span className="text-[9px] font-mono uppercase tracking-wider text-ink-soft/70">
                      {roleLabel(
                        utilisateur.role,
                      )}
                    </span>
                  </div>

                  <ChevronDown
                    size={13}
                    className={clsx(
                      "hidden transition-transform sm:block",
                      menuOuvert &&
                        "rotate-180",
                    )}
                  />
                </button>

                {/* MENU */}
                {menuOuvert && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-ink/10 bg-paper shadow-lg"
                  >
                    <div className="border-b border-ink/10 px-4 py-3">
                      <p className="truncate text-sm font-medium text-ink">
                        {utilisateur.nom}
                      </p>

                      <p className="truncate text-xs text-ink-soft">
                        {utilisateur.email}
                      </p>

                      <p className="mt-1 text-[10px] font-mono uppercase tracking-wider text-ink-soft/60">
                        {roleLabel(
                          utilisateur.role,
                        )}
                      </p>
                    </div>

                    <Link
                      href="/tableau-de-bord/profil"
                      onClick={() =>
                        setMenuOuvert(false)
                      }
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink"
                      role="menuitem"
                    >
                      <User size={15} />
                      Mon profil
                    </Link>

                    <Link
                      href="/tableau-de-bord"
                      onClick={() =>
                        setMenuOuvert(false)
                      }
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink"
                      role="menuitem"
                    >
                      <LayoutDashboard size={15} />
                      Tableau de bord
                    </Link>

                    <button
                      type="button"
                      onClick={handleDeconnexion}
                      className="flex w-full items-center gap-3 border-t border-ink/10 px-4 py-2.5 text-left text-sm text-brique transition-colors hover:bg-brique/5"
                      role="menuitem"
                    >
                      <LogOut size={15} />
                      Se déconnecter
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 border-l border-ink/15 pl-3">
              <Link href="/connexion">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2.5 text-xs"
                >
                  Se connecter
                </Button>
              </Link>

              <Link href="/inscription">
                <Button
                  variant="primary"
                  size="sm"
                  className="h-8 px-2.5 text-xs"
                >
                  S&apos;inscrire
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}