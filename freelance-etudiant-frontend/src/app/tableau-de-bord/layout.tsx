"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth-context";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";

export default function TableauDeBordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { utilisateur, chargement } = useAuth();
  const router = useRouter();

  /*
   * ==========================================================
   * DRAWER MOBILE DE LA SIDEBAR
   * ==========================================================
   *
   * Le layout est la source de vérité concernant la présence
   * de la Sidebar (cf. Navbar `hasSidebar`), il est donc aussi
   * responsable de l'état d'ouverture du drawer mobile : c'est
   * lui qui relie le bouton hamburger du Navbar à la Sidebar.
   */
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (!chargement && !utilisateur) {
      router.replace("/connexion");
    }
  }, [chargement, utilisateur, router]);

  /*
   * Ferme le drawer mobile automatiquement si l'écran repasse
   * en desktop (évite un drawer resté "ouvert" en arrière-plan
   * après un redimensionnement / rotation d'écran).
   */
  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");

    function handleChange(event: MediaQueryListEvent) {
      if (event.matches) {
        setMobileSidebarOpen(false);
      }
    }

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  /*
   * ==========================================================
   * PROTECTION DU DASHBOARD
   * ==========================================================
   */

  if (chargement || !utilisateur) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-5">
        <p className="text-sm text-ink-soft">
          Chargement…
        </p>
      </div>
    );
  }

  /*
   * ==========================================================
   * LAYOUT
   *
   * La Sidebar est présente uniquement dans ce layout.
   *
   * La Sidebar est responsable de la valeur :
   * --sidebar-width
   *
   * Il ne faut donc PAS la définir ici.
   * ==========================================================
   */

  return (
    <div className="min-h-screen bg-paper">
      {/* =====================================================
          SIDEBAR
          ===================================================== */}

      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      {/* =====================================================
          ZONE PRINCIPALE
          ===================================================== */}

      <div
        className="
          min-h-screen
          w-full
          transition-[margin-left]
          duration-200
          ease-in-out
          lg:ml-[var(--sidebar-width)]
        "
      >
        {/* ===================================================
            NAVBAR
            =================================================== */}

        <Navbar
          hasSidebar
          onMenuClick={() => setMobileSidebarOpen(true)}
        />

        {/* ===================================================
            CONTENU
            =================================================== */}

        <main className="min-h-screen pt-16">
          <div
            className="
              mx-auto
              w-full
              max-w-7xl
              px-5
              py-8
              md:px-8
              md:py-10
            "
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}