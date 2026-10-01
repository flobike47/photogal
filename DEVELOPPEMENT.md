# Développement local

## Prérequis
- Node 22, Docker (via colima sur macOS : `colima start`)
- Un `.env` à la racine, copié depuis `.env.example`. Le bucket doit finir par `-dev`.

## Commandes

| Commande | Effet |
|---|---|
| `npm run dev:infra` | Démarre MinIO (API S3 sur `localhost:9000`, console sur `localhost:9001`) |
| `npm run seed` | **Efface** la DB et le bucket de dev, puis les remplit avec les données de test |
| `npm run dev` | Lance l'API (`:3001`) et le front (`:5173`) en hot reload |
| `npm run dev:fresh` | `seed` puis `dev` |
| `npm run dev:infra:down` | Arrête MinIO. Les données restent dans le volume `minio_dev` |

Tu peux relancer le seed pendant que l'API tourne. Il refuse de s'exécuter si `NODE_ENV=production`, si `S3_ENDPOINT` n'est pas local, ou si `S3_BUCKET` ne finit pas par `-dev`.

## Données de test

- **Admin** : `ADMIN_EMAIL` / `ADMIN_PASSWORD` du `.env` (par défaut `admin@localhost` / `dev-changeme`). La session reste valide après un reseed.
- **Messages de contact** : 5, dont 3 non lus.
- **Images** : générées par le script (dégradés numérotés, en portrait, paysage et carré). Rien n'est téléchargé.

Les liens de partage ne changent pas d'un seed à l'autre :

| Album | Lien | Cas testé |
|---|---|---|
| Portraits, Paysages | `/share/demo-portraits`, `/share/demo-paysages` | Section portfolio de l'accueil |
| Mariage Julie & Thomas | `/share/demo-mariage` | 40 photos : tri par drag & drop, ZIP, défilement |
| Séance privée | `/share/demo-prive-mdp` | Album privé, mot de passe `test1234` |
| Famille Martin | `/share/demo-prive-emails` | Accès par email (`client@example.com`, plus `SEED_USER_EMAIL` si défini) |
| Épreuves | `/share/demo-non-telechargeable` | Téléchargement désactivé |
| Événement | `/share/demo-couverture` | Couverture uploadée à part |
| Album vide | `/share/demo-vide` | États vides |

Pour tester « Mes albums » avec ton compte Google, ajoute `SEED_USER_EMAIL=ton.email@gmail.com` dans le `.env` et relance le seed. Le compte doit être différent de `ADMIN_EMAIL`, sinon tu es connecté en admin.

