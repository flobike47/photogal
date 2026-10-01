// Remet l'environnement local à zéro (DB SQLite + bucket MinIO) et le remplit
// avec des données de test déterministes. Relançable à volonté : `npm run seed`.
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { config } from '../config.js';
import { s3, ensureBucket, upload, remove } from '../storage.js';

// ── Garde-fous : ce script efface tout, il ne doit tourner qu'en local ──────────
const endpointHost = new URL(config.s3Endpoint).hostname;
const refusals = [
  config.nodeEnv === 'production' && 'NODE_ENV=production',
  !['localhost', '127.0.0.1'].includes(endpointHost) && `S3_ENDPOINT n'est pas local (${config.s3Endpoint})`,
  !config.s3Bucket.endsWith('-dev') && `S3_BUCKET doit finir par "-dev" (actuel : "${config.s3Bucket}")`,
].filter(Boolean);
if (refusals.length > 0) {
  console.error(`[seed] Refusé :\n  - ${refusals.join('\n  - ')}`);
  process.exit(1);
}

// ── Génération d'images ─────────────────────────────────────────────────────────
function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function generateImage(opts: {
  width: number; height: number; hue: number; label: string; sublabel?: string; seed?: number;
}): Promise<Buffer> {
  const { width, height, hue, label, sublabel, seed = 0 } = opts;
  const min = Math.min(width, height);
  // Quelques cercles pseudo-aléatoires (déterministes) pour donner du relief
  const circles = Array.from({ length: 5 }, (_, i) => {
    const r = ((seed * 37 + i * 53) % 30) / 100 + 0.1;
    const cx = ((seed * 17 + i * 71) % 100) / 100;
    const cy = ((seed * 29 + i * 43) % 100) / 100;
    return `<circle cx="${cx * width}" cy="${cy * height}" r="${r * min}" fill="hsl(${(hue + i * 25) % 360},70%,70%)" fill-opacity="0.18"/>`;
  }).join('');

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="hsl(${hue},55%,50%)"/>
          <stop offset="1" stop-color="hsl(${(hue + 40) % 360},60%,18%)"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      ${circles}
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
            font-family="Helvetica, Arial, sans-serif" font-size="${min * 0.22}" font-weight="200"
            fill="#fff" fill-opacity="0.92">${escapeXml(label)}</text>
      ${sublabel ? `<text x="50%" y="${height / 2 + min * 0.18}" text-anchor="middle"
            font-family="Helvetica, Arial, sans-serif" font-size="${min * 0.04}"
            fill="#fff" fill-opacity="0.6">${escapeXml(sublabel)}</text>` : ''}
    </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 82 }).toBuffer();
}

async function generateLogo(text: string): Promise<Buffer> {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="480" height="120">
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
            font-family="Georgia, serif" font-size="64" fill="#fff">${escapeXml(text)}</text>
    </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

const ORIENTATIONS = [
  { width: 2000, height: 1333 }, // paysage 3:2
  { width: 1333, height: 2000 }, // portrait 2:3
  { width: 1600, height: 1600 }, // carré
  { width: 2000, height: 1125 }, // paysage 16:9
];

// Exécute `fn` sur `items` avec au plus `limit` appels en parallèle
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }));
  return results;
}

// ── 1. Reset ────────────────────────────────────────────────────────────────────
console.log(`[seed] DB      : ${config.dbPath}`);
console.log(`[seed] Bucket  : ${config.s3Bucket} @ ${config.s3Endpoint}`);

try {
  await ensureBucket();
} catch (err) {
  console.error(`[seed] MinIO injoignable (${(err as Error).message}). Lance d'abord : npm run dev:infra`);
  process.exit(1);
}

const keys: string[] = [];
let token: string | undefined;
do {
  const res = await s3.send(new ListObjectsV2Command({ Bucket: config.s3Bucket, ContinuationToken: token }));
  for (const obj of res.Contents ?? []) if (obj.Key) keys.push(obj.Key);
  token = res.IsTruncated ? res.NextContinuationToken : undefined;
} while (token);
await mapLimit(keys, 16, (key) => remove(key));
console.log(`[seed] ${keys.length} objet(s) supprimé(s) du bucket`);

// Import dynamique : après les garde-fous, pour ne jamais ouvrir/créer une DB hors dev.
// On vide les tables au lieu de supprimer le fichier : une API déjà lancée garde
// son handle SQLite ouvert et continuerait sinon à lire l'ancien fichier supprimé.
const { db, defaultConfig } = await import('../db.js');
const { generateAndUploadThumb, thumbKey } = await import('../routes/photos.js');
db.transaction(() => {
  for (const table of ['photos', 'album_access', 'albums', 'contact_messages', 'admin_users', 'site_config']) {
    db.prepare(`DELETE FROM ${table}`).run();
  }
})();
type Photo = import('../types.js').Photo;

