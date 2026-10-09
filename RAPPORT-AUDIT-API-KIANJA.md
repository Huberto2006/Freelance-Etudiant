# Audit approfondi des API Kianja

**Date de l'audit :** 2026-10-09  
**Périmètre :** backend NestJS/TypeORM/PostgreSQL et frontend Next.js accessible dans le workspace.  
**Mode :** audit statique, compilation et lint; aucun correctif de code, aucune migration, aucune connexion à une base ou à un compte réel. Aucun fichier `.env` n'a été ouvert et aucune valeur secrète n'est reproduite.

## 1. Résumé exécutif

Les builds backend et frontend passent. L'API a un préfixe configurable (`API_PREFIX`, valeur de repli `api/v1`), un JWT global, une whitelist DTO stricte, Helmet, CORS explicite, une limitation de débit et des contrôles métier d'appartenance dans plusieurs flux sensibles. Les transitions d'acceptation de candidature et de validation de livraison utilisent des écritures conditionnelles/verrous. Le frontend utilise un client HTTP centralisé et son build TypeScript passe.

L'audit a néanmoins relevé **7 anomalies/risques** : **3 élevés, 3 moyens et 1 faible**. Les plus importants concernent les paiements MVola (appel fournisseur avant persistance), une course entre annulation et confirmation d'un paiement manuel, et un endpoint public de commentaires qui peut perdre ses filtres quand les query strings sont absentes. Il n'y a pas de preuve d'exploitation en production : aucun serveur connecté à la base n'a été démarré.

Aucune incompatibilité certaine d'URL n'a été constatée parmi les appels frontend inspectés. Le build frontend confirme les types locaux, pas le contrat réel avec le serveur. Aucun test fonctionnel/E2E d'API n'a été exécuté.

## 2. État général

- **Backend :** 29 contrôleurs trouvés, 149 occurrences de décorateurs HTTP recensées. Les contrôleurs et routes sont enregistrés via les modules fonctionnels; le contrôleur de complétion de profil est notamment monté dans le module utilisateur correspondant.
- **Base :** 26 entités TypeORM et 31 fichiers de migration trouvés. Le DataSource CLI force `synchronize: false`; l'application Nest lit toutefois `DB_SYNCHRONIZE` sans garde interdisant `true` en production.
- **Frontend :** les appels API passent majoritairement par `src/lib/api.ts`; le préfixe par défaut correspond à `/api/v1`. Les uploads utilisent `multipart/form-data`; le client n'impose pas la boundary.
- **Authentification :** le throttler et le `JwtAuthGuard` sont globaux. `@Public()` contourne le JWT uniquement; les routes publiques restent soumises au throttling et aux guards locaux éventuels. Les routes métier combinent guards de rôle et contrôles de propriété au service.
- **Limite de l'inventaire :** les routes, méthodes, paramètres de chemin, guards/roles et signatures DTO directement visibles sont recensés ci-dessous. Les réponses sont souvent des entités/services retournés directement et ne disposent pas toutes d'un schéma Swagger explicite. Faute d'exécution, il n'est pas possible de certifier les formes JSON effectives pour chaque branche.

## 3. Inventaire des endpoints

Les chemins ci-dessous sont relatifs au préfixe global effectif. Il vaut `/api/v1` par défaut; la valeur effective de `API_PREFIX` n'a pas été lue dans un fichier d'environnement. Sauf mention contraire, **JWT est obligatoire**. Les contrôleurs utilisant `@Roles(...)` imposent aussi les rôles indiqués. Les paramètres de chemin UUID visibles sont généralement passés à `ParseUUIDPipe`; les payloads `@Body()` utilisent les DTO cités par le contrôleur. Le `ValidationPipe` global applique `whitelist`, `forbidNonWhitelisted` et `transform` aux DTO de classe.

