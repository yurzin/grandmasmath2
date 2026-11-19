#!/bin/sh
# Ежедневный дамп базы на сервере (запускается из cron, см. DEPLOY.md).
#   BACKUP_DIR — куда класть дампы (по умолчанию /var/backups/grandmasmath)
#   KEEP_DAYS  — сколько дней хранить (по умолчанию 30)
set -eu

BACKUP_DIR="${BACKUP_DIR:-/var/backups/grandmasmath}"
KEEP_DAYS="${KEEP_DAYS:-30}"
FILE="$BACKUP_DIR/grandmasmath-$(date +%Y-%m-%d_%H%M).dump"

mkdir -p "$BACKUP_DIR"
docker exec grandmasmath-postgres pg_dump -U postgres -d grandmasmath -Fc -Z 9 > "$FILE.tmp"
mv "$FILE.tmp" "$FILE"

# Старые дампы удаляем только в своей папке и только свои файлы.
find "$BACKUP_DIR" -maxdepth 1 -name 'grandmasmath-*.dump' -mtime "+$KEEP_DAYS" -delete

echo "$(date '+%F %T') дамп: $FILE ($(du -h "$FILE" | cut -f1))"
