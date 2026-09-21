# RAPPORT FINAL KIANJA

Mission : finalisation des règles de gestion RG-001 → RG-068.
Référentiel : `regledegestion.txt`. Aucune règle n'est déclarée confirmée sans
justification côté backend. Tous les builds passent (voir « Tests effectués »).

---

## 1. RG-060 — Sécurité d'accès aux groupes

**Résultat : CONFIRMÉE.**

Analyse effectuée :

- `GroupesController` : toute la classe est protégée par `@UseGuards(JwtAuthGuard)` ;
  un utilisateur non authentifié ne peut donc même pas atteindre `GET /groupes/:id`.
- `GroupesService.findOne(id, utilisateurId)` : le groupe et ses membres sont
  chargés, puis **une vérification d'appartenance est appliquée** :
  `membre actif → accès autorisé`, `non membre → 403 ForbiddenException`
  (« Vous n'êtes pas membre de ce groupe. »). Groupe inexistant → 404.
- Le chef est un membre (rôle `chef`) : il passe par la même vérification.
- Aucun accès admin supplémentaire n'a été créé (conformément à la mission,
  l'admin n'a pas de route groupes dédiée dans l'architecture existante).
- Contournement via d'autres endpoints vérifié :
  - `MessagesService` (discussion de groupe) appelle
    `GroupesService.verifierMembreActif(groupeId, userId)` à chaque opération
    (envoi, listing, suppression) — `messages.service.ts` lignes 581, 701, 747, 793 ;
  - `GET /groupes/:id/invitations` → réservé au chef (`verifierChef`) ;
  - `GET /groupes/invitations/:invitationId` → réservé au destinataire ;
  - `GET /groupes/mes-groupes` → ne renvoie que les groupes de l'appelant ;
  - il n'existe aucune autre route renvoyant la liste des membres d'un groupe.

Logique existante de la discussion de groupe conservée telle quelle.

Fichiers : `freelance-etudiant-backend/src/modules/groupes/groupes.controller.ts`,
`freelance-etudiant-backend/src/modules/groupes/groupes.service.ts`.

---

## 2. RG-061 à RG-064 — Gestion complète des groupes et invitations

**Résultat : RG-061, RG-062, RG-064 (annulation) CONFIRMÉES. RG-063 et
l'expiration automatique (RG-064) : DÉCISION MÉTIER NÉCESSAIRE.**

### RG-061 — Départ d'un membre : CONFIRMÉE

- `POST /groupes/:id/quitter` (réservé aux étudiants) → `GroupesService.quitter()` :
  - un membre actif peut quitter (la ligne `membres_groupes` est supprimée —
    pas de soft delete existant dans ce modèle ; l'historique du groupe, ses
    messages et ses invitations ne sont jamais touchés) ;
  - le chef ne peut PAS quitter tant qu'il n'a pas transféré son rôle
    (400 : « Le chef doit transférer son rôle avant de quitter le groupe. »)
    → jamais de groupe sans chef ;
  - le groupe peut exister sans mission : rien ne dépend de `missionId`.

### RG-062 — Retrait d'un membre / transfert du chef : CONFIRMÉE

- `DELETE /groupes/:id/membres/:etudiantId` → `GroupesService.retirerMembre()` :
  - seul le chef peut retirer un membre (`verifierChef` → 403 sinon) ;
  - le chef ne peut pas se retirer lui-même via cette action (400) ;
  - impossible de retirer le chef via cette action (400) : le transfert est
    l'unique voie.
- `PATCH /groupes/:id/chef` → `GroupesService.transfererChef()` :
  - transaction TypeORM avec verrous `pessimistic_write` sur la ligne chef et
    la ligne membre cible → **atomique**, jamais deux chefs actifs, jamais
    d'état intermédiaire sans chef ;
  - transfert uniquement vers un membre actif du groupe (404 sinon) ;
  - l'ancien chef devient `membre`, le nouveau devient `chef` dans la même
    transaction.

### RG-063 — Limite du nombre de membres : DÉCISION MÉTIER NÉCESSAIRE

Aucune limite n'existe dans le code, les constantes (`src/common/constants`
est vide), les DTO ou le cahier des charges fourni. **Aucune valeur arbitraire
n'a été imposée** (consigne explicite). Le service `inviter()` est prêt à
recevoir la règle dès qu'une valeur métier sera décidée.

### RG-064 — Annulation des invitations : CONFIRMÉE (partie annulation)

- Nouveau statut `ANNULEE = 'annulee'` ajouté à `StatutInvitationGroupe`
  + migration enum PostgreSQL (voir « Migrations créées »).
- `DELETE /groupes/invitations/:invitationId` → `GroupesService.annulerInvitation()` :
  réservé au chef du groupe, uniquement si l'invitation est `EN_ATTENTE` (400 sinon).
