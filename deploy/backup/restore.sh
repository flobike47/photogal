#!/bin/sh
# Restauration depuis $BACKUP_REMOTE. Voir deploy/backup/README.md pour la procédure complète.
#   restore.sh list                 liste les dumps de base disponibles
#   restore.sh db [fichier] [dest]  restaure un dump (le plus récent par défaut) vers dest
#                                   (défaut : $DB_PATH, qui doit ne pas exister : API arrêtée)
#   restore.sh objects [bucket]     recopie les photos dans un bucket MinIO (défaut : $S3_BUCKET)
set -eu
REMOTE=${BACKUP_REMOTE%/}
log() { echo "[restore] $*"; }

case "${1:-}" in
  list)
    rclone lsl "$REMOTE/db" | sort -k2,3
    ;;
  db)
    name=${2:-$(rclone lsf "$REMOTE/db/daily" | sort | tail -1)}
    dest=${3:-$DB_PATH}
    [ -n "$name" ] || { log "aucun dump trouvé"; exit 1; }
    if [ -e "$dest" ]; then
      log "$dest existe déjà : arrêter l'API et déplacer l'ancienne base avant de restaurer"
      exit 1
    fi
    dir=db/daily
    case "$name" in */*) dir=$(dirname "$name"); name=$(basename "$name") ;; esac
    rclone copyto "$REMOTE/$dir/$name" "$dest.gz"
    gunzip "$dest.gz"
    [ "$(sqlite3 "$dest" 'PRAGMA integrity_check')" = ok ] || { log "base restaurée corrompue"; exit 1; }
    log "base restaurée depuis $dir/$name vers $dest"
    ;;
  objects)
    bucket=${2:-$S3_BUCKET}
    rclone mkdir "$SOURCE_REMOTE$bucket"
    rclone copy "$REMOTE/objects" "$SOURCE_REMOTE$bucket" --transfers 4 --stats 1m --stats-log-level NOTICE
    log "objets restaurés dans le bucket $bucket"
    ;;
  *)
    sed -n '2,7p' "$0"
    exit 1
    ;;
esac
