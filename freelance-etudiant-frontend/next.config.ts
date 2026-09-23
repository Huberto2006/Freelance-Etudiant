import type { NextConfig } from "next";

/*
 * Content-Security-Policy
 *
 * Politique etablie a partir de l'audit des ressources reellement utilisees :
 * - Polices auto-hebergees via @fontsource (aucun CDN de police) -> font-src 'self'
 * - Images locales (/uploads/*) servees par le backend sur la meme origine,
 *   eventuellement en data:/blob: pour les apercus d'upload -> img-src 'self' data: blob:
 * - API REST et Socket.IO joignables en relatif (/api/v1, /socket.io) -> connect-src 'self'
 * - Socket.IO en production passe par wss://kianja.arato.mg (meme origine via Cloudflare) ;
 *   l'origine wss explicite est ajoutee pour les navigateurs qui n'assimilent pas
 *   'self' aux WebSocket (comportement CSP3 inegal selon les versions).
 * - Un seul lien externe existe (https://emit.mg) : c'est une navigation <Link>,
 *   pas une ressource chargee -> aucune origine externe requise.
 *
 * Exceptions documentees :
 * - script-src 'unsafe-inline' : requis par les scripts d'amorcage inline de
 *   Next.js et le script de theme dans layout.tsx. Migration progressive possible
 *   vers des nonces (middleware Next.js) : voir rapport OWASP phase 1.
 * - style-src 'unsafe-inline' : requis par les attributs style={} de React et
 *   l'injection de variables CSS du theme.
 *
 * En developpement, les exceptions localhost sont ajoutees afin de ne pas casser
 * l'acces a l'API locale (http://localhost:3000) et le HMR WebSocket.
 */
const estProduction = process.env.NODE_ENV === "production";

const connectSrcProd = `'self' ${
  process.env.NEXT_PUBLIC_WS_ORIGIN || "wss://kianja.arato.mg"
}`;
const connectSrc = estProduction
  ? connectSrcProd
  : `'self' http://localhost:3000 http://127.0.0.1:3000 ws://localhost:* ws://127.0.0.1:*`;
const scriptSrc = estProduction
  ? `'self' 'unsafe-inline'`
  : `'self' 'unsafe-inline' 'unsafe-eval'`;

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src ${connectSrc}`,
  "frame-src 'self'",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
].join("; ");

const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=()",
  },
  /*
   * HSTS demarre en configuration sure : 1 an, SANS includeSubDomains ni
   * preload tant que tous les sous-domaines n'ont pas ete verifies en HTTPS.
   * Ne pas dupliquer ce header dans Cloudflare ou Nginx : une seule source.
   */
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000",
  },
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: [
    "192.168.0.153",
  ],

  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      /*
       * Espace authentifie : les pages du tableau de bord prerendent un
       * coquille HTML statique (les donnees utilisateur sont chargees cote
       * client avec le JWT en en-tete Authorization, jamais au rendu serveur).
       * Pour interdire tout stockage de ces coquilles par un cache public
       * (Cloudflare, proxies partages), on force un Cache-Control prive.
       */
      {
        source: "/tableau-de-bord",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store",
          },
        ],
      },
      {
        source: "/tableau-de-bord/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store",
          },
        ],
      },
    ];
  },
};

export default nextConfig;