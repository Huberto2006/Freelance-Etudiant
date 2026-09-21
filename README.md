# Kianja — Freelance Étudiant

Application Next.js 16 + NestJS 11 + PostgreSQL, préparée pour
`kianja.arato.mg` avec Docker Compose et le Nginx existant du serveur.

## Architecture et ports

```text
kianja.arato.mg
      │
Nginx existant du serveur :80 (puis :443 après Certbot)
      │
127.0.0.1:3210 → gateway Nginx Docker :8080
                       ├── / → frontend Next.js :3000
                       └── /api/, /uploads/, /socket.io/ → backend NestJS :3000
                                                             └── db PostgreSQL :5432
```

**Seul `127.0.0.1:3210` est publié par Compose.** Ce port ne figure pas dans
la liste des ports déjà utilisés fournie. Les ports 3000, 5432 et 8080 sont
internes à des conteneurs distincts et ne réservent aucun port sur le serveur.
Les ports publics 80 et 443 restent gérés par le Nginx existant.

La base et les uploads ont des volumes persistants. Les images de production
utilisent Node.js 24, des installations `npm ci` et des processus Node sans
privilèges root. Les migrations compilées sont exécutées avant chaque démarrage
de l'API, avec une transaction par migration et `DB_SYNCHRONIZE=false`.
Les services attendent les contrôles de santé de leurs dépendances, selon le
[mécanisme de démarrage Compose](https://docs.docker.com/compose/how-tos/startup-order/).

## Préparer le serveur

Prérequis : Docker Engine avec le plugin `docker compose`, Nginx déjà installé
sur l'hôte, et le DNS `kianja.arato.mg` pointant vers ce serveur. Si un
enregistrement AAAA existe, il doit lui aussi pointer vers le bon serveur.
Les ports publics 80 et 443 doivent être accessibles pour HTTP et Certbot.
La configuration hôte fournie suppose que ce Nginx tourne directement sur
l'hôte et utilise `sites-available` / `sites-enabled` (Debian/Ubuntu).

Copier le projet, par exemple dans `/opt/kianja`, **avec son `.env` à la racine**.
Le `.env` préparé contient déjà des secrets aléatoires indépendants pour
PostgreSQL, JWT, le renouvellement JWT et les webhooks. Il est ignoré par Git :
un clone ne le transporte pas. Le transférer séparément si nécessaire :

```bash
scp -P PORT_SSH .env utilisateur@SERVEUR:/opt/kianja/.env
```

Sur le serveur, depuis la racine du projet :

```bash
cd /opt/kianja
chmod 600 .env
docker compose version
docker network inspect kianja_net >/dev/null 2>&1 || \
  docker network create --subnet=10.232.0.0/16 kianja_net
sudo ss -ltnp 'sport = :3210'
docker compose config --quiet
docker compose up -d --build --wait --wait-timeout 240
docker compose ps
curl --fail http://127.0.0.1:3210/healthz
curl --fail -I http://127.0.0.1:3210/
```

Tous les services Compose utilisent le réseau Docker externe `kianja_net`.
Comme il est déclaré `external`, Compose le réutilise mais ne le crée et ne le
supprime pas.

Si le port 3210 a été pris entre-temps, choisir un autre port libre dans
`APP_HTTP_PORT` **et** dans le `proxy_pass` de
`deploy/nginx/kianja.arato.mg.conf`, puis recréer le gateway.
Les commandes Docker supposent que l'utilisateur a accès au daemon Docker ;
sinon les exécuter avec `sudo`.

Ne pas copier le `.env` dans les sous-projets : Compose injecte les variables
nécessaires à chaque service. Les fichiers `.env` et les uploads locaux sont
exclus des images. Sur une nouvelle base, le catalogue sera vide : aucun compte
de démonstration ni administrateur avec mot de passe public n'est créé.

Le seeder est volontairement manuel. Après le premier déploiement, créer ou
réinitialiser le compte administrateur avec les valeurs `ADMIN_EMAIL` et
`ADMIN_PASSWORD` du `.env` :

```bash
docker compose run --rm backend node dist/database/seeds/run-seed.js
```

Cette commande crée aussi les données et comptes de démonstration du seeder.

## Configurer les emails et MVola

Le `.env` préparé contient les accès SMTP fournis pour `mail.arato.mg:587`,
le compte `support@arato.mg` et l'expéditeur `ARATO <support@arato.mg>`.
Le mot de passe est présent uniquement dans le `.env` ignoré par Git ; le
modèle `.env.example` conserve une valeur vide pour `MAIL_PASSWORD`.

Les variables `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME` et `MAIL_PASSWORD`
sont reprises par les aliases `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` et
`SMTP_PASS`, que Docker Compose développe avant de les injecter dans NestJS.
`MAIL_FROM` reprend `MAIL_FROM_NAME` et `MAIL_FROM_ADDRESS`. Les références
`${MAIL_...}` doivent rester sans apostrophes afin de permettre
l'[interpolation Compose](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/).

Avec le port 587, `SMTP_SECURE=false` permet la négociation STARTTLS,
selon le [transport SMTP Nodemailer](https://nodemailer.com/smtp).
Pour TLS direct sur le port 465, utiliser `SMTP_SECURE=true`.
`MAIL_MAILER` et `MAIL_SCHEME` sont conservés avec les valeurs fournies ;
le transport est déjà SMTP dans ce backend. `CONTACT_MAIL_TO` est transmis
au backend, qui ne lit actuellement pas cette variable.

Le code exige la vérification de l'email avant connexion. Si les accès SMTP
sont supprimés, les liens sont uniquement journalisés dans les logs du
backend et aucun email n'est envoyé.

Le paiement MVola réel nécessite les quatre variables
`MVOLA_CONSUMER_KEY`, `MVOLA_CONSUMER_SECRET`, `MVOLA_API_KEY` et
`MVOLA_PARTNER_ID`. Elles restent vides car ces accès marchands ne sont pas
présents dans le dépôt. Sans elles, l'API de paiement en ligne renvoie 503.
Utiliser `MVOLA_BASE_URL=https://api.mvola.mg` pour les accès de production,
ou `https://devapi.mvola.mg` pour les accès sandbox.

Après modification des accès SMTP/MVola :

```bash
docker compose up -d --no-deps --force-recreate backend
```

## Déploiement automatique avec GitHub Actions

Le workflow `.github/workflows/deploy.yml` déploie les pushes sur `main`.
Il peut aussi être lancé depuis **Actions → Deployer Kianja → Run workflow**
en sélectionnant `main`. Les déploiements sont sérialisés et celui en cours
va jusqu'à son terme avant le suivant, avec la
[concurrence GitHub Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#concurrency).

Les secrets GitHub déjà indiqués sont utilisés directement :

| Secret | Valeur attendue |
| --- | --- |
| `SSH_HOST` | Adresse IP ou nom du serveur |
| `SSH_PORT` | Port SSH du serveur |
| `SSH_PRIVATE_KEY` | Clé privée SSH complète, utilisable sans saisie de passphrase |
| `SSH_USER` | Utilisateur SSH autorisé à écrire dans le dossier de l'application |
| `WORKDIR` | Chemin absolu dédié à cette application, par exemple `/opt/kianja` |

`WORKDIR` peut aussi être une variable GitHub Actions ; le secret est
prioritaire si les deux existent. La clé publique correspondante doit être
installée dans les `authorized_keys` de `SSH_USER`.

Une fois, avant le premier workflow : créer ce dossier sur le serveur avec
un propriétaire correspondant à `SSH_USER`, puis y copier le `.env` préparé.
Adapter l'exemple ci-dessous au port SSH et au chemin `WORKDIR` réels :

```bash
scp -P PORT_SSH .env utilisateur@SERVEUR:/opt/kianja/.env
```

Le serveur doit disposer de Bash, rsync, curl, flock, Docker et du plugin
Docker Compose. `SSH_USER` doit pouvoir utiliser Docker directement ou via
`sudo -n docker` sans mot de passe ; le script détecte les deux cas.
Le workflow vérifie les prérequis et la présence du `.env` **avant** rsync.
Il refuse un dossier système ou un dossier occupé par un autre projet et
crée le marqueur `.kianja-deployment` pour identifier l'application.

rsync copie le code dans `WORKDIR`, supprime les anciens fichiers de code
avec `--delete-after` et applique les exclusions de
`deploy/rsync-excludes.txt`. Le `.env`, les uploads locaux, les sauvegardes,
les fichiers Git et les dépendances de développement sont préservés ou
exclus, selon les [règles de protection rsync](https://download.samba.org/pub/rsync/rsync.1).
PostgreSQL et les uploads Docker restent dans leurs volumes persistants.
Les exclusions des uploads sont limitées à `/freelance-etudiant-backend/uploads/`
et `/uploads/` : le module NestJS `src/modules/uploads/` est transféré avec les
autres sources. Avant toute connexion SSH, le workflow teste une synchronisation
locale complète avec `deploy/test-rsync.sh` pour vérifier le transfert des sources
et la conservation du `.env`, des uploads et des sauvegardes.

`deploy/deploy.sh` valide Compose sans afficher ses secrets, construit les
images sur le serveur, démarre les services, attend leur état sain et contrôle
les URLs locales de l'API et du frontend. Une compilation échouée interrompt
le script avant le remplacement des conteneurs existants. Le script ne fait
pas de `docker compose down`, de suppression de volumes ou de nettoyage
global Docker. Une erreur de démarrage fait échouer le workflow ; consulter
alors les logs sur le serveur. Aucun retour arrière automatique de migration
de base de données n'est exécuté.

Les cinq secrets ci-dessus suffisent. Un secret supplémentaire facultatif
`SSH_KNOWN_HOSTS` permet de fournir la clé publique SSH connue du serveur.
Avec ce secret, la vérification est stricte ; sans lui, SSH accepte et
enregistre la clé lors de la première connexion de chaque runner, selon
[`StrictHostKeyChecking=accept-new`](https://man.openbsd.org/ssh_config#StrictHostKeyChecking).

Le virtual host Nginx et Certbot sont installés une fois avec les instructions
ci-dessous. Le pipeline met à jour les fichiers du projet ; il ne recopie
pas le virtual host dans `/etc/nginx` et conserve ainsi sa certification TLS.
Pour modifier les accès SMTP ou passer `FRONTEND_URL` à HTTPS, mettre à jour
le `.env` **sur le serveur**, puis relancer le workflow ou recréer le backend.

## Activer le reverse proxy HTTP

Le fichier `deploy/nginx/kianja.arato.mg.conf` est prêt à être installé.
Il route le domaine vers `127.0.0.1:3210`, prend en charge les uploads jusqu'à
20 Mo (l'API limite les documents à 15 Mo), et transmet les
[en-têtes WebSocket requis par Nginx](https://nginx.org/en/docs/http/websocket.html).

```bash
sudo cp deploy/nginx/kianja.arato.mg.conf /etc/nginx/sites-available/kianja.arato.mg.conf
sudo ln -s /etc/nginx/sites-available/kianja.arato.mg.conf /etc/nginx/sites-enabled/kianja.arato.mg.conf
sudo nginx -t
sudo systemctl reload nginx
curl --fail http://kianja.arato.mg/healthz
```

Si le lien symbolique existe déjà, conserver le lien et recopier seulement le
fichier. Si Nginx utilise uniquement `conf.d`, installer le fichier dans
`/etc/nginx/conf.d/kianja.arato.mg.conf` au lieu de créer le lien.
Activer le fichier une seule fois et ne pas remplacer les configurations des
autres domaines. Si les ports 80/443 sont détenus par un autre proxy ou un
Nginx conteneurisé, intégrer ce virtual host dans ce proxy existant et adapter
l'accès à `3210` : son `127.0.0.1` désignerait son propre conteneur.

## Passer en HTTPS avec Certbot

Quand HTTP et le DNS fonctionnent, demander le certificat avec le
[plugin Nginx de Certbot](https://certbot.eff.org/instructions?ws=nginx&os=pip) :

```bash
sudo certbot --nginx -d kianja.arato.mg --redirect
```

Puis remplacer uniquement cette valeur dans le `.env` :

```dotenv
FRONTEND_URL=https://kianja.arato.mg
```

`CORS_ORIGIN` autorise déjà les deux origines HTTP/HTTPS. L'API du navigateur
utilise `/api/v1` : elle suit automatiquement HTTPS, comme les uploads et
Socket.IO. **Aucune reconstruction du frontend n'est nécessaire pour Certbot.**
Une variable `NEXT_PUBLIC_*` absolue serait, elle, figée dans le build,
conformément à la [documentation Next.js](https://nextjs.org/docs/app/guides/environment-variables).
Le rendu serveur utilise séparément `API_INTERNAL_URL=http://backend:3000/api/v1`.

```bash
docker compose up -d --no-deps --force-recreate backend
curl --fail https://kianja.arato.mg/healthz
sudo certbot renew --dry-run
```

La résolution DNS interne du gateway suit les changements d'IP des conteneurs,
ce qui permet de recréer le backend sans modifier le proxy hôte.
Ne pas réinstaller ensuite le fichier HTTP original au-dessus de celui modifié
par Certbot, pour conserver les directives TLS.

## Exploitation

```bash
# État et logs
docker compose ps
docker compose logs --tail=100 backend frontend gateway

# Après mise à jour du code
docker compose up -d --build --wait --wait-timeout 240

# Arrêter sans supprimer les données
docker compose down
```

`docker compose down -v` supprimerait les volumes de cette application : ne pas
l'utiliser sur le serveur pour une mise à jour. Conserver les secrets et
`COMPOSE_PROJECT_NAME=kianja` entre les déploiements. Changer `DB_PASSWORD` dans
le `.env` seul ne change pas le mot de passe d'une base déjà initialisée.

Sauvegarder la base et les uploads avant une mise à jour :

```bash
mkdir -p backups
chmod 700 backups
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > backups/kianja.dump
docker compose exec -T backend tar -czf - -C /app/uploads . > backups/uploads.tar.gz
chmod 600 backups/kianja.dump backups/uploads.tar.gz
```

Si des uploads d'une installation précédente doivent être repris, les copier
dans le volume après le premier démarrage (l'image démarre avec un volume vide) :

```bash
docker compose cp freelance-etudiant-backend/uploads/. backend:/app/uploads/
docker compose exec -u root backend chown -R node:node /app/uploads
```

Restaurer une base existante nécessite une sauvegarde et une procédure adaptée
à son historique de migrations ; le déploiement standard crée une base neuve.

## Validation locale

Les deux images de production ont été construites et les quatre services ont
passé leurs contrôles de santé dans un projet Compose isolé. Les 23 migrations
ont été appliquées sur PostgreSQL 16. Les tests à travers les deux proxies Nginx
ont validé les pages et assets, les catalogues, le CORS HTTP/HTTPS, l'inscription,
la vérification d'email manuelle en mode console, la connexion, le renouvellement
JWT, les uploads et l'upgrade Socket.IO de polling vers WebSocket. La recréation
du backend a conservé le compte, les 23 migrations et le fichier envoyé.

Avec les accès ARATO fournis, la connexion SMTP sur le port 587 et
l'authentification STARTTLS ont réussi, sans envoyer d'email. La livraison
effective des emails, le paiement MVola réel et l'émission du certificat ne
sont pas validés par ces tests.

Le workflow a été contrôlé avec actionlint et la syntaxe Bash vérifiée. Les
tests temporaires de rsync ont confirmé la conservation du `.env`, des uploads
et des sauvegardes. Les tests du script serveur ont vérifié le refus des
chemins dangereux ou étrangers au projet et l'arrêt avant remplacement des
services si la compilation échoue. Le workflow n'a pas été exécuté sur le
serveur de production depuis cet espace de travail.