// ── 2. Admin ────────────────────────────────────────────────────────────────────
// Id fixe : la session admin dans le navigateur reste valide d'un seed à l'autre
db.prepare('INSERT INTO admin_users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)').run(
  'admin-dev', config.adminEmail, await bcrypt.hash(config.adminPassword, 10), new Date().toISOString(),
);

// ── 3. Config du site + images ──────────────────────────────────────────────────
const assets: [type: string, configKey: string, buffer: Promise<Buffer>, mime: string][] = [
  ['logo', 'logo_url', generateLogo('PhotoGal'), 'image/png'],
  ['hero', 'hero_image_url', generateImage({ width: 2400, height: 1350, hue: 210, label: 'Hero', seed: 1 }), 'image/jpeg'],
  ['about', 'about_image_url', generateImage({ width: 1200, height: 1500, hue: 25, label: 'À propos', seed: 2 }), 'image/jpeg'],
  ['contact', 'contact_bg_url', generateImage({ width: 2400, height: 1350, hue: 280, label: 'Contact', seed: 3 }), 'image/jpeg'],
];
const setConfig = db.prepare('INSERT OR REPLACE INTO site_config (key, value) VALUES (?, ?)');
for (const [key, value] of Object.entries(defaultConfig)) setConfig.run(key, value);
for (const [type, configKey, buffer, mime] of assets) {
  await upload(`logos/${type}`, await buffer, mime);
  setConfig.run(configKey, `/api/config/asset/${type}`);
}
const siteConfig: Record<string, string> = {
  site_name: 'PhotoGal Dev',
  hero_title: '<p>Environnement de <strong>test</strong></p>',
  hero_subtitle: '<p>Données générées par <code>npm run seed</code></p>',
  about_text: '<p>Photographe fictif. Ce texte sert à tester la section <em>À propos</em> avec du contenu riche.</p>',
  contact_email: 'contact@photogal.test',
  social_instagram: 'https://instagram.com/photogal',
  social_website: 'https://example.com',
};
for (const [key, value] of Object.entries(siteConfig)) setConfig.run(key, value);

// ── 4. Albums et photos ─────────────────────────────────────────────────────────
interface AlbumSeed {
  id: string;
  name: string;
  description: string;
  shareToken: string;
  hue: number;
  photoCount: number;
  isPublic?: boolean;
  isPortfolio?: boolean;
  isDownloadable?: boolean;
  password?: string;
  allowedEmails?: string[];
  customCover?: boolean;
}

const albums: AlbumSeed[] = [
  { id: 'album-portfolio-portraits', name: 'Portraits', description: 'Sélection portfolio — portraits', shareToken: 'demo-portraits', hue: 20, photoCount: 8, isPortfolio: true },
  { id: 'album-portfolio-paysages', name: 'Paysages', description: 'Sélection portfolio — paysages', shareToken: 'demo-paysages', hue: 140, photoCount: 8, isPortfolio: true },
  { id: 'album-mariage', name: 'Mariage Julie & Thomas', description: 'Album long pour tester le tri, le ZIP et le défilement', shareToken: 'demo-mariage', hue: 340, photoCount: 40 },
  { id: 'album-prive-mdp', name: 'Séance privée (mot de passe)', description: 'Mot de passe : test1234', shareToken: 'demo-prive-mdp', hue: 260, photoCount: 6, isPublic: false, password: 'test1234' },
  { id: 'album-prive-emails', name: 'Famille Martin (accès email)', description: 'Visible dans « Mes albums » pour les emails autorisés', shareToken: 'demo-prive-emails', hue: 190, photoCount: 6, isPublic: false, allowedEmails: ['client@example.com', ...(process.env.SEED_USER_EMAIL ? [process.env.SEED_USER_EMAIL] : [])] },
  { id: 'album-non-telechargeable', name: 'Épreuves (non téléchargeable)', description: 'Téléchargement désactivé', shareToken: 'demo-non-telechargeable', hue: 50, photoCount: 5, isDownloadable: false },
  { id: 'album-couverture', name: 'Événement (couverture perso)', description: 'Couverture uploadée indépendamment des photos', shareToken: 'demo-couverture', hue: 100, photoCount: 4, customCover: true },
  { id: 'album-vide', name: 'Album vide', description: 'Pour tester les états vides', shareToken: 'demo-vide', hue: 0, photoCount: 0 },
];

