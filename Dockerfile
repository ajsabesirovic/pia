# ---- Stage 1: build the Angular SPA ----
FROM node:20-alpine AS frontend
WORKDIR /fe
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
# Single-origin deploy: the SPA talks to the same host under /api
RUN sed -i "s#http://localhost:8000/api#/api#g" src/app/core/config.ts
# Mounted under /app on the Laravel host, so assets must resolve from /app/
RUN npm run build -- --base-href=/app/

# ---- Stage 2: the Laravel app (PHP 8.2) ----
FROM php:8.2-cli

RUN apt-get update && apt-get install -y \
    libxml2-dev \
    libcurl4-openssl-dev \
    libonig-dev \
    libzip-dev \
    libpq-dev \
    unzip \
    git \
    && docker-php-ext-install pdo pdo_mysql pdo_pgsql mbstring xml curl fileinfo zip \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /app

COPY composer.json composer.lock ./
RUN composer install --no-dev --optimize-autoloader --no-scripts

COPY . .

RUN composer dump-autoload --optimize

# Drop the compiled Angular bundle into Laravel's public/ so one origin serves both
COPY --from=frontend /fe/dist/frontend/browser/ ./public/app/

RUN php artisan config:clear

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 8080

CMD ["/usr/local/bin/entrypoint.sh"]
