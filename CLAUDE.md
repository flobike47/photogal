# PhotoGal

Site pour photographe auto-hébergé : galeries partagées par lien, albums privés (mot de passe ou emails autorisés), admin, personnalisation du site. Tourne sur un **Raspberry Pi (ARM64)** via Portainer. Tout est en français (UI, messages d'erreur API, commits, docs).

## Carte du repo

- `apps/api` — Fastify 5 + TypeScript ESM (imports en `.js`), SQLite (`better-sqlite3`, synchrone), stockage photos dans MinIO.
  - `app.ts` (`buildApp()`) enregistre les plugins et les routes (`/api/<domaine>`) et sert le build web en prod ; `index.ts` démarre (bucket, compte admin, listen).
  - `config.ts` : **seul** endroit qui lit `process.env`. Toute nouvelle variable passe par là et va dans `.env.example`.
  - `db.ts` : schéma + migrations (voir Conventions).
  - `storage.ts` (S3/MinIO), `images.ts` (sharp, miniatures, HEIC), `heic-worker.ts`, `zip.ts` (ZIP en streaming).
  - `routes/*.ts` : un `FastifyPluginAsync` par domaine. `middleware/authenticate.ts` (admin) et `authenticateUser.ts` (visiteur Google).
  - `scripts/` : `seed`, `generate-thumbs`, `migrate-to-minio`.
- `apps/web` — React 19 + Ant Design 5 + React Router 7 + TanStack Query + Zustand + Vite.
  - `api/client.ts` : instance axios unique (`apiClient`, `baseURL: '/api'`, cookie de session). Ne pas créer d'autre client.
  - `pages/public/*` (site visiteur), `pages/admin/*` (back-office), `store/` (Zustand : auth, config du site).
- `e2e/` — Playwright. `PARCOURS.md` = référence des parcours et critères d'acceptation (V1…, A1…).
- `.claude/` : `settings.json` (permissions, hooks format + vérif), `skills/` (`feature`, `bugfix`, `ship`, `photogal-run`).
- `DEVELOPPEMENT.md` (dev local, données de test), `MANUEL.md` (manuel utilisateur).

## Commandes

```bash
npm run dev:infra        # MinIO (prérequis de tout le reste ; sur macOS : colima start)
npm run seed             # EFFACE puis remplit la DB et le bucket de dev
npm run dev              # API :3001 + web :5173 en hot reload
npm run check            # typecheck + lint + format:check + tests API (à lancer avant de rendre la main)
npm run typecheck        # api (src + tests) + web
npm run lint             # ESLint ; npm run format pour Prettier
npm test                 # Vitest API (< 1 s, DB SQLite en mémoire, sans MinIO)
npm run test:e2e         # suite Playwright complète (~2 min 30)
npx playwright test -c e2e/playwright.config.ts e2e/public/gallery.spec.ts   # une seule spec
```

Comptes et liens de test : voir `DEVELOPPEMENT.md` (admin `admin@localhost` / `dev-changeme`, albums `/share/demo-*`).

## Définition de « fini »

1. `npm run check` passe (le hook Stop de `.claude/settings.json` le vérifie automatiquement).
2. Règle métier ou contrôle d'accès API ajouté/modifié : test Vitest dans `apps/api/test/` (`createTestApp()` + `app.inject`, helpers dans `test/helpers.ts`).
3. Les specs e2e liées au changement passent (lancer la spec ciblée, puis la suite complète si le changement est transverse).
4. Changement d'UI : vérifié dans le navigateur (desktop **et** mobile si public).
5. Nouveau comportement : `e2e/PARCOURS.md` et la spec correspondante mis à jour. Bug connu non corrigé : `test.fail` + mention dans `PARCOURS.md`.
6. Nouvelle variable d'env : `config.ts` + `.env.example` (+ `docker-compose.yml` si nécessaire en prod).

## Conventions

- **Commits** : `type: description en français` (`feat`, `fix`, `refactor`, `test`, `docs`, `ci`), au présent/infinitif, sans majuscule.
- **Migrations SQLite** : pas d'outil de migration. Ajouter une colonne = une ligne `try { db.exec('ALTER TABLE … ADD COLUMN …') } catch { /* already exists */ }` à la suite des autres dans `db.ts`, avec un `DEFAULT` pour les lignes existantes. Mettre à jour `types.ts`.
- **Routes API** : requêtes SQL préparées (`db.prepare(...).get/all/run`) avec paramètres `?`, jamais d'interpolation. Erreurs : `reply.status(xxx).send({ error: 'message en français' })`. Ne jamais renvoyer `password_hash` (voir `withoutSecrets` dans `routes/albums.ts`).
- **Front** : données serveur via `useQuery`/`useMutation` + `apiClient`, invalidation par `queryKey` après mutation. Composants Ant Design plutôt que du CSS maison ; styles du site public dans `styles/public.css`.
- Commentaires : rares, en français, pour expliquer le *pourquoi*.

## Pièges connus

- **Miniatures** : servies en cache `immutable`. Après tout changement du pipeline (`images.ts`) : incrémenter `THUMB_VERSION` dans `apps/web/src/utils/thumb.ts` et lancer `npm run generate-thumbs --workspace @photogal/api -- --force`.
- **HEIC** : le sharp précompilé ne décode pas le HEVC → conversion via `heic-decode` (WASM) dans un worker. Ne pas « simplifier » en passant par sharp.
- **Raspberry Pi** : mémoire et CPU limités. Traiter les images une par une (`IMAGE_CONCURRENCY`), streamer les fichiers (jamais de `Buffer` d'un album entier), ne pas bloquer l'event loop (cf. fix ZIP 08eca29). Pas de dépendance native sans build ARM64.
- **Streams S3** : toujours consommer ou détruire le body, sinon fuite de sockets (cf. 5f69e47).
- **Déploiement réel** : `docker-compose.yml` (minio + api qui sert le web) + image construite par `.github/workflows/build-and-push.yml` sur push `main`. `docker-compose.prod.yml`, `apps/web/Dockerfile` et les `nginx.conf` sont **obsolètes** (à supprimer), ne pas s'y fier.
- **Prod derrière reverse proxy** : `TRUST_PROXY=true` est requis pour la limite d'essais de mot de passe par IP.
- **Accès par lien** : connaître le lien d'un album public suffit pour le voir, c'est voulu.
- **Seed** : refuse de tourner si `NODE_ENV=production`, si `S3_ENDPOINT` n'est pas local ou si le bucket ne finit pas par `-dev`. Ne pas lancer pendant que la suite e2e tourne.
- Les tests e2e partagent la DB et le bucket : `workers: 1`, et toute spec qui modifie des données fait `test.afterAll(reseed)`.

## Façon de travailler attendue

- Lire le code existant et réutiliser ses helpers avant d'en écrire de nouveaux.
- Tâche touchant plus de 3 fichiers ou un choix d'architecture : proposer un plan d'abord.
- Signaler tout risque de sécurité (accès aux albums privés, upload, auth) même hors du périmètre demandé.
- Ne jamais modifier `.env` ni lancer de commande destructrice (`docker compose down -v`, suppression de bucket) sans demande explicite.
- Être direct : dire quand une demande est une mauvaise idée et proposer mieux. Pas de sur-ingénierie.
