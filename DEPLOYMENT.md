# Hourie production deployment

Use one HTTPS origin such as `https://inventory.company-domain.com`. Nginx serves the React build and sends `/api`, `/sanctum`, and `/up` to Laravel. This avoids cross-origin session and CSRF problems.

## Server requirements

- Ubuntu LTS, Nginx, PHP 8.4 FPM with the extensions reported by `composer check-platform-reqs`
- MySQL 8.4 LTS
- Node.js 24 LTS and Composer 2 for deployments
- TLS certificate, for example from Let's Encrypt
- A persistent volume mounted for `EQUIPMENT_IMAGES_ROOT`

## First deployment

1. Copy `hourie-api/.env.production.example` to `hourie-api/.env` on the server and replace every example domain and secret.
2. Run `php artisan key:generate`, then create the database and database user.
3. Point `EQUIPMENT_IMAGES_ROOT` at a directory outside the release folder and grant the PHP-FPM user read/write access.
4. Update the paths, domain, certificate, and PHP socket in `deploy/nginx/hourie.conf`, install it under `/etc/nginx/sites-enabled/`, and validate with `nginx -t`.
5. Run `HOURIE_APP_ROOT=/var/www/hourie/current deploy/scripts/deploy.sh`.
6. Create the first manager with `php artisan user:create`.
7. Run `HOURIE_BASE_URL=https://inventory.company-domain.com deploy/scripts/smoke-test.sh` from any machine with `curl`.

The deployment script installs optimized PHP dependencies, builds and lints React, runs database migrations, moves legacy public photos into private storage, caches Laravel configuration, and reloads PHP-FPM and Nginx.

The deployment user needs permission to reload PHP-FPM and Nginx without an interactive password, or those two reload commands must be run separately by an administrator. Set PHP's `upload_max_filesize` and `post_max_size` to at least `55M` so the Nginx and PHP upload limits agree.

The smoke test checks the React entry point, Laravel and database readiness, Sanctum's CSRF cookie endpoint, unauthenticated route protection, HTTPS, and the required security headers. Run it after every deployment.

## Backups

Run `deploy/scripts/backup.sh` daily using cron or a systemd timer. Supply `MYSQL_DATABASE`, `MYSQL_USER`, and `MYSQL_PASSWORD` through a root-owned environment file; optionally set `MYSQL_HOST`, `MYSQL_PORT`, `HOURIE_BACKUP_ROOT`, and `HOURIE_BACKUP_RETENTION_DAYS`.

Copy backups to a second machine or private object-storage bucket. Test a database and photo restore before launch and at least quarterly. Provider snapshots are useful, but they do not replace application-level database and photo backups.

## Staging and release QA

Deploy the same build to a separate staging database and photo directory. Before each production release verify:

- login, logout, disabled-user rejection, and all four roles;
- generator create/edit/archive, photo upload/view/delete, Excel import, filters, pagination, and maintenance;
- site create/edit/archive, location changes, audit history, personnel create/edit/archive, and settings values;
- French and Arabic direction, translations, forms, tables, modals, and status labels;
- current Chrome, Firefox, Safari, an Android-sized viewport, and an iPhone-sized viewport;
- expired-session behavior by deleting the server session while the panel is open;
- `/up`, daily logs, backup output, and a test restore.

Do not use production data in staging. Keep `APP_DEBUG=false` in production and rotate any credential that was shared outside the server secret store.
