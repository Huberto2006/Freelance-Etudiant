# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Kianja** is a platform that connects student freelancers (`etudiant`) with clients (`client`), plus an `admin` role. It is a monorepo with two independent npm projects, deployed together to `kianja.arato.mg` with Docker Compose:

- `freelance-etudiant-backend/`: NestJS 11, TypeORM, PostgreSQL, Socket.IO
- `freelance-etudiant-frontend/`: Next.js 16 (App Router), React 19, Tailwind 4, next-intl

The code, identifiers, comments, commit messages and docs are in **French**. Keep that convention (for example `missions`, `candidatures`, `livraisons`, `assertMissionOuverteAuxCandidatures`).

**Next.js warning:** `freelance-etudiant-frontend/CLAUDE.md` → `AGENTS.md` says this Next.js version has breaking changes compared with training data. Read `node_modules/next/dist/docs/` before writing frontend code. `next dev` re-adds that block, so commit it rather than removing it.

## Commands

Backend (`cd freelance-etudiant-backend`):

```bash
npm run start:dev            # API on :3000, prefix /api/v1, Swagger at /docs (outside production)
npm run build                # nest build -> dist/
npm run lint                 # eslint --fix
npm test                     # jest --runInBand, runs src/**/*.spec.ts
npx jest src/modules/paiements/papi.service.spec.ts   # single test file
npx jest -t "nom du test"                              # single test by name
npm run migration:generate -- src/database/migrations/<Timestamp>-<Nom>
npm run migration:run / migration:revert
npm run seed:admin           # create/sync the admin from ADMIN_EMAIL / ADMIN_PASSWORD
npm run seed                 # full demo seed (never run in production)
```

`test/*.ts` files are standalone scenario scripts, not Jest tests. They use real services with in-memory mocks. Run them with `npx ts-node -r tsconfig-paths/register test/regles-fin-projet.ts`.

Frontend (`cd freelance-etudiant-frontend`):

```bash
npm run dev
npm run build                # output: standalone
npm run lint
npm run i18n:check           # fr/mg/en message files must have identical keys, with no empty/TODO/RELIRE values
```

There is no frontend test runner.

Full stack (repository root, uses root `.env`; see `.env.example`):

```bash
docker network create --subnet=10.232.0.0/16 kianja_net   # once; network is external
docker compose up -d --build --wait --wait-timeout 240
docker compose logs --tail=100 backend frontend gateway
```

Never run `docker compose down -v` on the server, because it deletes the DB and uploads volumes.

## Architecture

### Request routing

Host Nginx forwards to `127.0.0.1:3210`. That port is the only one Compose publishes. From there the `gateway` container (Nginx, `deploy/nginx/docker.conf`) routes requests:

- `/` → frontend
- `/api/`, `/uploads/`, `/socket.io/` → backend

The browser therefore calls the API on the **same origin with a relative `/api/v1`**. Server Components call the backend directly through `API_INTERNAL_URL=http://backend:3000/api/v1` (`src/lib/api-server.ts` provides `fetchPublic` for public routes, but nothing imports it yet). `NEXT_PUBLIC_*` values are fixed at build time.

Because requests pass through two proxies, the backend uses `TRUST_PROXY_HOPS` so that rate limiting sees real client IPs.

### Backend

- **Layout:** one NestJS module per business domain in `src/modules/<domaine>/`. Each module owns its controller, services, `dto/`, `entities/`, `enums/` and public projection (`<entite>.projection.ts`, a whitelist of fields for public endpoints). `src/common/` holds only cross-cutting code that depends on no domain: decorators, the `Role` enum, the exception filter, error i18n and generic utilities. Domain code does not go there. Polymorphic targets (comment, reaction and favourite targets) live in `modules/cibles/`.
- **Global guards** (`app.module.ts`) run in this order: `ThrottlerGuard` → `JwtAuthGuard` → `RoleDefiniGuard`.
  - Every route requires a JWT by default. Opt out with `@Public()`.
  - Google sign-in users start without a role. `RoleDefiniGuard` blocks them until they choose one, except on routes marked `@AutoriserRoleADefinir()`.
  - `@Roles()` and `RolesGuard` restrict routes by role.
