#!/bin/sh
# Planifie backup.sh avec crond (BACKUP_SCHEDULE, fuseau TZ). `entrypoint.sh backup` ou
# `entrypoint.sh restore …` lancent une commande ponctuelle à la place.
set -eu
case "${1:-cron}" in
  backup) exec backup.sh ;;
  restore) shift; exec restore.sh "$@" ;;
  cron) ;;
  *) exec "$@" ;;
esac

: "${S3_BUCKET:?S3_BUCKET manquant}"
mkdir -p "$STATE_DIR"
# Point de départ du healthcheck tant qu'aucune sauvegarde n'a réussi
[ -f "$STATE_DIR/started" ] || date +%s > "$STATE_DIR/started"

# crond n'hérite pas de l'environnement : on le fige pour la tâche, hors du volume persistant
# (il contient les secrets rclone)
umask 077
export -p > /run/backup-env.sh
echo "$BACKUP_SCHEDULE . /run/backup-env.sh && backup.sh > /proc/1/fd/1 2>&1" > /etc/crontabs/root
echo "[backup] planifié : '$BACKUP_SCHEDULE' ($TZ) → $BACKUP_REMOTE"
exec crond -f -l 6
