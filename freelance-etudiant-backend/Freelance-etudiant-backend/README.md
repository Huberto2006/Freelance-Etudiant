# Backend — Plateforme Freelance Étudiants

API REST NestJS pour la plateforme de mise en relation entre étudiants
freelances et clients (EMIT Fianarantsoa — Projet de Fin d'Études L3).

Ce backend a été généré à partir de :
- `Cahier_des_Charges_Plateforme_Freelance_Etudiants_v2.docx`
- `Partie2_Analyse_Conception.docx` (règles de gestion RG1–RG12, dictionnaire
  de données, architecture 3 couches)

Il a été **compilé, démarré et testé de bout en bout** (inscription,
connexion, cycle mission → candidature → livraison → validation →
évaluation → recalcul du score de réputation) contre une base PostgreSQL
réelle avant livraison.

## Stack technique

- **NestJS 10** (TypeScript) — API REST modulaire
- **TypeORM** + **PostgreSQL**
- **JWT** (access + refresh token) via Passport
- **class-validator** / **class-transformer**
- **Swagger** (documentation interactive sur `/docs`)

## Structure du projet

```
src/
  common/            enums, decorateurs, guards, filtres globaux
  config/            configuration app / database / jwt (via @nestjs/config)
  database/          DataSource CLI (migrations) + script de seed
  modules/
    auth/            inscription, connexion, JWT, guards RBAC
    users/            entite Utilisateur (base commune)
    etudiants/       profil etudiant
    clients/         profil client
    services/        offres de service (freelance)
    missions/        offres de mission (client)
    candidatures/    candidatures etudiant -> mission (RG2, RG3, RG4)
    livraisons/      depot/validation des livrables (RG5, RG8, RG12)
    evaluations/     notation 1-5 (RG5, RG6, RG12)
    reputation/      calcul du score de reputation pondere
    matching/        algorithme de compatibilite etudiant <-> mission
    messages/        messagerie directe client <-> etudiant
    statistiques/    tableaux de bord admin / etudiant
    signalements/    litiges et moderation (RG11)
    admin/           gestion des utilisateurs et moderation (RG9)
  app.module.ts
  main.ts
```

## Règles de gestion implémentées

| Règle | Description | Où |
|---|---|---|
| RG1 | Un utilisateur a un role unique (etudiant/client/admin) | `Role` enum, `AuthService.register` |
| RG2 | Une seule candidature par etudiant et par mission | contrainte SQL unique + `CandidaturesService.create` |
| RG3 | Pas de candidature apres la date limite | `MissionsService.assertMissionOuverteAuxCandidatures` |
| RG4 | Statut de candidature en_attente/acceptee/refusee | `StatutCandidature` enum |
| RG5 | Evaluation possible seulement apres validation | `LivraisonsService.assertLivraisonValidee` |
| RG6 | Note entre 1 et 5 | `CreateEvaluationDto` (`@Min(1) @Max(5)`) |
| RG7 | Email unique | contrainte SQL unique + `UsersService.assertEmailDisponible` |
| RG8 | Livraison possible seulement si candidature acceptee | `CandidaturesService.assertCandidatureAcceptee` |
| RG9 | Un admin ne peut publier ni mission ni service | aucune route de creation exposee a `Role.ADMIN` |
| RG10 | Service visible tant que disponible | filtre `disponible = true` dans `ServicesService.findAll` |
| RG11 | Signalement traite par un admin avant cloture | `SignalementsService.traiter` (route reservee `Role.ADMIN`) |
| RG12 | Seul le client de la mission valide la livraison | verification `mission.clientId === user.id` |

## Démarrage

### 1. Prérequis
- Node.js 20+
- PostgreSQL 14+

### 2. Installation

```bash
cd backend
npm install
cp .env.example .env
# editer .env avec vos identifiants PostgreSQL et un JWT_SECRET fort
```

### 3. Base de données

Créer la base :
```bash
createdb plateforme_freelance_etudiants
```

Pour le développement, activer `DB_SYNCHRONIZE=true` dans `.env` (cree les
tables automatiquement). Pour la production, utiliser les migrations :

```bash
npm run migration:generate -- src/database/migrations/Init
npm run migration:run
```

### 4. Données de démonstration (optionnel)

Rejoue le scénario de l'exemple du cahier des charges (Lanja, UI/UX
Designer, et une mission Next.js/NestJS/PostgreSQL) :

```bash
npm run seed
```

Comptes créés (mot de passe `MotDePasse123!`) :
- `admin@emit.mg` (admin)
- `lanja@emit.mg` (étudiante)
- `client@exemple.mg` (client)

### 5. Lancer l'API

```bash
npm run start:dev
```

- API : `http://localhost:3000/api/v1`
- Documentation Swagger : `http://localhost:3000/docs`

## Points d'attention pour la suite

- **Modération** : les services/missions sont marqués `estModere = true`
  par défaut (auto-publication) pour ne pas bloquer les tests ; à basculer
  sur `false` si une validation admin préalable est souhaitée avant mise en
  ligne.
- **Messagerie temps réel** : l'implémentation actuelle est REST classique
  (polling côté frontend) ; une passerelle WebSocket (`@nestjs/websockets`)
  pourrait être ajoutée si un chat en temps réel est requis.
- **Mot de passe oublié** : les DTOs (`ForgotPasswordDto`, `ResetPasswordDto`)
  sont prêts mais l'envoi d'email (SMTP/service tiers) reste à brancher.
- **Uploads de fichiers** (portfolio, livrables, images) : les champs
  stockent des URLs (`fichierUrl`, `imagesUrls`, etc.) ; un module de
  stockage (local, S3, Cloudinary...) reste à connecter en amont.
