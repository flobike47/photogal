# Sauvegarde nocturne de PhotoGal (base SQLite + photos MinIO) vers un remote rclone chiffré
FROM alpine:3.22
RUN apk add --no-cache rclone sqlite tzdata ca-certificates util-linux-misc
COPY backup.sh restore.sh healthcheck.sh entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/*.sh && mkdir -p /root/.config/rclone && touch /root/.config/rclone/rclone.conf
ENV TZ=Europe/Paris \
    BACKUP_SCHEDULE="0 3 * * *" \
    BACKUP_REMOTE=backup: \
    SOURCE_REMOTE=minio: \
    DB_PATH=/data/db/photogal.db \
    STATE_DIR=/state
HEALTHCHECK --interval=1h --timeout=10s --start-period=1m CMD healthcheck.sh
ENTRYPOINT ["entrypoint.sh"]
