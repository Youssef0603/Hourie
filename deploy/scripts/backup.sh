#!/usr/bin/env bash
set -euo pipefail

backup_root="${HOURIE_BACKUP_ROOT:-/var/backups/hourie}"
images_root="${EQUIPMENT_IMAGES_ROOT:-/var/www/hourie/shared/equipment-images}"
retention_days="${HOURIE_BACKUP_RETENTION_DAYS:-30}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"

: "${MYSQL_DATABASE:?MYSQL_DATABASE is required}"
: "${MYSQL_USER:?MYSQL_USER is required}"
: "${MYSQL_PASSWORD:?MYSQL_PASSWORD is required}"

mkdir -p "${backup_root}"

MYSQL_PWD="${MYSQL_PASSWORD}" mysqldump \
    --host="${MYSQL_HOST:-127.0.0.1}" \
    --port="${MYSQL_PORT:-3306}" \
    --user="${MYSQL_USER}" \
    --single-transaction \
    --quick \
    --lock-tables=false \
    "${MYSQL_DATABASE}" | gzip > "${backup_root}/database-${timestamp}.sql.gz"

tar -C "${images_root}" -czf "${backup_root}/equipment-images-${timestamp}.tar.gz" .
find "${backup_root}" -type f -mtime "+${retention_days}" -delete
