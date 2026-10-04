#!/bin/sh
# cron (default): run backup.sh on $BACKUP_CRON. Other commands: backup, restore <files…>, list.
set -eu
case "${1:-cron}" in
  cron)
    echo "${BACKUP_CRON:-30 2 * * *} /usr/local/bin/backup.sh >/proc/1/fd/1 2>/proc/1/fd/2" > /etc/crontabs/root
    echo "Backups scheduled: ${BACKUP_CRON:-30 2 * * *} (container time zone: ${TZ:-UTC}), keeping ${BACKUP_KEEP_DAYS:-14} days"
    exec crond -f -l 8
    ;;
  backup) exec /usr/local/bin/backup.sh ;;
  restore) shift; exec /usr/local/bin/restore.sh "$@" ;;
  list) exec ls -lht /backups ;;
  *) exec "$@" ;;
esac
