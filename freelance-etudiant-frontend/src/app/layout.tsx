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

import { ThemeProvider } from "@/lib/theme-context";
import { AuthProvider } from "@/lib/auth-context";
import { SocketProvider } from "@/lib/socket-context";
import { NavbarConditionnelle } from "@/components/layout/NavbarConditionnelle";
import { FooterConditionnel } from "@/components/layout/FooterConditionnel";

export const metadata: Metadata = {
  title: "Kianja — Freelances etudiants x Clients | EMIT Fianarantsoa",
  description:
    "La place de marche qui connecte les etudiants freelances de l'EMIT Fianarantsoa aux clients qui ont besoin de leurs competences.",
};

/**
 * Script inline exécuté immédiatement avant le rendu du body :
 * lit localStorage et applique sans délai le thème et le mode sombre sur <html>,
 * garantissant l'absence totale de clignotement / flash blanc au rechargement.
 */
const themeInitScript = `
(function() {
  try {
    var themeId = localStorage.getItem('kianja-theme-id') || 'slate';
    var mode = localStorage.getItem('kianja-theme-mode') || localStorage.getItem('kianja-theme');
    if (!mode) {
      mode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'sombre' : 'clair';
    }
    document.documentElement.dataset.theme = themeId;
    if (mode === 'sombre') {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
  } catch (e) {}
})();
`;

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
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>

      <body className="min-h-full flex flex-col">
        <ThemeProvider>
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
        </ThemeProvider>
      </body>
    </html>
  );
}