- Transitions verrouillées par le statut courant :
  - `EN_ATTENTE → ACCEPTEE` (accepter) ; `EN_ATTENTE → REFUSEE` (refuser) ;
    `EN_ATTENTE → ANNULEE` (chef) ;
  - une invitation `ACCEPTEE`/`REFUSEE`/`ANNULEE` ne peut plus être acceptée
    ni refusée (400 « Cette invitation a déjà été traitée. » / « Seule une
    invitation en attente peut être annulée. »).
- Courses concurrentes : `accepterInvitation` s'exécute dans une transaction ;
  le statut et l'absence d'adhésion existante sont re-vérifiés avant insertion.

**Expiration automatique : NON IMPLÉMENTÉE — aucune durée métier n'existe
dans le projet (ni code, ni cahier des charges). Rien n'a été inventé.**

### Interface groupes (existante, réutilisée)

Page `/tableau-de-bord/groupes/[id]` (composants Kianja : `NoticeCard`,
`Button`, `Tag`, `Field`, `confirmer()` pour les actions destructives) :

- Chef : inviter (PanneauInvitation), retirer un membre, transférer le rôle de
  chef (confirmation), annuler une invitation en attente (confirmation), voir
  les invitations avec statut et date ;
- Membre : bouton « Quitter le groupe » (confirmation) ;
- Invitation reçue : page `/tableau-de-bord/groupes/invitations/[id]` avec
  accepter / refuser, statut (`statutInvitationGroupeLabel` + « annulée ») et date ;
- états chargement / succès / erreur partout (`executerAction`, `actionEnCours`) ;
- la discussion de groupe (`DiscussionGroupe`, Socket.IO) n'a pas été modifiée.

Fichiers : `groupes.controller.ts`, `groupes.service.ts`,
`statut-invitation-groupe.enum.ts`, `format.ts` (labels),
`app/tableau-de-bord/groupes/[id]/page.tsx`,
`app/tableau-de-bord/groupes/invitations/[id]/page.tsx`,
`components/groupes/DiscussionGroupe.tsx`.

---

## 3. RG-067 — Annulation / modification des candidatures

**Résultat : CONFIRMÉE.**

Modèle inspecté : `StatutCandidature = EN_ATTENTE | ACCEPTEE | REFUSEE` —
**aucun nouveau statut n'a été créé**.

- Qui : uniquement l'étudiant propriétaire (`assertModificationAutorisee` → 403
  sinon). Pour une candidature de groupe, seul le **chef** du groupe peut
  modifier/annuler (403 sinon).
- Quoi / quand :
  - `PATCH /candidatures/:id` → modification de `prixPropose`, `delaiPropose`,
    `message`, uniquement si statut `EN_ATTENTE` ET mission encore ouverte
    aux candidatures (`assertMissionOuverteAuxCandidatures` : date limite et
    statut de mission re-vérifiés côté backend à chaque modification) ;
  - `DELETE /candidatures/:id` → annulation, uniquement si `EN_ATTENTE`.
- Impossible (protégé backend) :
  - modifier/annuler après acceptation ou refus (409 —
    `assertModificationAutorisee`, puis `UPDATE`/`DELETE` **conditionnels** sur
    `statut = EN_ATTENTE`, `affected === 0 → 409`) ;
  - contourner la date limite (re-vérification à chaque PATCH) ;
  - contourner la propriété de la mission (accepter/refuser restent réservés
    au client propriétaire — RG-025 inchangé) ;
  - contourner les règles de groupe (chef uniquement) ;
  - impacter livraison/paiement (RG-028+) : une candidature acceptée ne peut
    plus changer de statut.
- Courses concurrentes : `modifier`/`annuler` utilisent un `UPDATE`/`DELETE`
  conditionnel sur le statut courant ; l'acceptation concurrente (RG-026,
  elle-même sérialisée) ne peut jamais être écrasée.
- Après acceptation : cycle existant RG-028 → RG-039 (livraison, paiement,
  évaluation). Après refus : `REFUSEE` définitif ; l'annulation (suppression de
  la ligne `EN_ATTENTE`) rend une nouvelle candidature possible tant que la
  mission est ouverte — cohérent avec RG-023 (pas de doublon simultané).
- Frontend : `/tableau-de-bord/candidatures` affiche « Modifier » / « Annuler »
  (avec confirmation) uniquement pour les candidatures en attente ; le backend
  re-vérifie toujours la règle.

Fichiers : `candidatures.controller.ts`, `candidatures.service.ts`,
`app/tableau-de-bord/candidatures/page.tsx`.

---

## 4. RG-065 / RG-066 — Compléter les évaluations

### RG-065 — Modification / suppression : modification CONFIRMÉE, suppression DÉCISION MÉTIER

