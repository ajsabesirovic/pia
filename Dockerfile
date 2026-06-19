# ---- Stage 1: build the Angular SPA ----
# Angular 22 requires Node ^22.22.3 || ^24.15.0 || >=26.0.0
FROM node:24-alpine AS frontend
WORKDIR /fe
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
# Single-origin deploy: the SPA talks to the same host under /api
RUN sed -i "s#http://localhost:8000/api#/api#g" src/app/core/config.ts
# Mounted under /app on the Laravel host, so assets must resolve from /app/
RUN npm run build -- --base-href=/app/

# ---- Stage 2: the Laravel app (PHP 8.2 + Apache) ----
# Apache (not `php artisan serve`) is used in production: the dev server mangles
# URL paths when public/app/ exists as a directory, breaking SPA deep links.
FROM php:8.2-apache

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

# Serve Laravel's public/ and let its .htaccess do the front-controller rewrite.
RUN a2enmod rewrite \
 && sed -ri 's!DocumentRoot /var/www/html!DocumentRoot /app/public!g' /etc/apache2/sites-available/000-default.conf \
 && sed -ri 's!<Directory /var/www/>!<Directory /app/public/>!g' /etc/apache2/apache2.conf \
 && sed -ri 's!AllowOverride None!AllowOverride All!g' /etc/apache2/apache2.conf

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /app

COPY composer.json composer.lock ./
RUN composer install --no-dev --optimize-autoloader --no-scripts

COPY . .

RUN composer dump-autoload --optimize

# Drop the compiled Angular bundle into Laravel's public/ so one origin serves both
COPY --from=frontend /fe/dist/frontend/browser/ ./public/app/

RUN php artisan config:clear \
 && chown -R www-data:www-data storage bootstrap/cache

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 8080

CMD ["/usr/local/bin/entrypoint.sh"]
