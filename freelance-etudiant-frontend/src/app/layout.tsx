import type { Metadata } from "next";

import "@fontsource/zilla-slab/400.css";
import "@fontsource/zilla-slab/500.css";
import "@fontsource/zilla-slab/600.css";
import "@fontsource/zilla-slab/700.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";

import "./globals.css";

import { AuthProvider } from "@/lib/auth-context";
import { SocketProvider } from "@/lib/socket-context";
import { NavbarConditionnelle } from "@/components/layout/NavbarConditionnelle";
import { FooterConditionnel } from "@/components/layout/FooterConditionnel";

export const metadata: Metadata = {
  title: "Kianja — Freelances etudiants x Clients | EMIT Fianarantsoa",
  description:
    "La place de marche qui connecte les etudiants freelances de l'EMIT Fianarantsoa aux clients qui ont besoin de leurs competences.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fr"
      className="h-full antialiased"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <SocketProvider>
            {/* Navbar publique — masquée sur /tableau-de-bord, où le
                layout du dashboard rend sa propre variante hasSidebar. */}
            <NavbarConditionnelle />

            {/*
                Espace supérieur global = hauteur de la Navbar (h-16 = 4rem).
                Les pages publiques n'ont plus à compenser individuellement
                avec pt-20 / pt-24 : la Navbar étant fixed, ce padding garantit
                qu'aucun contenu ne passe jamais dessous. Le tableau de bord
                en profite aussi : sa Navbar hasSidebar est fixed au même
                endroit, il n'ajoute donc aucun padding supplémentaire.
            */}
            <main className="flex-1 pt-16">
              {children}
            </main>

            <FooterConditionnel />
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}