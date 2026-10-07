# Sauvegardes PhotoGal

Chaque nuit à 3 h (heure de Paris), le service `backup` copie vers Google Drive, chiffré par rclone (`crypt`) :

| Dossier (chiffré sur Drive) | Contenu | Rétention |
|---|---|---|
| `db/daily/` | Dump SQLite cohérent (`.backup`), vérifié (`integrity_check`), gzip | 7 jours |
| `db/weekly/` | Dump du dimanche | 4 semaines |
| `objects/` | Miroir du bucket MinIO : photos, miniatures, couvertures, logos | toujours à jour |
| `deleted/<date>/` | Objets supprimés ou remplacés côté MinIO | 30 jours |

- Seules les nouveautés partent chaque nuit. Le premier envoi peut durer plus d'une nuit : deux sauvegardes ne tournent jamais en même temps, et le quota Google (750 Go/jour) arrête proprement l'envoi, qui reprend la nuit suivante.
- Google ne voit que des fichiers chiffrés, noms compris.
- Dans Portainer, le conteneur passe **unhealthy** si aucune sauvegarde n'a réussi depuis 26 h.

## Mise en place (une seule fois)

### 1. Autoriser l'accès à Google Drive (sur ton Mac)

```bash
brew install rclone
rclone config create gdrive drive scope=drive.file   # ouvre le navigateur : se connecter au compte Google
rclone config show gdrive                            # copier la valeur de "token = {...}"
```

`drive.file` limite l'accès aux seuls fichiers créés par rclone : même volé, ce jeton ne donne pas accès au reste du Drive.

### 2. Choisir les mots de passe de chiffrement

Générer deux mots de passe longs (le mot de passe et le sel), **les enregistrer en clair dans ton gestionnaire de mots de passe**, puis :

```bash
rclone obscure 'MOT_DE_PASSE'   # → BACKUP_CRYPT_PASSWORD
rclone obscure 'SEL'            # → BACKUP_CRYPT_SALT
```

> ⚠️ Sans ces deux mots de passe, les sauvegardes sont illisibles. S'ils n'existent que dans Portainer et que le Pi meurt, tout est perdu.

### 3. Ajouter le service à la stack Portainer

La stack de prod est une copie du compose : y ajouter ce service (même registry que l'image `photogal-api`) et le volume `backup_state` :

```yaml
  backup:
    image: <REGISTRY>/photogal-backup:latest
    environment:
      S3_BUCKET: ${S3_BUCKET:-photogal}
      DB_PATH: /data/db/photogal.db
      RCLONE_CONFIG_MINIO_TYPE: s3
      RCLONE_CONFIG_MINIO_PROVIDER: Minio
      RCLONE_CONFIG_MINIO_ENDPOINT: http://minio:9000
      RCLONE_CONFIG_MINIO_ACCESS_KEY_ID: ${S3_ACCESS_KEY}
      RCLONE_CONFIG_MINIO_SECRET_ACCESS_KEY: ${S3_SECRET_KEY}
      RCLONE_CONFIG_GDRIVE_TYPE: drive
      RCLONE_CONFIG_GDRIVE_SCOPE: drive.file
      RCLONE_CONFIG_GDRIVE_TOKEN: ${BACKUP_GDRIVE_TOKEN}
      RCLONE_CONFIG_BACKUP_TYPE: crypt
      RCLONE_CONFIG_BACKUP_REMOTE: gdrive:photogal-backup
      RCLONE_CONFIG_BACKUP_PASSWORD: ${BACKUP_CRYPT_PASSWORD}
      RCLONE_CONFIG_BACKUP_PASSWORD2: ${BACKUP_CRYPT_SALT}
    volumes:
      - db_data:/data/db        # même volume que l'API
      - backup_state:/state
    mem_limit: 256m
    depends_on:
      minio:
        condition: service_healthy
    restart: unless-stopped

volumes:
  backup_state:
```

Renseigner `BACKUP_GDRIVE_TOKEN`, `BACKUP_CRYPT_PASSWORD` et `BACKUP_CRYPT_SALT` dans les variables d'environnement de la stack.

### 4. Lancer la première sauvegarde et vérifier

```bash
docker exec <conteneur-backup> backup.sh              # première sauvegarde, sans attendre 3 h
docker exec <conteneur-backup> restore.sh list        # les dumps doivent apparaître
```

Un dossier `photogal-backup` apparaît dans Google Drive, avec des noms illisibles : c'est normal.

## Restaurer

Toutes les commandes passent par l'image `photogal-backup`, avec les mêmes variables d'environnement (sur le Pi, via `docker exec` dans le conteneur `backup`).

**Base de données** (API arrêtée) :

```bash
docker stop <conteneur-api>
docker exec <conteneur-backup> mv /data/db/photogal.db /data/db/photogal.db.old   # garder l'ancienne
docker exec <conteneur-backup> rm -f /data/db/photogal.db-wal /data/db/photogal.db-shm
docker exec <conteneur-backup> restore.sh list                  # choisir un dump, ou prendre le plus récent :
docker exec <conteneur-backup> restore.sh db                    # ou : restore.sh db weekly/photogal-<date>.db.gz
docker start <conteneur-api>
```

**Photos** (bucket vide ou nouveau MinIO) :

```bash
docker exec <conteneur-backup> restore.sh objects               # recopie objects/ dans $S3_BUCKET
```

**Une photo supprimée par erreur** : elle est dans `deleted/<date>/` pendant 30 jours. Depuis un poste avec rclone configuré (mêmes remotes `gdrive` et `backup`), `rclone ls backup:deleted` puis `rclone copy`.

**Sur une nouvelle machine** (Pi mort) : réinstaller la stack, puis lancer les deux restaurations ci-dessus avec les mots de passe du gestionnaire (passés à `rclone obscure`).

## Ce qui a été testé

Sur le MinIO de dev, avec une cible locale chiffrée à la place de Drive :
- contenu et noms chiffrés : aucun JPEG ni SQLite lisible côté cible ;
- incrémental : le 2e passage n'envoie rien ;
- une photo supprimée se retrouve dans `deleted/<date>/` ;
- deux sauvegardes simultanées : la seconde s'arrête ;
- healthcheck : unhealthy au-delà de 26 h ;
- restauration : base identique (albums, photos, messages) et 166 objets identiques octet par octet au bucket source (`rclone check --download`) ;
- planification par cron ;
- refus de démarrer si le mot de passe de chiffrement est vide.

Refaire un test de restauration de temps en temps (par exemple tous les 3 mois) vers un bucket et un fichier de test : une sauvegarde qu'on n'a jamais restaurée ne compte pas.