| Module | Routes (méthode et chemin) | Accès et contrat d'entrée notable |
|---|---|---|
| Santé | `GET /health` | Public. |
| Auth | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify-email`, `/auth/resend-verification` | Public; DTO Register, Login, reset et vérification. Login/refresh/logout/forgot/reset/verify/resend ont `200`; register conserve le `201` Nest. Refresh token en cookie httpOnly; refresh/logout exigent `X-Kianja-Csrf: 1`. |
| Admin | `GET /admin/utilisateurs`; `PATCH /admin/utilisateurs/:id/{suspendre,reactiver,desactiver,activer}`; `DELETE /admin/utilisateurs/:id`; `PATCH /admin/services/:id/{approuver,rejeter}`; `PATCH /admin/missions/:id/{approuver,rejeter}` | Admin. UUID sur les IDs. Les actions d'activation/suspension utilisent le service Users; moderation appelle Missions/Services. |
| Amitiés | `POST /amities/demandes`; `GET /amities/demandes/{recues,envoyees}`; `POST /amities/demandes/:id/{accepter,refuser}`; `GET /amities`; `DELETE /amities/:etudiantId` | JWT; règles étudiant/propriétaire dans `AmitieService`; DTO d'envoi, UUID pour les IDs. |
| Candidatures | `POST /missions/:missionId/candidatures`; `GET /missions/:missionId/candidatures`; `GET /candidatures/{me,client}`; `PATCH /candidatures/:id/{accepter,refuser}`; `PATCH /candidatures/:id`; `DELETE /candidatures/:id`; `POST /missions/:missionId/groupes/:groupeId/candidatures` | Étudiant pour postuler/modifier/annuler; client pour consulter/traiter. `CreateCandidatureDto`; service contrôle propriétaire, mission/date limite, chef de groupe et transitions. |
| Clients | `GET /clients/me`; `PATCH /clients/me`; `GET /clients/:id` | Client pour `me`; détail public projeté par liste blanche. DTO de mise à jour. |
| Commentaires | `GET /commentaires`; `GET /commentaires/mentions-suggestions`; `POST /commentaires`; `PATCH /commentaires/:id`; `DELETE /commentaires/:id` | Liste publique; suggestions et mutations authentifiées. DTO de commentaire/modification; mutation vérifie auteur (ou admin pour suppression). Query `cibleType`/`cibleId` de liste non validées: anomalie API-01. |
| Contact | `POST /contact` | Public, 3/min/IP; DTO de contact; email externe. |
| Demandes de service | `POST /services/:serviceId/demandes`; `GET /demandes-service/{me,recues,:id}`; `PATCH /demandes-service/:id/{accepter,refuser}` | Client pour créer/lister ses demandes; étudiant pour reçues/accepter/refuser; détail JWT avec contrôle de propriété. DTO de création. |
| Étudiants | `GET /etudiants`; `GET /etudiants/:id`; `POST /etudiants/me/cv-import`; `PATCH /etudiants/me` | Lecture réservée aux utilisateurs connectés; CV et update réservés étudiant. Pagination/filtre DTO pour liste; UUID pour profil; upload CV. |
| Évaluations | `POST /livraisons/:livraisonId/evaluation`; `POST /livraisons/:livraisonId/evaluation-client`; `PATCH /evaluations/:id`; `GET /etudiants/:etudiantId/evaluations` | Client puis étudiant pour évaluer; modification client/étudiant; lecture publique. DTO de note/commentaire; règles de fin de projet contrôlées par le service. |
| Favoris | `POST /favoris`; `GET /favoris` | JWT; DTO de toggle; filtre `cibleType` primitif non validé à l'exécution. |
| Groupes | `POST /groupes`; `GET /groupes/mes-groupes`, `/groupes/invitations/:invitationId`, `/groupes/:id`, `/groupes/:id/invitations`; `POST /groupes/:id/quitter`, `/groupes/:id/invitations`, `/groupes/invitations/:invitationId/{accepter,refuser}`; `PATCH /groupes/:id/chef`; `DELETE /groupes/:id/membres/:etudiantId`, `/groupes/invitations/:invitationId` | JWT; accès/membership contrôlés par `GroupesService`; DTO de groupe/invitation. Le changement de chef reçoit `etudiantId` comme body scalaire. |
| Livraisons | `POST /candidatures/:candidatureId/livraison`; `GET /livraisons/{me,client/toutes,:id}`; `PATCH /livraisons/:id/{valider,demander-correction}` | Étudiant pour dépôt/liste personnelle; client pour reçues/validation/correction; détail étudiant/client + contrôle de propriété. DTO de livraison/correction. Liens et fichiers sont contrôlés par service. |
| Matching | `GET /matching/missions/:missionId/etudiants-compatibles`; `GET /matching/missions-recommandees` | Client/admin pour compatibilité; étudiant pour recommandations. UUID de mission. |
| Messages | `POST /messages`; `POST /messages/groupes/:groupeId`; `GET /messages/non-lus/compteur`, `/messages`, `/messages/conversation/:autreUtilisateurId`, `/messages/groupes/:groupeId`; `PATCH /messages/groupes/:groupeId/lu`, `/messages/:id/lu`; `DELETE /messages/:id` | JWT; les services vérifient l'autorisation de conversation, l'appartenance au groupe et le propriétaire du message. DTO individuels/groupe. |
| Missions | `GET /missions`; `GET /missions/:id`; `POST /missions`; `GET /missions/me/mes-missions`; `PATCH /missions/:id`; `DELETE /missions/:id` | Deux GET publics; détail supporte auth optionnelle pour missions privées. Mutations/listing propriétaire réservés client. DTO création/update/filtre. |
| Moyens paiement client | `GET /moyens-paiement-client`; `POST /moyens-paiement-client`; `PATCH /moyens-paiement-client/:id`; `DELETE /moyens-paiement-client/:id`; `PATCH /moyens-paiement-client/:id/{principal,actif}` | Client; service contrôle la propriété; DTO création/update/actif. |
| Moyens paiement étudiant | `GET /moyens-paiement`; `POST /moyens-paiement`; `GET /moyens-paiement/:id`; `PATCH /moyens-paiement/:id`; `DELETE /moyens-paiement/:id`; `PATCH /moyens-paiement/:id/{principal,actif}` | Étudiant; données privées et contrôlées par propriétaire; DTO correspondants. |
| Notifications | `GET /notifications`; `GET /notifications/non-lues/compteur`; `PATCH /notifications/:id/lue`, `/notifications/lire-tout`; `DELETE /notifications/tout-supprimer`, `/notifications/:id` | JWT; filtrage par utilisateur courant dans le service; IDs UUID lorsque paramétrés. |
| Paiements | `POST /candidatures/:candidatureId/paiement`; `POST /paiements/webhook/mvola`; `POST /paiements/:id/verifier`; `GET /paiements/{me,recus}`; `GET /candidatures/:candidatureId/moyens-paiement`; `GET /paiements/:id/moyens-paiement`; `GET /paiements`; `PATCH /paiements/:id/{confirmer,annuler}` | Client pour créer/consulter/vérifier son paiement; étudiant pour reçus; admin pour lister/confirmer/annuler; webhook public signé HMAC + vérification directe MVola. DTO de paiement; query `statut` n'est pas un DTO validé (API-03). |
| Complétion profil | `GET /users/me/profile-completion` | JWT, utilisateur courant. |
| Réactions contenu | `GET /reactions-contenu`; `POST /reactions-contenu` | GET public avec auth optionnelle; POST JWT. Filtres `cibleType`/`cibleId` du GET primitifs. DTO pour la réaction. |
| Réactions profil | `GET /utilisateurs/:id/reactions`; `POST /utilisateurs/:id/reactions` | GET public/auth optionnelle; POST JWT; ID UUID; service de toggle. |
| Services | `GET /services`; `GET /services/:id`; `POST /services`; `GET /services/me/mes-services`; `PATCH /services/:id`, `/services/:id/{archiver,restaurer}`; `DELETE /services/:id` | Liste/detail publics, détail auth optionnelle; mutations étudiant propriétaire. DTO de création/update/filtre. |
| Signalements | `POST /signalements`; `GET /signalements`; `GET /signalements/:id`; `PATCH /signalements/:id/traiter` | Création JWT; liste/détail/traitement admin; DTO de création/traitement; filtre `statut` primitif non validé à l'exécution. |
| Statistiques | `GET /statistiques/admin`; `GET /statistiques/etudiant/me` | Admin ou étudiant selon route. |
| Uploads | `POST /uploads/profile`, `/uploads/image`, `/uploads/document`, `/uploads/document/lien`; `GET /uploads/documents/:nom` | Uploads étudiant/client (5 Mo images, 15 Mo documents), contrôle MIME + extension + signature de contenu; génération de lien JWT avec vérification d'accès; download public par ticket HMAC éphémère. |
| Utilisateurs | `GET /users/me` | JWT; renvoie l'entité avec champs secrets annotés `@Exclude`. |

Les réponses de lecture sont les valeurs retournées par les services; les mutations renvoient parfois une entité et parfois un objet `{ message }`. Les codes HTTP suivent les valeurs Nest par défaut (`GET`/`PATCH`/`DELETE` 200, `POST` 201), à l'exception des routes auth explicitement réglées à 200. Les erreurs sont normalisées par `HttpExceptionFilter` avec `statusCode`, `timestamp`, `path`, `message`. Aucun test HTTP n'a confirmé toutes les branches ni tous les payloads sérialisés.

## 4. Anomalies et risques

| ID | Gravité | Module/route | Fichier et emplacement | Constat, preuve et statut |
|---|---|---|---|---|
| PAI-01 | ÉLEVÉE | Paiements, `POST /candidatures/:id/paiement` (MVola) | [paiements.service.ts](freelance-etudiant-backend/src/modules/paiements/paiements.service.ts#L350) | **Confirmé statiquement, non reproduit sur fournisseur.** `initierPaiement()` est appelé avant `repo.save(transaction)`. Deux appels concurrents peuvent chacun franchir la vérification d'existence et démarrer deux paiements externes; l'index unique partiel empêche ensuite le second enregistrement local, mais n'annule pas son effet externe. Une panne DB après initiation laisse aussi un paiement externe sans ligne locale. Impact potentiel: double débit ou rapprochement perdu. Reproduction synthétique: deux requêtes concurrentes sur la même candidature avec MVola simulé; faire réussir les deux initiations et forcer un conflit/échec d'insert. Recommandation: réservation/idempotence persistée avant l'appel fournisseur, clé stable et récupération/réconciliation des états ambigus. |
| PAI-02 | ÉLEVÉE | Paiements, `PATCH /paiements/:id/annuler` | [paiements.service.ts](freelance-etudiant-backend/src/modules/paiements/paiements.service.ts#L1044) | **Course confirmée par le chemin de code, non exécutée.** `annuler()` lit `EN_ATTENTE`, puis sauvegarde toute l'entité avec `ANNULEE`; contrairement à `marquerConfirmee()`, l'écriture n'est pas conditionnée au statut courant. Une confirmation concurrente peut passer à `CONFIRMEE`, puis la sauvegarde obsolète de l'annulation écrase ce statut. L'index exclut les annulations et autorise alors la création d'un nouveau paiement actif. Impact: état comptable erroné/double paiement. Recommandation: `UPDATE ... WHERE statut = EN_ATTENTE`, vérifier `affected`, répondre 409 si la transition a perdu la course. |
| DB-01 | ÉLEVÉE (conditionnelle) | Démarrage Nest / TypeORM | [app.module.ts](freelance-etudiant-backend/src/app.module.ts#L72) | **Risque de configuration confirmé; valeur de production non vérifiée.** `database.synchronize` est piloté par `DB_SYNCHRONIZE`; aucune barrière `NODE_ENV=production` n'interdit `true`. Une telle configuration lance la synchronisation TypeORM au démarrage et peut modifier le schéma sans migration. Le DataSource CLI, lui, force `false`, donc les deux chemins diffèrent. Reproduction sans base réelle: tester la validation de configuration avec `NODE_ENV=production` et `DB_SYNCHRONIZE=true`, sans démarrer TypeORM sur une base. Recommandation: refuser cette combinaison en production et garder le DataSource d'exécution sans synchronisation. |
| API-01 | MOYENNE | Commentaires, `GET /commentaires` public | [commentaires.controller.ts](freelance-etudiant-backend/src/modules/commentaires/commentaires.controller.ts#L29), [commentaires.service.ts](freelance-etudiant-backend/src/modules/commentaires/commentaires.service.ts#L154) | **Exposition confirmée par les conditions locales + comportement du TypeORM installé; pas de requête API/base exécutée.** `cibleType` et `cibleId` sont des paramètres primitifs non validés et aucun contrôle de présence n'est fait. Le service construit `where: { cibleType, cibleId }`; TypeORM 0.3 ignore les propriétés `undefined` par défaut, et la connexion ne configure pas `invalidWhereValuesBehavior`. `GET /api/v1/commentaires` sans query peut donc devenir une recherche sans `WHERE`, renvoyer tous les commentaires publics/projetés, et lire toute la table sans pagination. Reproduction: requête anonyme sans paramètres sur base synthétique; résultat attendu après correction: 400 ou liste vide, jamais collection globale. Recommandation: DTO query obligatoire avec enums/UUID validés, pagination plafonnée, et config TypeORM qui rejette `undefined` dans les critères. |
| API-02 | MOYENNE | Filtres query enum | [admin.controller.ts](freelance-etudiant-backend/src/modules/admin/admin.controller.ts#L71), [paiements.controller.ts](freelance-etudiant-backend/src/modules/paiements/paiements.controller.ts#L182), [signalements.controller.ts](freelance-etudiant-backend/src/modules/signalements/signalements.controller.ts#L41), [favoris.controller.ts](freelance-etudiant-backend/src/modules/favoris/favoris.controller.ts#L24) | **Défaut de validation confirmé; code HTTP exact non exécuté.** `role`, `statut` et `cibleType` sont des types TypeScript primitifs/enum directs dans `@Query`, pas des DTO ou `ParseEnumPipe`; `ValidationPipe` ne valide pas leur valeur d'exécution. Valeurs inconnues atteignent les repositories, peuvent déclencher une erreur enum PostgreSQL et finir en 500 via le filtre global, au lieu d'un 400. Recommandation: DTO query ou `ParseEnumPipe`; tests valeurs absentes, valides et inconnues. |
| OPS-01 | MOYENNE | Paiements/livraisons, effets post-commit | [paiements.service.ts](freelance-etudiant-backend/src/modules/paiements/paiements.service.ts#L1096), [livraisons.service.ts](freelance-etudiant-backend/src/modules/livraisons/livraisons.service.ts#L433) | **Risque de cohérence confirmé dans le flux; panne externe non injectée.** Certaines transitions sont persistées avant notification/email et ces appels sont ensuite `await`. Une panne secondaire peut faire répondre 500 alors que paiement/livraison est déjà modifié; une nouvelle requête peut ensuite être ignorée comme déjà traitée, sans rattrapage garanti de la notification. Recommandation: séparer le résultat métier de l'effet secondaire, journaliser une tâche à rejouer/outbox, ou rendre l'envoi idempotent/réessayable; tester panne après commit puis retry. |
| QUAL-01 | FAIBLE | Qualité statique | [frontend Field.tsx](freelance-etudiant-frontend/src/components/ui/Field.tsx#L53), plusieurs fichiers backend cités dans les résultats lint | **Exécuté.** ESLint frontend échoue avec 3 erreurs `no-explicit-any` dans `Field.tsx` et 6 avertissements. ESLint backend sans `--fix` trouve 39 erreurs (unused vars/imports principalement dans migrations/templates/tests); TypeScript 5.9.3 produit aussi un avertissement de compatibilité parser (support déclaré `<5.6`). Cela n'empêche pas les builds observés, mais bloque les gates lint. |

## 5. Sécurité

### Contrôles observés

- JWT access vérifié avec expiration, type `access`, secret non vide; le refresh utilise un secret distinct, HS256, empreinte persistée, rotation et révocation. Le cookie refresh est httpOnly, limité au chemin auth; refresh/logout exigent un header CSRF et CORS n'autorise que des origines explicites.
- Le throttling global est actif avant le guard JWT; les routes login/register/refresh/email ont aussi des plafonds dédiés. La limitation par email d'échecs de connexion est en mémoire, explicitement mono-processus, donc non partagée entre instances.
- DTO globaux whitelistés et propriétés inattendues refusées. Les IDs UUID des routes critiques ont généralement un `ParseUUIDPipe`.
- `Utilisateur` exclut mot de passe et jetons temporaires de la sérialisation; profils étudiant/client publics utilisent des projections en liste blanche. Les paiements exigent l'appartenance du client, les coordonnées étudiantes sont protégées, les documents ont des liens signés courts, les conversations vérifient candidature/amitié et les sockets ne créent pas de messages.
- Le webhook MVola compare HMAC en temps constant, vérifie le corps brut puis interroge le fournisseur au lieu de faire confiance au statut reçu.

### Failles confirmées

- API-01: fuite de la liste globale de commentaires par query absente sur route publique, sous le comportement TypeORM local décrit ci-dessus. Cela ne prouve pas que tous ces commentaires contiennent des données privées, mais contourne le cloisonnement par cible et permet l'aspiration non paginée.
- Aucun IDOR/BOLA supplémentaire n'a été confirmé par inspection des chemins prioritaires (candidatures, livraisons, messages, groupes, moyens de paiement, coordonnées de paiement); les services effectuent des contrôles de propriétaire/membre. Ces protections ne sont pas validées par tests HTTP adversariaux.

### Points de sécurité non vérifiés

- Aucune tentative avec un vrai étudiant/client, aucune base réelle, aucun fournisseur MVola/SMTP, aucun upload hostile et aucun test concurrent n'ont été utilisés.
- La valeur effective de CORS, SameSite/Secure, secrets/expiration, proxy hops et `DB_SYNCHRONIZE` dépend de l'environnement; les valeurs de `.env` n'ont pas été lues.
- L'absence de limitation distribuée pour les échecs de login est un risque opérationnel en multi-instance, même si un rate limit IP global existe.

## 6. Métier, transactions et base

- Acceptation d'une candidature: transaction TypeORM, verrou pessimiste mission puis candidature, condition sur les statuts et refus des autres candidatures; les effets de notification sont post-commit. Date limite et statut mission contrôlés lors de la candidature.
- Livraison: contrôle de propriétaire et de candidature acceptée; mise à jour conditionnelle pour valider une fois; libération de fonds atomique `CONFIRMEE -> LIBEREE`. Les effets de notification/email restent hors transaction métier.
- Paiement: index unique partiel `uq_transaction_active_par_candidature`; montant dérivé du prix convenu; moyen bénéficiaire vérifié et snapshoté; webhook et polling vérifient le fournisseur. PAI-01 et PAI-02 restent les risques dominants.
- TypeORM: le CLI DataSource déclare `synchronize: false`, entités/migrations par glob. Aucun `migration:run`, `synchronize`, seed ni connexion PostgreSQL n'a été exécuté. Il est donc impossible de certifier la compatibilité réelle des 26 entités avec l'état DB, les contraintes installées, les index, ou l'absence d'orphelins. Les index partiels existent dans les migrations trouvées, mais leur présence en base n'a pas été vérifiée.
- Des listes sont plafonnées pour missions/services/étudiants et notifications, et le matching plafonne son calcul. Les conversations et listes de livraisons/candidatures sont chargées sans pagination visible dans les services lus; risque de coût croissant à mesurer sur données synthétiques.

## 7. Compatibilité frontend/backend

- URL de base frontend: `NEXT_PUBLIC_API_URL || http://localhost:3000/api/v1`; le client gère access token mémoire, refresh cookie + CSRF, rejoue après 401, convertit les erreurs en `ApiError`, et prend en charge `FormData`.
- Les usages vérifiés s'alignent sur les routes: auth, missions/services, candidatures, livraisons/évaluations, paiements, clients/étudiants, groupes/messages, notifications, uploads et filtres. L'annuaire étudiants et les profils sont volontairement réservés aux membres côté frontend comme côté backend.
- Aucun mismatch certain de chemin/méthode n'a été confirmé par la comparaison statique. Les génériques TypeScript du frontend sont déclaratifs et ne sont pas générés depuis Swagger; les builds ne détectent donc pas une propriété de réponse serveur manquante ou un champ facultatif devenu obligatoire.
- Pas de tests d'API live, d'upload multipart ou de renouvellement de session n'ont été exécutés; formats JSON, erreurs réseau/CORS et cookies en production restent à tester en E2E.

