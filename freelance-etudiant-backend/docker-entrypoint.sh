#!/bin/sh
set -eu

# Le schema doit etre pret avant l'ouverture de l'API. Une transaction par
# migration permet de valider les ajouts d'ENUM avant la migration suivante.
node node_modules/typeorm/cli.js migration:run \
  -d dist/database/data-source.js --transaction each

exec "$@"

