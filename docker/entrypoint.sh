#!/bin/sh
set -e

# Cache config for production speed (NOT route:cache — the SPA fallback is a closure).
php artisan config:cache

# Apply schema to the managed Postgres database.
php artisan migrate --force

# Seed demo data only when explicitly asked (set SEED_ON_DEPLOY=true for the
# first deploy, then set it back to false so later deploys don't duplicate rows).
if [ "$SEED_ON_DEPLOY" = "true" ]; then
    echo "SEED_ON_DEPLOY=true -> seeding demo data"
    php artisan db:seed --force
fi

# Render injects $PORT; bind to it.
exec php artisan serve --host=0.0.0.0 --port="${PORT:-8080}"
