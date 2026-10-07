#!/bin/sh
# Sauvegarde PhotoGal vers $BACKUP_REMOTE (remote rclone, chiffré par rclone crypt en prod) :
#   db/daily/   dump SQLite de chaque nuit, gardé 7 jours
#   db/weekly/  dump du dimanche, gardé 4 semaines
#   objects/    miroir du bucket MinIO (photos, miniatures, couvertures, logos)
#   deleted/<date>/  objets supprimés ou remplacés côté MinIO, gardés 30 jours
set -eu

STATE_DIR=${STATE_DIR:-/state}
mkdir -p "$STATE_DIR"
# Le premier envoi peut durer plus d'une nuit : on ne lance jamais deux sauvegardes en parallèle
exec 9> "$STATE_DIR/backup.lock"
if ! flock -n 9; then
  echo "[backup] une sauvegarde est déjà en cours, on passe"
  exit 0
fi

: "${S3_BUCKET:?S3_BUCKET manquant}"
# Une variable non définie dans Portainer arrive vide : on refuse d'envoyer sans vrai chiffrement
if [ "${RCLONE_CONFIG_BACKUP_TYPE:-}" = crypt ] && { [ -z "${RCLONE_CONFIG_BACKUP_PASSWORD:-}" ] || [ -z "${RCLONE_CONFIG_BACKUP_PASSWORD2:-}" ]; }; then
  echo "[backup] ÉCHEC : BACKUP_CRYPT_PASSWORD et BACKUP_CRYPT_SALT doivent être définis"
  exit 1
fi
REMOTE=${BACKUP_REMOTE%/}
STAMP=$(date -u +%Y-%m-%dT%H%M%SZ)
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
log() { echo "[backup $(date '+%F %T')] $*"; }
# Supprime les fichiers plus vieux que $2 dans $1, sans échouer si le dossier n'existe pas encore
prune() { if rclone lsf "$1" > /dev/null 2>&1; then rclone delete "$1" --min-age "$2"; fi; }

# 1. Base d'abord : une photo est envoyée sur MinIO avant d'être insérée en base, donc toute photo
#    présente dans ce dump existe déjà dans le bucket quand on le copie juste après.
log "dump SQLite de $DB_PATH"
sqlite3 "$DB_PATH" ".backup '$TMP/photogal.db'"
check=$(sqlite3 "$TMP/photogal.db" 'PRAGMA integrity_check')
[ "$check" = ok ] || { log "ÉCHEC : dump corrompu ($check)"; exit 1; }
gzip -9 "$TMP/photogal.db"
rclone copyto "$TMP/photogal.db.gz" "$REMOTE/db/daily/photogal-$STAMP.db.gz"
if [ "$(date +%u)" = 7 ]; then
  rclone copyto "$TMP/photogal.db.gz" "$REMOTE/db/weekly/photogal-$STAMP.db.gz"
fi

# 2. Photos : seules les nouveautés sont envoyées. --drive-stop-on-upload-limit arrête proprement
#    au quota Google (750 Go/jour) ; la nuit suivante reprend où on s'est arrêté.
log "synchronisation du bucket $S3_BUCKET"
rclone sync "$SOURCE_REMOTE$S3_BUCKET" "$REMOTE/objects" \
  --backup-dir "$REMOTE/deleted/$STAMP" \
  --transfers 2 --checkers 4 --drive-stop-on-upload-limit --stats 5m --stats-log-level NOTICE

# 3. Rétention
prune "$REMOTE/db/daily" 7d
prune "$REMOTE/db/weekly" 29d
prune "$REMOTE/deleted" 30d
if rclone lsf "$REMOTE/deleted" > /dev/null 2>&1; then rclone rmdirs "$REMOTE/deleted" --leave-root; fi

date +%s > "$STATE_DIR/last-success"
log "terminé"
