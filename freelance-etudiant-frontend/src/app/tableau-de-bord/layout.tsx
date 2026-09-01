"use client";

import { useEffect } from "react";
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

  useEffect(() => {
    if (!chargement && !utilisateur) {
      router.replace("/connexion");
    }
  }, [chargement, utilisateur, router]);

  if (chargement || !utilisateur) {
    return (
      <div className="flex min-h-screen items-center justify-center px-5">
        <p className="text-sm text-ink-soft">
          Chargement…
        </p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-paper"
      style={
        {
          "--sidebar-width": "260px",
        } as React.CSSProperties
      }
    >
      {/* =====================================================
          SIDEBAR
          ===================================================== */}

      <Sidebar />

      {/* =====================================================
          ZONE PRINCIPALE
          ===================================================== */}

      <div
        className="
          min-h-screen
          transition-[margin]
          duration-200
          ease-in-out
          lg:ml-[var(--sidebar-width)]
        "
      >
        {/* ===================================================
            NAVBAR
            =================================================== */}

        <Navbar />

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