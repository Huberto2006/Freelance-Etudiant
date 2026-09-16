#!/usr/bin/env bash
set -Eeuo pipefail

project_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
excludes=${1:-"$project_dir/deploy/rsync-excludes.txt"}
temp_dir=$(mktemp -d)
trap 'rm -rf -- "$temp_dir"' EXIT
server_dir="$temp_dir/server"

# Simule les donnees deja presentes sur le serveur.
mkdir -p "$server_dir/freelance-etudiant-backend/uploads" "$server_dir/uploads" "$server_dir/backups"
printf '%s\n' 'env-serveur' > "$server_dir/.env"
printf '%s\n' 'upload-serveur' > "$server_dir/freelance-etudiant-backend/uploads/existant.txt"
printf '%s\n' 'upload-racine' > "$server_dir/uploads/existant.txt"
printf '%s\n' 'sauvegarde' > "$server_dir/backups/existant.dump"
printf '%s\n' kianja.arato.mg > "$server_dir/.kianja-deployment"
printf '%s\n' 'obsolete' > "$server_dir/ancien-code.txt"

rsync --archive --compress --no-owner --no-group \
  --delay-updates --delete-after --protect-args \
  --exclude-from="$excludes" \
  "$project_dir/" "$server_dir/"

# Compare les vraies sources du projet : un dossier metier nomme uploads
# doit etre transfere, meme si les fichiers envoyes sont exclus.
while IFS= read -r -d '' source; do
  relative=${source#"$project_dir/"}
  if ! cmp -s -- "$source" "$server_dir/$relative"; then
    printf 'Source absente ou modifiee apres rsync : %s\n' "$relative" >&2
    exit 1
  fi
done < <(find "$project_dir/freelance-etudiant-backend/src" \
  "$project_dir/freelance-etudiant-frontend/src" -type f -print0)

[[ "$(cat "$server_dir/.env")" == env-serveur ]]
[[ "$(cat "$server_dir/freelance-etudiant-backend/uploads/existant.txt")" == upload-serveur ]]
[[ "$(cat "$server_dir/uploads/existant.txt")" == upload-racine ]]
[[ "$(cat "$server_dir/backups/existant.dump")" == sauvegarde ]]
[[ "$(cat "$server_dir/.kianja-deployment")" == kianja.arato.mg ]]
[[ ! -e "$server_dir/ancien-code.txt" ]]
[[ -z "$(find "$server_dir/freelance-etudiant-backend/uploads" -type f ! -name existant.txt -print -quit)" ]]

printf '%s\n' 'Rsync valide : toutes les sources transferees ; .env, uploads et sauvegardes preserves.'
