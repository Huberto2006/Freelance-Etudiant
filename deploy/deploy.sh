#!/usr/bin/env bash
set -Eeuo pipefail

# Execute via SSH sur le serveur, d'abord avec --check, puis avec --deploy.
workdir=${1:?Le chemin WORKDIR est requis}
mode=${2:---deploy}
[[ "$mode" == --check || "$mode" == --deploy ]] || {
  printf '%s\n' 'Mode de deploiement invalide.' >&2
  exit 1
}
[[ "$workdir" == /* ]] || {
  printf '%s\n' 'WORKDIR doit etre un chemin absolu dedie a Kianja.' >&2
  exit 1
}
workdir=$(realpath -m -- "$workdir")
case "$workdir" in
  /|/home|/opt|/srv|/var|/var/www|/root|/usr|/usr/local|/etc|/tmp)
    printf '%s\n' 'WORKDIR doit designer le dossier de cette application, pas un dossier systeme ou partage.' >&2
    exit 1
    ;;
esac

for command in rsync docker curl flock; do
  command -v "$command" >/dev/null || {
    printf 'Commande requise absente : %s\n' "$command" >&2
    exit 1
  }
done

mkdir -p -- "$workdir"
cd -- "$workdir"

# Autorise une installation existante de Kianja ou un dossier neuf avec .env.
# Le marqueur empeche rsync --delete-after de viser un autre projet par erreur.
if [[ -f .kianja-deployment ]]; then
  [[ "$(cat .kianja-deployment)" == kianja.arato.mg ]] || {
    printf '%s\n' 'Le marqueur WORKDIR ne correspond pas a Kianja.' >&2
    exit 1
  }
elif [[ ! -d freelance-etudiant-backend || ! -d freelance-etudiant-frontend ]]; then
  unexpected=$(find . -mindepth 1 -maxdepth 1 ! -name '.env' ! -name '.env.*' ! -name 'backups' -print -quit)
  [[ -z "$unexpected" ]] || {
    printf '%s\n' 'WORKDIR contient deja des fichiers sans installation Kianja reconnue.' >&2
    exit 1
  }
fi

[[ -s .env && -r .env ]] || {
  printf '%s\n' 'Copier le .env de production dans WORKDIR/.env avant le premier deploiement.' >&2
  exit 1
}
chmod 600 .env

compose=(docker compose)
if ! docker info >/dev/null 2>&1; then
  if command -v sudo >/dev/null && sudo -n docker info >/dev/null 2>&1; then
    compose=(sudo -n docker compose)
  else
    printf '%s\n' 'SSH_USER doit avoir acces a Docker, directement ou via sudo sans mot de passe.' >&2
    exit 1
  fi
fi
"${compose[@]}" version

if [[ "$mode" == --check ]]; then
  printf '%s\n' kianja.arato.mg > .kianja-deployment
  exit 0
fi

[[ -f docker-compose.yml ]] || {
  printf '%s\n' 'docker-compose.yml absent apres synchronisation.' >&2
  exit 1
}

exec 9>.kianja-deploy.lock
flock -w 300 9
trap 'status=$?; if (( status != 0 )); then "${compose[@]}" ps || true; fi' EXIT

"${compose[@]}" config --quiet
# Construit avant de remplacer les services existants.
"${compose[@]}" build --pull
"${compose[@]}" up -d --remove-orphans --wait --wait-timeout 240
"${compose[@]}" ps

published_address=$("${compose[@]}" port gateway 8080)
[[ "$published_address" =~ ^127\.0\.0\.1:[0-9]+$ ]] || {
  printf '%s\n' 'Le gateway doit publier son port uniquement sur 127.0.0.1.' >&2
  exit 1
}
curl --fail --silent --show-error --retry 5 --retry-delay 2 --retry-all-errors \
  --max-time 10 --output /dev/null "http://${published_address}/healthz"
curl --fail --silent --show-error --retry 5 --retry-delay 2 --retry-all-errors \
  --max-time 10 --output /dev/null "http://${published_address}/"
printf '%s\n' 'Deploiement Kianja termine ; API et frontend accessibles.'

