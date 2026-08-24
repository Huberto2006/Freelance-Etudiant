"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { Menu, X } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { liensSidebarParRole } from "@/lib/nav-links";

export default function TableauDeBordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { utilisateur, chargement } = useAuth();

  const router = useRouter();
  const pathname = usePathname();

  // ==========================================================
  // ÉTAT DE LA SIDEBAR
  // ==========================================================

  const [sidebarOuverte, setSidebarOuverte] = useState(true);

  // ==========================================================
  // REDIRECTION SI NON CONNECTÉ
  // ==========================================================

  useEffect(() => {
    if (!chargement && !utilisateur) {
      router.replace("/connexion");
    }
  }, [chargement, utilisateur, router]);

  // ==========================================================
  // CHARGEMENT
  // ==========================================================

  if (chargement || !utilisateur) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-16">
        <p className="text-sm text-ink-soft">Chargement…</p>
      </div>
    );
  }

  // ==========================================================
  // LIENS SELON LE RÔLE
  // ==========================================================

  const liens = liensSidebarParRole[utilisateur.role] ?? [];

  // ==========================================================
  // AFFICHAGE
  // ==========================================================

  return (
    <div className="flex h-screen overflow-hidden">
      {/* =====================================================
          SIDEBAR FIXE
          ===================================================== */}

      <aside
        className={clsx(
          "flex h-full shrink-0 flex-col overflow-hidden border-r border-ink/10 bg-paper shadow-sm transition-[width] duration-300 ease-in-out",
          sidebarOuverte ? "w-64" : "w-16",
        )}
      >
        {/* ===================================================
            EN-TÊTE DE LA SIDEBAR
            =================================================== */}

        <div className="flex h-16 shrink-0 items-center border-b border-ink/10 px-3">
          {/* Bouton ouvrir / fermer */}
          <button
            type="button"
            onClick={() => setSidebarOuverte((ouverte) => !ouverte)}
            aria-label={
              sidebarOuverte ? "Fermer la navigation" : "Ouvrir la navigation"
            }
            className="
              flex h-10 w-10 shrink-0 items-center justify-center
              rounded-lg text-ink transition-colors
              hover:bg-ink/5
              focus:outline-none focus:ring-2 focus:ring-ocre/40
            "
          >
            {sidebarOuverte ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Titre */}
          <div
            className={clsx(
              "ml-3 whitespace-nowrap transition-opacity duration-200",
              sidebarOuverte ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            <p className="font-display font-semibold">Kianja</p>

            <p className="text-xs text-ink-soft">Tableau de bord</p>
          </div>
        </div>

        {/* ===================================================
            NAVIGATION
            =================================================== */}

        <nav className="flex-1 overflow-y-auto px-2 py-5">
          <div className="space-y-1">
            {liens.map((lien) => {
              const Icon = lien.icon;

              // Le lien est actif également pour ses sous-pages.
              const actif =
                pathname === lien.href ||
                (lien.href !== "/tableau-de-bord" &&
                  pathname.startsWith(`${lien.href}/`));

              return (
                <Link
                  key={lien.href}
                  href={lien.href}
                  title={sidebarOuverte ? undefined : lien.label}
                  className={clsx(
                    "flex h-11 items-center rounded-lg px-3 text-sm transition-colors",
                    actif
                      ? "bg-ocre/10 font-medium text-ocre-dark"
                      : "text-ink-soft hover:bg-ink/5 hover:text-ink",
                  )}
                >
                  {/* Icône */}
                  <Icon
                    size={20}
                    strokeWidth={actif ? 2.3 : 2}
                    className="shrink-0"
                  />

                  {/* Texte visible uniquement si la sidebar est ouverte */}
                  <span
                    className={clsx(
                      "ml-4 whitespace-nowrap transition-opacity duration-200",
                      sidebarOuverte
                        ? "opacity-100"
                        : "pointer-events-none opacity-0",
                    )}
                  >
                    {lien.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </aside>

      {/* =====================================================
          CONTENU PRINCIPAL
          ===================================================== */}

      <main className="min-w-0 flex-1 overflow-y-auto px-5 py-10 md:px-8">
        {children}
      </main>
    </div>
  );
}