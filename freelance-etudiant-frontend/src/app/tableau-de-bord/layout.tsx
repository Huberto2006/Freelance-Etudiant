"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";

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
  const pathname = usePathname();
  const estPageMessages =
    pathname === "/tableau-de-bord/messages";

  /*
   * ==========================================================
   * DRAWER MOBILE DE LA SIDEBAR
   * ==========================================================
   */

  const [mobileSidebarOpen, setMobileSidebarOpen] =
    useState(false);

  /*
   * ==========================================================
   * PROTECTION DU DASHBOARD
   * ==========================================================
   */

  useEffect(() => {
    if (!chargement && !utilisateur) {
      router.replace("/connexion");
    }
  }, [chargement, utilisateur, router]);

  /*
   * ==========================================================
   * QUESTIONNAIRE DE COMPLÉTION DE PROFIL (ÉTAPE G)
   * ==========================================================
   * Le questionnaire est facultatif : un profil étudiant incomplet ne
   * doit JAMAIS empêcher l'accès au dashboard. `completionProfil` reste
   * chargé par AuthProvider et sert uniquement à la bannière
   * ProfilCompletion (incitation), pas à un blocage de route ici.
   */

  /*
   * ==========================================================
   * FERMETURE AUTOMATIQUE DU DRAWER MOBILE
   * ==========================================================
   */

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      "(min-width: 1024px)",
    );

    function handleChange(event: MediaQueryListEvent) {
      if (event.matches) {
        setMobileSidebarOpen(false);
      }
    }

    mediaQuery.addEventListener(
      "change",
      handleChange,
    );

    return () => {
      mediaQuery.removeEventListener(
        "change",
        handleChange,
      );
    };
  }, []);

  /*
   * ==========================================================
   * CHARGEMENT
   * ==========================================================
   */

  if (chargement || !utilisateur) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-paper px-5">
        <p className="text-sm text-ink-soft">
          Chargement…
        </p>
      </div>
    );
  }

  /*
   * ==========================================================
   * LAYOUT GLOBAL
   * ==========================================================
   *
   * IMPORTANT :
   * --sidebar-width est géré directement par Sidebar.tsx.
   *
   * Sidebar ouverte  => 260px
   * Sidebar réduite  => 76px
   *
   * Il ne faut PAS redéfinir --sidebar-width ici avec
   * un style inline, sinon la valeur provenant de Sidebar
   * ne peut pas modifier la marge du contenu.
   */

  return (
    <div
      className={
        estPageMessages
          ? "h-[calc(100dvh-4rem)] overflow-hidden bg-paper"
          : "bg-paper"
      }
    >
      {/* =====================================================
          SIDEBAR
          ===================================================== */}

      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() =>
          setMobileSidebarOpen(false)
        }
      />

      {/* =====================================================
          ZONE PRINCIPALE
          ===================================================== */}

      <div
        className="
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
          onMenuClick={() =>
            setMobileSidebarOpen(true)
          }
        />

        {/* ===================================================
            CONTENU
            =================================================== */}

        <div
          className={`
            mx-auto
            w-full
            max-w-7xl
            px-5
            py-8
            md:px-8
            md:py-10

            ${
              estPageMessages
                ? "h-full min-h-0 overflow-hidden"
                : ""
            }
          `}
        >
          {children}
        </div>
      </div>
    </div>
  );
}