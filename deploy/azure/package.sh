#!/usr/bin/env bash
# Builds the zip deployed to the Hourie web app on Azure App Service:
# the Laravel API with its production packages, the React build in public/,
# and the Azure startup files in deploy-azure/. Run from the repository root:
#   deploy/azure/package.sh
# then, connected to the VPN:
#   az webapp deploy --resource-group <group> --name <app> --src-path build/hourie-azure.zip --type zip
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
build="$root/build/azure"
rm -rf "$build" "$root/build/hourie-azure.zip"
mkdir -p "$build"

echo "Building the frontend…"
(cd "$root/hourie-web" && npm ci && npm run build)

echo "Copying the API…"
rsync -a \
    --exclude '.env' --exclude '.env.*' --exclude 'node_modules' --exclude 'vendor' --exclude 'tests' \
    --exclude 'storage/app/*' --exclude 'storage/logs/*' --exclude 'storage/framework/*/*' \
    --exclude '.phpunit.cache' --exclude 'database/database.sqlite' \
    "$root/hourie-api/" "$build/"
cp -R "$root/hourie-web/dist/." "$build/public/"
mkdir -p "$build/deploy-azure"
cp "$root/deploy/azure/nginx.conf" "$root/deploy/azure/startup.sh" "$build/deploy-azure/"

echo "Installing production PHP packages…"
(cd "$build" && composer install --no-dev --prefer-dist --no-interaction --optimize-autoloader)

(cd "$build" && zip -qr "$root/build/hourie-azure.zip" .)
echo "Package ready: build/hourie-azure.zip"