## 8. Résultats de vérification

| Commande | Résultat |
|---|---|
| Backend `npm run build` | PASS (`nest build`). |
| Frontend `npm run build` | PASS (Next 16.3.8; compilation, TypeScript, génération de 36 routes). |
| Frontend `npm run lint` | FAIL: 3 erreurs dans `src/components/ui/Field.tsx` lignes 53, 54, 62; 6 avertissements dans les pages amis/moyens de paiement client, HeroAccueil, Navbar, Sidebar et `src/lib/api.ts`. |
| Backend `npm run lint` | Non lancé: script contient `--fix`, interdit par la phase lecture seule. Équivalent non-mutant `npx eslint 'src/**/*.ts' 'test/**/*.ts'` exécuté: FAIL, 39 erreurs; avertissement TypeScript 5.9.3 hors plage supportée du parser `<5.6`. Les erreurs détaillées apparaissent dans migrations `179900...`, `180000...`, templates email et scripts du dossier `test`. |
| `npm test`, `npm run test:e2e` | Scripts absents des deux `package.json`; non exécutables. Les fichiers `backend/test/*.ts` sont des scripts autonomes et aucun runner Jest/Supertest n'est déclaré dans les scripts. |
| Diagnostics IDE (`get_errors`) | Aucune erreur remontée pour les répertoires `src` backend et frontend. |
| PostgreSQL/migrations | Non exécutés; base de test isolée non établie dans cet audit. |
| État git | `git status --short` était vide avant la création de ce rapport. Le seul ajout de cette phase est le présent livrable Markdown; aucun fichier source n'a été modifié. |

