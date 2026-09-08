"use client";

import {
  useEffect,
  useState,
  type CSSProperties,
} from "react";
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
      // 100vh - 4rem : l'écran de chargement vit sous la Navbar fixed
      // (h-16), dont l'espace est déjà réservé par le <main> du layout
      // racine (pt-16). Sans cette correction, la page dépasserait de
      // 4rem et provoquerait un scroll fantôme.
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-paper px-5">
        <p className="text-sm text-ink-soft">
          Chargement…
        </p>
      </div>
    );
  }

  /*
   * ==========================================================
   * VARIABLE DE LAYOUT
   * ==========================================================
   *
   * Valeur initiale :
   * 260px = sidebar ouverte.
   *
   * La Sidebar modifiera ensuite cette variable lorsque
   * l'utilisateur replie ou déplie la sidebar.
   *
   * Cette valeur initiale évite un mauvais positionnement
   * lors du premier rendu.
   */

  const layoutStyle = {
    "--sidebar-width": "260px",
  } as CSSProperties;

  /*
   * ==========================================================
   * LAYOUT GLOBAL
   * ==========================================================
   *
   * Hiérarchie des repères (aucun padding dupliqué) :
   *
   * - Hauteur de la Navbar (h-16) : réservée une seule fois par le
   *   <main className="flex-1 pt-16"> du layout racine. La Navbar
   *   hasSidebar étant fixed au même endroit, ce padding suffit.
   *
   * - Largeur de la Sidebar : pilotée par --sidebar-width (260px
   *   ouverte, 76px réduite). La Sidebar écrit la variable, la zone
   *   de contenu et la Navbar la consomment (lg:ml / lg:left).
   *
   * - Mobile : la Sidebar passe en drawer (z-index supérieur), la
   *   marge lg:ml-[var(--sidebar-width)] ne s'applique qu'à partir
   *   de lg.
   */

  return (
    <div
      className="bg-paper"
      style={layoutStyle}
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
          =====================================================
          
          IMPORTANT :
          Ne pas ajouter "w-full" ni "min-h-screen" ici.

          - Largeur : cette zone possède déjà
                margin-left: var(--sidebar-width)
            une largeur automatique permet au navigateur
            de prendre uniquement l'espace restant.
          - Hauteur : le <main className="flex-1"> du layout racine
            remplit déjà le viewport (min-h-screen ici créerait un
            débordement de la hauteur de la Navbar).
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
            ===================================================
            
            L'espace sous la Navbar (h-16) est déjà réservé par
            le <main> du layout racine : aucun padding-top ici,
            sinon double espace entre la Navbar et le contenu.
            =================================================== */}

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
      </div>
    </div>
  );
}