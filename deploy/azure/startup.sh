#!/usr/bin/env bash
# Startup command of the Hourie web app on Azure App Service (Linux, PHP 8.4).
# Set it in Configuration > General settings > Startup command:
#   bash /home/site/wwwroot/deploy-azure/startup.sh
#
# At every start it installs the nginx site, brings the database schema up
# to date and caches the configuration. When HOURIE_RUN_BACKGROUND=true (no
# WebJobs available), it also keeps the scheduler and the queue worker
# running, restarting them if they stop.
set -uo pipefail

app=/home/site/wwwroot
cd "$app" || exit 1

cp "$app/deploy-azure/nginx.conf" /etc/nginx/sites-available/default
service nginx reload

mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache

# Stops the start (the app is not served) when a required step fails, so a
# missing or half-updated database never runs behind a working-looking site.
# The reason is written to the App Service log stream.
fail() {
    echo "[hourie] startup stopped: $1" >&2
    exit 1
}

# No --isolated: its lock lives in a database table that does not exist yet on
# an empty database, and Hourie runs a single instance on this plan.
php artisan migrate --force || fail "database migration failed"
php artisan optimize || fail "configuration cache failed"

# Keeps a long-running Artisan command alive: if it stops, it starts again.
keep_running() {
    while true; do
        php artisan "$@"
        echo "[hourie] '$*' stopped (exit $?), restarting in 5 seconds" >&2
        sleep 5
    done
}

if [ "${HOURIE_RUN_BACKGROUND:-false}" = "true" ]; then
    keep_running schedule:work &
    keep_running queue:work --sleep=3 --tries=3 --max-time=3600 &
fi