## 9. Tests non exécutés

- Tests unitaires, HTTP/E2E et scénarios négatifs: aucun script npm correspondant.
- Propriétaire étranger/non connecté/rôle incorrect, identifiants mal formés, doublons et transitions incompatibles: non exercés par requêtes HTTP.
- Courses d'acceptation, paiements, validation de livraison et concurrence MVola: non simulées.
- PostgreSQL isolé, migrations/contraintes réelles, requêtes SQL, plans d'exécution et N+1: non vérifiés.
- Défaillances SMTP/MVola, webhook HMAC, cookies/CORS et uploads malveillants: non exercés.

## 10. Plan de correction priorisé (à autoriser avant toute modification)

1. **Sécuriser l'idempotence MVola (PAI-01)** — `paiements.service.ts`, `transaction.entity.ts`, migration à préparer seulement après autorisation. Tests de concurrence à deux POST identiques, panne entre initiation et persistance, retry fournisseur et réconciliation d'une réponse ambiguë.
2. **Rendre annulation/confirmation concurrentes atomiques (PAI-02)** — `paiements.service.ts`. Test concurrent confirmé/annulé, seconde transition 409, invariant d'une seule transaction active conservé.
3. **Empêcher l'aspiration globale des commentaires (API-01)** — `commentaires.controller.ts`, DTO de query et `commentaires.service.ts`; exiger cibleType/cibleId, valider enum/UUID, paginer/plafonner et rejeter les critères `undefined`. Test anonyme sans query ne retournant aucune collection globale.
4. **Valider les query enum à l'entrée (API-02)** — `admin.controller.ts`, `paiements.controller.ts`, `signalements.controller.ts`, `favoris.controller.ts`, `commentaires.controller.ts`, `reactions-contenu.controller.ts`; tests valeur correcte/incorrecte, 400 stable au lieu d'une erreur DB.
5. **Interdire `synchronize` en production (DB-01)** — `app.module.ts` et éventuellement `database.config.ts`; test de configuration de démarrage sans connexion à une base réelle.
6. **Rendre les effets post-commit rejouables (OPS-01)** — paiements/livraisons et modules notifications/emails; tests d'échec secondaire après commit et reprise idempotente sans double notification/paiement.
7. **Rétablir les gates lint sans auto-fix** — frontend `Field.tsx` et fichiers signalés par ESLint backend; tests: lint non-mutant, builds backend/frontend. Le lint backend prévu avec `--fix` ne doit être réactivé qu'après revue explicite des changements attendus.
8. **Ajouter des tests isolés API** — scripts/CI backend: tests de propriété, rôle, transition et DTO; PostgreSQL de test synthétique distinct de la production; aucun test ne doit lancer de migration destructive hors fixture dédiée.

**Aucun correctif n'a été appliqué. Toute modification reste en attente d'autorisation.**