- **Modification (implémentée)** : `PATCH /evaluations/:id` —
  `EvaluationsService.modifier()` :
  - seul l'auteur peut modifier SA propre évaluation (`evaluateurId` comparé,
    403 sinon) — protection anti-modification par un autre utilisateur ;
  - accessible aux deux rôles évaluateurs (`@Roles(CLIENT, ETUDIANT)`) ;
  - note revalidée par `CreateEvaluationDto` (entier 1 à 5, RG-039/06 inchangé) ;
  - aucun délai de modification imposé : **aucune règle de délai n'existe dans
    le projet** (ni RG-007 ni le cahier des charges) — rien n'a été inventé ;
  - RG-037 respecté : la modification ne crée jamais de seconde évaluation,
    la livraison reste unique par évaluateur (contrainte DB, voir RG-066).
- **Suppression (non implémentée — décision métier)** : l'entité `Evaluation`
  documente explicitement RG-007 : « une évaluation est un enregistrement de
  confiance permanent ». Toutes ses relations sont en `RESTRICT`. Implémenter
  une suppression contredirait cette architecture ; aucune suppression n'a
  été ajoutée (ni logique : aucun pattern `deletedAt` n'existe dans ce module).
  → à trancher (voir « Décisions métier »).

### RG-066 — Évaluation du client par l'étudiant : CONFIRMÉE

Le modèle existant (`evaluateurId`/`evalueId` génériques) supporte nativement
une évaluation bidirectionnelle : **adapter, pas reconstruire**.

- Backend :
  - `POST /livraisons/:livraisonId/evaluation-client`
    (`@Roles(ETUDIANT)`) → `EvaluationsService.creerParEtudiant()` ;
  - conditions vérifiées côté backend :
    1. l'étudiant a réellement participé : la livraison appartient à SA
       candidature acceptée (`candidature.etudiantId` → 403 sinon) ;
    2. la livraison est validée (`assertLivraisonValidee`) ;
    3. la mission est terminée selon les règles existantes : paiement
       `CONFIRMEE` ou `LIBEREE` exigé (`assertPaiementConfirme`, logique
       partagée avec le parcours client → étudiant) ;
    4. anti-doublon : pré-vérification + contrainte DB
       `UNIQUE(livraison_id, evaluateur_id)` (23505 → 409) — anti-fraude
       structurel ;
    5. note entière 1 à 5 (DTO + contrainte CHECK existantes) ;
    6. notification au client via le système existant
       (`TypeNotification.NOUVELLE_EVALUATION`).
  - pas de clôture de mission ici : le passage à `TERMINEE` reste porté par
    l'évaluation du client (événement de fin de projet existant) ;
    pas de recalcul de réputation (la réputation concerne les étudiants).
- DB : migration `1802000000000-EvaluationBidirectionnelle` — remplacement de
  `UNIQUE(livraison_id)` par `UNIQUE(livraison_id, evaluateur_id)`.
  **Justification** : RG-037 est préservé PAR AUTEUR (une seule évaluation par
  auteur et par livraison) ; une livraison peut porter au maximum deux
  évaluations (une par direction). Sans cette migration, le parcours inverse
  était structurellement impossible.
- Frontend : page `/tableau-de-bord/livraisons` (vue étudiant) — bloc
  « Évaluer le client » affiché uniquement si livraison validée + paiement
  confirmé ; affichage « Votre évaluation du client : X/5 » + modification
  (PATCH RG-065). La vue client filtre désormais les évaluations par
  `evaluateurId` pour ne jamais afficher l'évaluation de l'étudiant comme la
  sienne. Chargement des paiements reçus (`GET /paiements/recus`) ajouté à la
  vue étudiant pour conditionner l'affichage.
- Les évaluations existantes (client → étudiant) ne sont pas modifiées :
  même table, mêmes données, contrainte plus fine seulement.

---

## 5. RG-054 — Finaliser Publications

**Résultat : CONFIRMÉE.**

« Publications » n'est pas une nouvelle entité : le catalogue regroupe les
contenus métier existants (missions + services).

- `/publications` (page publique) :
  - onglets **Toutes / Missions clients / Services étudiants** (compteurs) ;
  - données chargées via les endpoints publics existants
    `GET /missions` et `GET /services` (tous deux `@Public()` côté backend →
    les règles backend de visibilité sont respectées, rien n'est contourné) ;
  - réutilisation des cartes existantes `CarteMission` / `CarteService` :
    titre, description, prix, auteur, date limite si pertinente, et badges
    d'identification claire CLIENT (missions) / ÉTUDIANT (services) ;
  - favoris + réactions de contenu continuent de fonctionner sur ces cartes
    (aucun système parallèle créé).
- « Mes publications » (`/tableau-de-bord/mes-publications`) :
  - client → uniquement `GET /missions/me/mes-missions` (ses missions) ;
  - étudiant → uniquement `GET /services/me/mes-services` (ses services) ;
  - jamais les contenus d'un autre utilisateur ; les actions de gestion
    renvoient vers les pages de gestion existantes (`mes-missions`,
    `mes-services`) qui appellent les mêmes endpoints — aucun doublon.
- Navbar publique (`NavbarPublique.tsx`) : liens **Accueil / Publications /
  Missions / Services** ; Footer : lien « Publications » ; dashboard
  (`nav-links.ts`) : « Mes publications » par rôle. Aucun design modifié
  (Slate/Zilla Slab/Inter/IBM Plex Mono, dark mode, responsive conservés).
- Aucune entité métier créée, aucune nouvelle route backend nécessaire.

Fichiers : `app/publications/page.tsx`,
`app/tableau-de-bord/mes-publications/page.tsx`, `lib/nav-links.ts`,
`components/layout/NavbarPublique.tsx`, `components/layout/Footer.tsx`,
`components/ui/CarteMission.tsx`, `components/ui/CarteService.tsx`.

---

## 6. RG-068 — Intégrité des cibles polymorphes

**Résultat : CONFIRMÉE (validation applicative centralisée).**

Analyse : `commentaires`, `reactions-contenu` et `favoris` stockent
`(cible_type, cible_id)` sans clé étrangère — une contrainte SQL générale est
impossible avec une cible polymorphe (consigne : ne pas en ajouter).
Solution : **validation centralisée réutilisable** dans l'architecture existante.

- Nouveau service partagé `src/common/services/verification-cible.service.ts`
  (`VerificationCibleService.assertCibleExistante(cibleType, cibleId)`),
  exposé via un nouveau `CommonModule` (`src/common/common.module.ts`) qui
  réutilise les services métier déjà exportés (`MissionsService`,
  `ServicesService`, `UsersService`) — aucun module métier remplacé.
- Vérifications appliquées AVANT écriture :
  - `CommentairesService.creer()` : la cible mission/service doit exister
    (404 sinon) — auparavant l'enregistrement était persisté AVANT la
    résolution du propriétaire (un commentaire orphelin pouvait être créé) ;
  - `ReactionsContenuService.reagir()` : validation à la création ET au
    changement de type (UPDATE) ;
  - `FavorisService.toggle()` : validation à la création (mission, service,
    ou étudiant — pour `etudiant`, le compte doit exister ET avoir le rôle
    ETUDIANT).
- Types autorisés : garantis par les DTO (`@IsEnum(TypeCibleContenu)` /
  `@IsEnum(TypeCibleFavori)`, déjà présents) et par le `switch` du service.
- Utilisateur autorisé : les opérations restent derrière `JwtAuthGuard` global
  (`APP_GUARD`) et la propriété (auteur/propriétaire) est vérifiée par les
  services existants (commentaires : auteur ; favoris/réactions : lignes
  propres à l'utilisateur).
- `DELETE/REMOVE` : le retrait reste TOUJOURS possible même si la cible a
  disparu entre-temps (sinon les orphelins deviendraient impossibles à
  nettoyer). Ce choix est documenté dans le code.
- Rien n'est cassé : les fonctionnalités commentaires/réactions (temps réel
  Socket.IO inclus, mentions, notifications) sont inchangées ; seules des
  vérifications préalables ont été ajoutées.

Fichiers : `common/services/verification-cible.service.ts` (nouveau),
`common/common.module.ts` (nouveau), `modules/commentaires/*`,
`modules/reactions-contenu/*`, `modules/favoris/*`.

---

## 7. QA RG-001 → RG-068

Méthode : vérification du code réel (backend + frontend + migrations),
parcours par parcours. Colonnes : Backend = la règle est garantie côté serveur ;
Frontend = représentée/assistance dans l'UI ; DB = contrainte/structure en base ;
Test = vérification effectuée (aucune infrastructure de tests automatisés
n'existe dans le projet : aucun `*.spec.ts`, aucun runner installé — la
vérification s'est donc faite par analyse de code + builds, cf. § Tests).

| ID | Règle | Backend | Frontend | DB | Test | Résultat |
|----|-------|---------|----------|----|------|----------|
| RG-001 | Rôles (etudiant/client/admin) | RolesGuard + enum Role | ✓ sélection du rôle | enum role | Analyse code + build | CONFIRMÉE |
| RG-002 | Pas d'auto-attribution admin à l'inscription | register refuse ADMIN | ✓ choix limité | — | Analyse code | CONFIRMÉE |
| RG-003 | Email unique | assertEmailDisponible | ✓ message | UNIQUE email | Analyse code | CONFIRMÉE |
| RG-004 | Mot de passe ≥ 8 + bcrypt | register.dto + bcrypt | ✓ | — | Analyse code | CONFIRMÉE |
| RG-005 | Email vérifié avant connexion | verifierEmail/login | ✓ pages vérification | emailVerifie | Analyse code | CONFIRMÉE |
| RG-006 | Compte actif/non suspendu | login + validation JWT | ✓ | estActif/estSuspendu | Analyse code | CONFIRMÉE |
| RG-007 | Access + refresh token | auth.service | ✓ refresh auto | — | Analyse code | CONFIRMÉE |
| RG-008 | Réinitialisation mot de passe | reset token | ✓ pages | tokens | Analyse code | CONFIRMÉE |
| RG-009 | Administration des comptes | admin routes + RolesGuard | ✓ /admin | — | Analyse code | CONFIRMÉE |
| RG-010 | Mission créée par un client | @Roles(CLIENT) + service | ✓ formulaire | FK client | Analyse code | CONFIRMÉE |
| RG-011 | Date limite future | DTO validation | ✓ | — | Analyse code | CONFIRMÉE |
| RG-012 | Candidatures après date limite refusées | assertMissionOuverteAuxCandidatures | ✓ | — | Analyse code (+ réutilisé par RG-067) | CONFIRMÉE |
| RG-013 | Expiration automatique des missions | ExpirationMissionsService (cron) | ✓ | statut | Analyse code | CONFIRMÉE |
| RG-014 | Catalogue public des missions | @Public() GET /missions | ✓ /missions, /publications | — | Analyse code + build | CONFIRMÉE |
| RG-015 | Propriétaire de la mission | clientId vérifié | ✓ | FK | Analyse code | CONFIRMÉE |
| RG-016 | Mission terminée/fermée non modifiable | update refusé selon statut | ✓ | — | Analyse code | CONFIRMÉE |
| RG-017 | Suppression limitée des missions | règles statut + RESTRICT | ✓ | FK | Analyse code | CONFIRMÉE |
| RG-018 | Service publié par un étudiant | @Roles(ETUDIANT) | ✓ | FK | Analyse code | CONFIRMÉE |
| RG-019 | Visibilité publique d'un service | @Public() GET /services | ✓ /services, /publications | disponible/archivé | Analyse code + build | CONFIRMÉE |
| RG-020 | Archivage logique d'un service | statut archivé | ✓ | statut | Analyse code | CONFIRMÉE |
| RG-021 | Commande d'un service | DemandesService + mission privée | ✓ | — | Analyse code | CONFIRMÉE |
| RG-022 | Acceptation d'une commande | propriétaire + statut | ✓ | — | Analyse code | CONFIRMÉE |
| RG-023 | Une candidature individuelle par mission | unicité vérifiée + 409 | ✓ | — | Analyse code | CONFIRMÉE |
| RG-024 | Statuts de candidature | enum + transitions | ✓ | enum | Analyse code | CONFIRMÉE |
| RG-025 | Traitement par le client propriétaire | clientId vérifié | ✓ | — | Analyse code | CONFIRMÉE |
| RG-026 | Acceptation concurrente sérialisée | UPDATE conditionnel + 409 | ✓ | — | Analyse code | CONFIRMÉE |
| RG-027 | Candidature de groupe | chef + membres vérifiés | ✓ | FK groupes | Analyse code (+ RG-067 cohérent) | CONFIRMÉE |
| RG-028 | Dépôt par l'étudiant concerné | candidature acceptée exigée | ✓ | FK | Analyse code | CONFIRMÉE |
| RG-029 | Formats de livrables | DTO/service validation | ✓ upload | pièces jointes | Analyse code | CONFIRMÉE |
| RG-030 | Une livraison persistante par candidature | unicité | ✓ | UNIQUE | Analyse code | CONFIRMÉE |
| RG-031 | Livraison validée non modifiable | refus selon statut | ✓ | — | Analyse code | CONFIRMÉE |
| RG-032 | Validation ou demande de correction | client propriétaire | ✓ livraisons | — | Analyse code | CONFIRMÉE |
| RG-033 | Paiement après validation | statut livraison vérifié | ✓ paiements | FK | Analyse code | CONFIRMÉE |
| RG-034 | Montant = prix convenu | prixPropose source | ✓ affichage | — | Analyse code | CONFIRMÉE |
| RG-035 | Une transaction active par candidature | contrainte partielle | ✓ | UNIQUE partiel | Analyse code | CONFIRMÉE |
| RG-036 | Cycle des paiements | enum statuts + transitions | ✓ | enum | Analyse code | CONFIRMÉE |
| RG-037 | Une évaluation par livraison (par auteur) | pré-vérif + UNIQUE(livraison, evaluateur) | ✓ | UNIQUE composite (migration 1802000000000) | Analyse code + build | CONFIRMÉE (précisée RG-066) |
| RG-038 | Évaluation après livraison validée ET paiement confirmé | assertLivraisonValidee + assertPaiementConfirme (2 directions) | ✓ workflow | — | Analyse code | CONFIRMÉE |
| RG-039 | Note entière 1 à 5 | DTO + CHECK | ✓ | CHECK | Analyse code | CONFIRMÉE |
| RG-040 | Création d'un groupe, chef initial | transaction + rôle chef | ✓ groupes | FK | Analyse code | CONFIRMÉE |
| RG-041 | Groupe avec ou sans mission | missionId optionnel | ✓ | FK nullable | Analyse code | CONFIRMÉE |
| RG-042 | Invitation réservée au chef | verifierChef | ✓ panneau | — | Analyse code | CONFIRMÉE |
| RG-043 | Acceptation/refus par le destinataire | inviteId vérifié | ✓ page invitation | statut | Analyse code | CONFIRMÉE |
| RG-044 | Unicité membres et invitations | vérifs + 400/409 | ✓ | — | Analyse code | CONFIRMÉE |
| RG-045 | Messagerie de groupe | verifierMembreActif + Socket.IO | ✓ DiscussionGroupe | — | Analyse code | CONFIRMÉE |
| RG-046 | Messagerie privée | contacts candidature acceptée | ✓ messages | — | Analyse code | CONFIRMÉE |
| RG-047 | Suppression logique d'un message | soft delete | ✓ | supprimeDe | Analyse code | CONFIRMÉE |
| RG-048 | Notifications personnelles | destinataireId strict | ✓ NotificationBell | FK | Analyse code | CONFIRMÉE |
| RG-049 | Lecture/suppression notifications | propriétaire vérifié | ✓ | — | Analyse code | CONFIRMÉE |
| RG-050 | Commentaires sur missions/services | @Public lecture + auteur écriture | ✓ commentaires | FK cible | Analyse code | CONFIRMÉE |
| RG-051 | Mentions @ | parsing + unicité + notifications | ✓ autocomplete | table mentions | Analyse code | CONFIRMÉE |
| RG-052 | Réactions de profil | toggle propriétaire | ✓ profils | UNIQUE | Analyse code | CONFIRMÉE |
| RG-053 | Réactions sur contenu | toggle + compteurs | ✓ BoutonsReaction | UNIQUE | Analyse code (+ RG-068) | CONFIRMÉE |
| RG-054 | Distinction catalogue/missions/services/mes publications | visibilité @Public respectée | ✓ /publications, /tableau-de-bord/mes-publications, navbar | — (aucune nouvelle table) | Analyse code + build | CONFIRMÉE |
| RG-055 | Profils publics | @Public lecture | ✓ /etudiants/[id] | — | Analyse code | CONFIRMÉE |
| RG-056 | Modification de son propre profil | propriétaire vérifié | ✓ /profil | — | Analyse code | CONFIRMÉE |
| RG-057 | Historique financier/évaluations protégé | accès par propriétaire | ✓ | — | Analyse code | CONFIRMÉE |
| RG-058 | Affichage du bouton de candidature | règles réelles backend (statut/date/unicité) | ✓ bouton conditionné | — | Analyse code | CONFIRMÉE (UI = UX, backend = garantie) |
| RG-059 | Protection du tableau de bord | JwtAuthGuard GLOBAL (APP_GUARD) | ✓ redirections + sidebar | — | Analyse code | CONFIRMÉE (reclassée : backend global + frontend) |
| RG-060 | Accès aux détails d'un groupe | findOne vérifie l'appartenance (403), JwtAuthGuard | ✓ page groupe | — | Analyse code + build | CONFIRMÉE |
| RG-061 | Départ d'un membre | POST /quitter + interdiction chef sans transfert | ✓ bouton | suppression ligne adhésion | Analyse code + build | CONFIRMÉE |
| RG-062 | Retrait membre + transfert chef | chef seul, atomique, verrous | ✓ UI chef | — | Analyse code + build | CONFIRMÉE |
| RG-063 | Limite du nombre de membres | NON — aucune valeur métier existante | n/a | — | — | NON IMPLÉMENTÉE — [DÉCISION MÉTIER NÉCESSAIRE] |
| RG-064 | Expiration/annulation invitation | annulation par le chef OK ; expiration NON (aucune durée métier) | ✓ bouton annuler | enum 'annulee' (migration 1801000000000) | Analyse code + build | PARTIELLEMENT IMPLÉMENTÉE (annulation CONFIRMÉE ; expiration = [DÉCISION MÉTIER NÉCESSAIRE]) |
| RG-065 | Modification/suppression évaluation | modification propriétaire OK ; suppression NON (RG-007 : permanence) | ✓ Modifier (client ET étudiant) | — | Analyse code + build | PARTIELLEMENT IMPLÉMENTÉE (modification CONFIRMÉE ; suppression = [DÉCISION MÉTIER NÉCESSAIRE]) |
| RG-066 | Évaluation du client par l'étudiant | creerParEtudiant : participation + validation + paiement + anti-doublon DB | ✓ « Évaluer le client » | UNIQUE(livraison, evaluateur) (migration 1802000000000) | Analyse code + build | CONFIRMÉE |
| RG-067 | Candidature modifiable/annulable | PATCH/DELETE propriétaire + EN_ATTENTE + date limite + course sérialisée | ✓ Modifier/Annuler | — | Analyse code + build | CONFIRMÉE |
| RG-068 | Cible polymorphe vérifiée | VerificationCibleService centralisé (CREATE + UPDATE) | — (transparent) | — (FK polymorphe impossible, choix documenté) | Analyse code + build | CONFIRMÉE (validation applicative) |

Synthèse : **63 CONFIRMÉES · 2 PARTIELLEMENT IMPLÉMENTÉES (RG-064, RG-065) ·
1 NON IMPLÉMENTÉE (RG-063) · 3 points en [DÉCISION MÉTIER NÉCESSAIRE]**
(RG-063 limite de membres, RG-064 expiration, RG-065 suppression).

---

## Fichiers modifiés

Backend (`freelance-etudiant-backend`) :

- `src/common/enums/statut-invitation-groupe.enum.ts` — statut `ANNULEE` (RG-064)
- `src/modules/groupes/groupes.controller.ts` — RG-060/061/062/064
- `src/modules/groupes/groupes.service.ts` — RG-060 (findOne), RG-061/062/064
- `src/modules/candidatures/candidatures.controller.ts` — RG-067 (PATCH/DELETE)
- `src/modules/candidatures/candidatures.service.ts` — RG-067 (modifier/annuler,
  transitions conditionnelles, garde groupe/chef)
- `src/modules/evaluations/evaluations.controller.ts` — RG-065/066 (PATCH 2 rôles,
  POST evaluation-client)
- `src/modules/evaluations/evaluations.service.ts` — RG-065 (modifier),
  RG-066 (creerParEtudiant, assertPaiementConfirme partagé)
- `src/modules/evaluations/entities/evaluation.entity.ts` — index composite
- `src/common/services/verification-cible.service.ts` — **nouveau** (RG-068)
- `src/common/common.module.ts` — **nouveau** (RG-068)
- `src/modules/commentaires/commentaires.module.ts`, `commentaires.service.ts` — RG-068
- `src/modules/reactions-contenu/reactions-contenu.module.ts`,
  `reactions-contenu.service.ts` — RG-068
- `src/modules/favoris/favoris.module.ts`, `favoris.service.ts` — RG-068
- `src/database/migrations/1801000000000-AddCancelledGroupInvitationStatus.ts` — **nouveau**
- `src/database/migrations/1802000000000-EvaluationBidirectionnelle.ts` — **nouveau**

Frontend (`freelance-etudiant-frontend`) :

- `src/app/tableau-de-bord/livraisons/page.tsx` — RG-065 (édition pour les deux
  rôles ; un bloc d'évaluation mal inséré cassait `tsc`, il a été rétabli au
  bon endroit), RG-066 (bloc « Évaluer le client », paiements reçus)
- `src/app/publications/page.tsx` — **nouveau** (RG-054)
- `src/app/tableau-de-bord/mes-publications/page.tsx` — **nouveau** (RG-054)
- `src/app/tableau-de-bord/groupes/[id]/page.tsx` — RG-061/062/064 UI
- `src/app/tableau-de-bord/groupes/invitations/[id]/page.tsx` — **nouveau** (RG-064)
- `src/app/tableau-de-bord/groupes/page.tsx`,
  `src/app/tableau-de-bord/candidatures/page.tsx` — RG-067 UI
- `src/components/groupes/DiscussionGroupe.tsx` — **nouveau** (réutilise Socket.IO existant)
- `src/lib/nav-links.ts`, `src/lib/format.ts`, `src/lib/types.ts` — liens/labels/types
- `src/components/layout/NavbarPublique.tsx`, `Navbar.tsx`, `Footer.tsx` — liens Publications
- `src/components/ui/CarteMission.tsx`, `CarteService.tsx` — réutilisés dans /publications

(Des ajustements d'identité visuelle Kianja effectués en début de mission sur
les pages auth/accueil sont également présents dans le dépôt de travail :
aucune modification structurelle.)

---

## Migrations créées

| Migration | Justification |
|-----------|---------------|
| `1801000000000-AddCancelledGroupInvitationStatus` | RG-064 : ajoute la valeur `'annulee'` au type enum PostgreSQL `invitations_groupes_statut_enum` (irréversible : PostgreSQL ne permet pas de retirer une valeur d'enum) |
| `1802000000000-EvaluationBidirectionnelle` | RG-066 : remplace `UNIQUE(livraison_id)` par `UNIQUE(livraison_id, evaluateur_id)` — RG-037 préservé par auteur, parcours inverse rendu possible |

Exécution : `npm run migration:run` (aucune exécution automatique ;
`synchronize: false` partout — le glob `src/database/migrations/*` charge
automatiquement les deux nouveaux fichiers).

---

## Routes/API ajoutées ou modifiées

| Méthode + route | Règle | Modification |
|-----------------|-------|--------------|
| `GET /groupes/:id` | RG-060 | comportement durci : 403 si non membre (route inchangée) |
| `POST /groupes/:id/quitter` | RG-061 | ajoutée |
| `DELETE /groupes/:id/membres/:etudiantId` | RG-062 | ajoutée |
| `PATCH /groupes/:id/chef` | RG-062 | ajoutée |
| `GET /groupes/:id/invitations` | RG-064 | ajoutée (chef) |
| `GET /groupes/invitations/:invitationId` | RG-064 | ajoutée (destinataire) |
| `DELETE /groupes/invitations/:invitationId` | RG-064 | ajoutée (chef, EN_ATTENTE uniquement) |
| `POST /groupes/invitations/:id/accepter` · `/refuser` | RG-064 | inchangées (statuts contrôlés) |
| `PATCH /candidatures/:id` | RG-067 | ajoutée (propriétaire, EN_ATTENTE, date limite re-vérifiée) |
| `DELETE /candidatures/:id` | RG-067 | ajoutée (propriétaire, EN_ATTENTE) |
| `PATCH /evaluations/:id` | RG-065 | modifiée : rôles CLIENT + ETUDIANT (propriété inchangée) |
| `POST /livraisons/:livraisonId/evaluation-client` | RG-066 | ajoutée (étudiant) |
| `POST /commentaires`, `POST /reactions-contenu`, `POST /favoris` | RG-068 | surface inchangée, validation de cible ajoutée en amont |

---

## Tests effectués

| Commande | Résultat |
|----------|----------|
| Backend `npm run build` (nest build) | ✅ 0 erreur |
| Frontend `npx tsc --noEmit` | ✅ 0 erreur (après correction d'un bloc d'évaluation mal inséré qui faisait échouer la compilation) |
| Frontend `npm run lint` (eslint) | ✅ 0 erreur, 7 avertissements préexistants (`<img>` next/image, variables inutilisées, deps useMemo) — non bloquants |
| Frontend `npm run build` (next build) | ✅ succès — `/publications` et `/tableau-de-bord/mes-publications` compilées |

Corrections de lint réalisées pour atteindre 0 erreur (5 erreurs
`react-hooks/set-state-in-effect` préexistantes dans des pages produites
durant cette mission) :

- `missions/page.tsx` et `services/page.tsx` : synchronisation URL → état
  différée d'un tick (dans le `setTimeout` déjà présent) ;
- `mes-services/page.tsx` : réinitialisation du formulaire par ajustement
  d'état pendant le rendu (clé `serviceId`, pattern officiel react.dev) et
  chargement différé d'un tick ;
- `components/amitie/BoutonRelation.tsx` : état `chargement` initialisé à
  `true` en mode autonome, plus de setState synchrone dans l'effet.

Tests automatisés backend : **aucune infrastructure de tests n'existe dans le
projet** (aucun `*.spec.ts`, aucun runner configuré dans `package.json`).
Conformément à la consigne (« ajouter/adapter les tests si une infrastructure
de test existe »), aucune suite n'a été créée de toutes pièces ; la
vérification s'est faite par analyse du code réel et par les builds. La mise
en place d'une infrastructure (Jest) reste à décider avec l'équipe.

Vérifications de parcours (analyse statique ciblée) : RG-060 (findOne +
contournements via messagerie/invitations), RG-061/062/064 (transitions de
statut), RG-067 (courses concurrentes via UPDATE/DELETE conditionnels),
RG-066 (chaîne livraison → candidature → paiement → anti-doublon DB),
RG-068 (les 3 modules), RG-054 (endpoints publics + pages).

---

## Règles encore non implémentées

- **RG-063** — limite maximale de membres d'un groupe : aucune valeur métier
  n'existe dans le projet ; non implémentée volontairement.
- **RG-064 (expiration automatique)** — aucune durée métier n'existe ; seule
  l'annulation par le chef est implémentée.
- **RG-065 (suppression d'une évaluation)** — non implémentée : contredirait
  RG-007 (« enregistrement de confiance permanent », relations RESTRICT).

Tout le reste (65 des 68 règles, y compris les parties confirmées de RG-064
et RG-065) est implémenté avec garantie backend.

---

## Décisions métier encore nécessaires

1. **[DÉCISION MÉTIER NÉCESSAIRE] RG-063** — nombre maximal de membres d'un
   groupe (aucune valeur dans le code, les constantes ou le cahier des
   charges). Une fois décidée, elle s'ajoute à un seul point :
   `GroupesService.inviter()`.
2. **[DÉCISION MÉTIER NÉCESSAIRE] RG-064** — durée d'expiration automatique
   des invitations (si retenue : s'inspirer du cron existant
   `ExpirationMissionsService` + nouveau statut `EXPIREE`).
3. **[DÉCISION MÉTIER NÉCESSAIRE] RG-065** — autoriser ou non la suppression
   d'une évaluation, en conflit potentiel avec RG-007 (permanence). Si oui :
   suppression logique à définir (aucun pattern `deletedAt` n'existe dans ce
   module).

FIN DU RAPPORT.