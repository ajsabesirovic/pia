#!/bin/sh
set -e

# Cache config for production speed (NOT route:cache — the SPA fallback is a closure).
php artisan config:cache

# Apply schema to the managed Postgres database.
php artisan migrate --force

# Seed demo data only when explicitly asked (set SEED_ON_DEPLOY=true for the
# first deploy, then set it back to false). Tolerate failure so a stray re-seed
# of an already-seeded database can't crash the deploy.
if [ "$SEED_ON_DEPLOY" = "true" ]; then
    echo "SEED_ON_DEPLOY=true -> seeding demo data"
    php artisan db:seed --force || echo "Seeding skipped/failed (database likely already seeded)."
fi

# Apache must listen on Render's injected $PORT.
PORT="${PORT:-8080}"
sed -ri "s/^Listen 80$/Listen ${PORT}/" /etc/apache2/ports.conf
sed -ri "s/<VirtualHost \*:80>/<VirtualHost *:${PORT}>/" /etc/apache2/sites-available/000-default.conf

exec apache2-foreground