- **Auth:** access JWT plus a refresh token in an httpOnly cookie (`RefreshToken` entity). The cookie-based endpoints `/auth/refresh` and `logout` require the `X-Kianja-Csrf: 1` header. Users must verify their email before they can log in. Cloudflare Turnstile protects sensitive forms through the `X-Turnstile-Token` header.
- **Global `ValidationPipe`:** uses `whitelist` and `forbidNonWhitelisted`, so DTOs must declare every accepted field.
- **Error i18n:** services throw exceptions with **French messages**. `HttpExceptionFilter` translates them through `src/common/i18n/erreurs.catalogue.ts`, which holds `[fr, mg, en]` tuples keyed by the French text (matching ignores case and accents). When you add a new error message, add a catalogue entry. Emails are localised the same way in `templates/i18n/` and use the user's stored `langue`.
- **Uploads:** only `uploads/profiles` and `uploads/images` are served statically. Documents (deliverables, attachments) are served only through 60-second signed links from `UploadsController` after an access check.
- **Payments:** `paiements/` supports MVola (`mvola.service.ts`) and PAPI (`papi.service.ts`). Webhooks are verified with HMAC over `req.rawBody`, which is why `rawBody: true` is set in `main.ts`. Without the MVola credentials, online payment returns 503.
- **Business rules:**
  - RG1–RG12 are mapped to their implementing code in `freelance-etudiant-backend/README.md`. That README is partly outdated: the stack is now NestJS 11.
  - End-of-project rule: a project is "terminé" only when the delivery is validated, payment is confirmed and the evaluation is done.
  - Evaluations go both ways (`EvaluationBidirectionnelle`), and the reputation score is recomputed afterwards.
- **Realtime:** Socket.IO gateways live in `realtime/` (user notifications, messaging, groups) and `commentaires/commentaires.gateway.ts`.

### Database and migrations

`DB_SYNCHRONIZE=false` in production. Schema changes **must** ship as a migration in `src/database/migrations/`, named with a timestamp prefix. The container entrypoint (`docker-entrypoint.sh`) does the following before starting the API:

1. Runs the compiled migrations with `--transaction each`, one transaction per migration. This is required for adding ENUM values.
2. Runs the idempotent admin seed.

No automatic migration rollback happens during deploys.

### Frontend

- **Layout (feature-first):**
  - `src/app/` holds only routes, layouts and pages.
  - `src/features/<domaine>/` holds what belongs to one domain: `components/`, plus `hooks/`, `services/` (API calls) and `utils/` when needed.
  - `src/components/ui/` holds generic UI with no domain dependency. `components/layout/` composes features into the navigation shell. `components/shared/` holds components used by several features.
  - `src/types/<domaine>.ts` is the REST API contract, split by backend domain. Import from the specific file, for example `@/types/missions`.
  - `src/lib/` holds only cross-cutting infrastructure: the API client, auth and socket contexts, formatting and categories.
  - Shared layers (`ui`, `lib`, `hooks`, `i18n`, `types`) must never import from `features/`.
- **i18n:** uses next-intl **without URL prefixes**.
  - The locale comes from the `NEXT_LOCALE` cookie (`src/i18n/request.ts`). Supported locales are `fr` (default), `mg` and `en`.
  - Messages are split by domain in `messages/<locale>/<domaine>.json`, and each domain must be registered in `src/i18n/domaines.ts`.
  - When you add a key, add it to all three locales, then run `npm run i18n:check`.
  - To add a language, follow the steps at the top of `src/i18n/config.ts`, including the backend `LANGUES_SUPPORTEES` list.
- **Data fetching:** user-specific data is fetched **client-side** in `src/lib/api.ts`, with the JWT in the `Authorization` header, `credentials: "include"` and automatic deduplicated refresh. Dashboard pages (`/tableau-de-bord/*`) are static shells marked `Cache-Control: private, no-store`.
- **Contexts:** auth (`src/lib/auth-context.tsx`), Socket.IO (`src/lib/socket-context.tsx`) and theme (`src/features/theme/theme-context.tsx`).
- **CSP:** `next.config.ts` sets a strict CSP. If you add an external script, frame or connection origin (Google GSI, Turnstile and Cloudflare Insights are already allowed), update the CSP there.

## Deployment

A push to `main` triggers `.github/workflows/deploy.yml`:

1. Runs `deploy/test-rsync.sh` locally.
2. Rsyncs the code to the server `WORKDIR`, using the exclusions in `deploy/rsync-excludes.txt`. These exclusions protect `.env`, uploads and backups.
3. Runs `deploy/deploy.sh`, which builds the images, starts the services, waits for health checks and checks the local URLs.

The production `.env` lives only on the server. Root `README.md` covers the server setup, Certbot, SMTP/MVola configuration and backups.

`RAPPORT-AUDIT-API-KIANJA.md` and `RAPPORT-FINAL-KIANJA.md` are audit and final reports, kept for reference.
