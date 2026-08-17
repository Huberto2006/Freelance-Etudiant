# Frontend — Kianja

Application Next.js (App Router) consommant l'API NestJS du backend. Voir
le README racine pour le contexte global du projet.

## Stack

- **Next.js 16** (App Router, Server + Client Components)
- **TypeScript**, **Tailwind CSS v4**
- Polices auto-hébergées via `@fontsource` (Zilla Slab, Inter, IBM Plex Mono)
- Authentification JWT stockée en `localStorage`, contexte React
  (`src/lib/auth-context.tsx`)

## Structure

```
src/
  app/
    page.tsx                    Accueil (server component, donnees reelles)
    (auth)/connexion, inscription
    missions/                   liste + detail + candidature
    services/                   liste + detail
    etudiants/[id]/              profil public etudiant
    tableau-de-bord/
      layout.tsx                shell protege, navigation par role
      page.tsx                  vue d'ensemble (stats)
      profil/                   edition profil etudiant/client
      mes-services/             CRUD services (etudiant)
      mes-missions/             CRUD missions + candidatures + livraisons + evaluation (client)
      candidatures/             mes candidatures + depot de livraison (etudiant)
      messages/                 messagerie directe
      admin/                    gestion des comptes (admin)
  components/
    ui/                         Button, Field, NoticeCard, StampBadge, Tag, BarreRecherche
    layout/                     Navbar, Footer
  lib/
    api.ts                      client fetch + JWT (cote client)
    api-server.ts                fetch public (cote serveur, sans JWT)
    auth-context.tsx             contexte d'authentification
    types.ts                    types partages avec le backend
    format.ts                    formatage Ariary/dates
```

## Variables d'environnement

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

## Commandes

```bash
npm run dev      # developpement
npm run build    # build de production (verifie, testee)
npm run start    # sert le build de production
```

## Notes techniques

- Les pages de liste/détail (missions, services) sont des **Client
  Components** (`"use client"`) car elles ont besoin de re-fetcher au
  changement de filtres ; la page d'accueil est un **Server Component**
  qui affiche déjà des données réelles au premier rendu (SSR).
- Le tableau de bord est protégé côté client (redirection vers
  `/connexion` si non authentifié) ; il n'y a pas de middleware Next.js de
  protection de route côté serveur — à ajouter si un rendu SSR de contenu
  sensible devait être introduit plus tard.
