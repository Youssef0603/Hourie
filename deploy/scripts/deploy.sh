#!/usr/bin/env bash
set -euo pipefail

application_root="${HOURIE_APP_ROOT:-/var/www/hourie/current}"
api_root="${application_root}/hourie-api"
web_root="${application_root}/hourie-web"

cd "${api_root}"
composer install --no-dev --prefer-dist --no-interaction --optimize-autoloader

cd "${web_root}"
npm ci
npm run build
npm run lint

cd "${api_root}"
php artisan down --retry=30
trap 'php artisan up' EXIT
php artisan migrate --force
php artisan equipment-images:migrate-private
php artisan optimize
php artisan up
trap - EXIT

sudo systemctl reload php8.4-fpm
sudo systemctl reload nginx