const insertAlbum = db.prepare(
  `INSERT INTO albums (id, name, description, share_token, is_public, is_downloadable, is_portfolio, password_hash, cover_photo_id, cover_url, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
);
const insertPhoto = db.prepare(
  `INSERT INTO photos (id, album_id, filename, original_name, mime_type, size, share_token, sort_order, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
);
const insertAccess = db.prepare('INSERT INTO album_access (album_id, email) VALUES (?, ?)');

const baseTime = Date.now() - albums.length * 86_400_000;
let photoTotal = 0;

for (const [albumIndex, a] of albums.entries()) {
  // Albums espacés d'un jour pour un ordre d'affichage stable
  const createdAt = new Date(baseTime + albumIndex * 86_400_000).toISOString();

  const photos = await mapLimit(Array.from({ length: a.photoCount }, (_, i) => i), 4, async (i) => {
    const { width, height } = ORIENTATIONS[i % ORIENTATIONS.length];
    const number = String(i + 1).padStart(2, '0');
    const buffer = await generateImage({
      width, height, hue: (a.hue + i * 7) % 360, seed: albumIndex * 100 + i,
      label: number, sublabel: `${a.name.split(' (')[0]} · ${width}×${height}`,
    });
    const photo: Photo = {
      id: nanoid(),
      album_id: a.id,
      filename: '',
      original_name: `IMG_${number}.jpg`,
      mime_type: 'image/jpeg',
      size: buffer.length,
      share_token: nanoid(12),
      sort_order: i + 1,
      created_at: new Date(Date.parse(createdAt) + i * 1000).toISOString(),
    };
    photo.filename = `${photo.id}.jpg`;
    await upload(`photos/${a.id}/${photo.filename}`, buffer, photo.mime_type);
    await generateAndUploadThumb(buffer, thumbKey(photo));
    return photo;
  });

  let coverUrl: string | null = null;
  if (a.customCover) {
    const cover = await generateImage({ width: 1600, height: 1000, hue: (a.hue + 180) % 360, label: 'Couverture', seed: 999 });
    await upload(`covers/${a.id}`, cover, 'image/jpeg');
    coverUrl = `/api/albums/${a.id}/cover`;
  }

  insertAlbum.run(
    a.id, a.name, a.description, a.shareToken,
    a.isPublic === false ? 0 : 1,
    a.isDownloadable === false ? 0 : 1,
    a.isPortfolio ? 1 : 0,
    a.password ? await bcrypt.hash(a.password, 10) : null,
    photos[0]?.id ?? null,
    coverUrl,
    createdAt, createdAt,
  );
  for (const p of photos) {
    insertPhoto.run(p.id, p.album_id, p.filename, p.original_name, p.mime_type, p.size, p.share_token, p.sort_order, p.created_at);
  }
  for (const email of a.allowedEmails ?? []) insertAccess.run(a.id, email.trim().toLowerCase());

  photoTotal += photos.length;
  console.log(`[seed] ${a.name.padEnd(36)} ${String(photos.length).padStart(3)} photo(s)  → /share/${a.shareToken}`);
}

// ── 5. Messages de contact ──────────────────────────────────────────────────────
const messages: [name: string, email: string, message: string, read: boolean][] = [
  ['Claire Dubois', 'claire@example.com', 'Bonjour, êtes-vous disponible pour un mariage en juin prochain ?', false],
  ['Marc Lefèvre', 'marc@example.com', 'Je souhaiterais un devis pour une séance photo de famille.', false],
  ['Sophie Bernard', 'sophie@example.com', 'Merci pour les photos, elles sont superbes !', true],
  ['Entreprise ACME', 'rh@acme.example.com', 'Nous cherchons un photographe pour des portraits corporate (une vingtaine de personnes).\n\nPouvez-vous nous rappeler ?', false],
  ['Lucas Petit', 'lucas@example.com', 'Est-il possible de récupérer les fichiers RAW ?', true],
];
const insertMessage = db.prepare('INSERT INTO contact_messages (id, name, email, message, read, created_at) VALUES (?, ?, ?, ?, ?, ?)');
for (const [i, [name, email, message, read]] of messages.entries()) {
  insertMessage.run(nanoid(), name, email, message, read ? 1 : 0, new Date(Date.now() - i * 3_600_000).toISOString());
}

db.close();
console.log(`\n[seed] Terminé : ${albums.length} albums, ${photoTotal} photos, ${messages.length} messages.`);
console.log(`[seed] Admin : ${config.adminEmail} (mot de passe : ADMIN_PASSWORD du .env, ou "dev-changeme" par défaut)`);
