import { extname } from 'path';
import { Worker } from 'worker_threads';
import sharp from 'sharp';
import { upload } from './storage.js';
import { config } from './config.js';
import type { Photo } from './types.js';

// Une image de 24 MP décodée occupe ~70-100 Mo : sur un Raspberry Pi, on en traite une à la fois
// et on limite le cache libvips, sinon un upload massif sature la mémoire.
sharp.concurrency(1);
sharp.cache({ memory: 50 });

function createLimiter(max: number) {
  let active = 0;
  const waiting: (() => void)[] = [];
  return async function run<T>(task: () => Promise<T>): Promise<T> {
    if (active >= max) await new Promise<void>((resolve) => waiting.push(resolve));
    else active++;
    try {
      return await task();
    } finally {
      const next = waiting.shift();
      if (next) next();
      else active--;
    }
  };
}

// File commune à tous les traitements lourds (conversion HEIC, miniatures)
const imageLimit = createLimiter(config.imageConcurrency);

// Le sharp précompilé ne décode pas le HEVC (brevets) : les HEIC d'iPhone passent
// par libheif en WASM (heic-decode), qui applique déjà la rotation propre au HEIC.
export function isHeic(mimeType: string, filename = ''): boolean {
  return ['image/heic', 'image/heif'].includes(mimeType)
    || ['.heic', '.heif'].includes(extname(filename).toLowerCase());
}

type DecodedHeic = { width: number; height: number; data: Uint8ClampedArray };
type WorkerReply = Partial<DecodedHeic> & { id: number; error?: string };

let heicWorker: Worker | null = null;
let nextJobId = 0;
const heicJobs = new Map<number, { resolve: (r: DecodedHeic) => void; reject: (e: Error) => void }>();

function getHeicWorker(): Worker {
  if (heicWorker) return heicWorker;
  // En dev (tsx) ce module est un .ts, en prod le .js compilé
  const ext = import.meta.url.endsWith('.ts') ? '.ts' : '.js';
  const worker = new Worker(new URL(`./heic-worker${ext}`, import.meta.url));
  worker.unref(); // ne retient pas le processus (scripts) tant qu'aucun décodage n'est en cours
  worker.on('message', ({ id, error, width, height, data }: WorkerReply) => {
    const job = heicJobs.get(id);
    if (!job) return;
    heicJobs.delete(id);
    if (heicJobs.size === 0) worker.unref();
    if (error || !data) job.reject(new Error(error ?? 'HEIF processing error'));
    else job.resolve({ width: width!, height: height!, data });
  });
  const fail = (err: Error) => {
    heicWorker = null;
    for (const job of heicJobs.values()) job.reject(err);
    heicJobs.clear();
  };
  worker.on('error', fail);
  worker.on('exit', (code) => fail(new Error(`HEIC worker exited (${code})`)));
  heicWorker = worker;
  return worker;
}

function decodeHeicInWorker(buffer: Buffer): Promise<DecodedHeic> {
  const worker = getHeicWorker();
  const id = nextJobId++;
  return new Promise((resolve, reject) => {
    heicJobs.set(id, { resolve, reject });
    worker.ref();
    worker.postMessage({ id, buffer });
  });
}

async function convertHeic(buffer: Buffer, quality: number): Promise<Buffer> {
  const { width, height, data } = await decodeHeicInWorker(buffer);
  return sharp(Buffer.from(data.buffer, data.byteOffset, data.byteLength), { raw: { width, height, channels: 4 } })
    .jpeg({ quality })
    .toBuffer();
}

export function heicToJpeg(buffer: Buffer, quality = 92): Promise<Buffer> {
  return imageLimit(() => convertHeic(buffer, quality));
}

export function photoKey(photo: Photo): string {
  return `photos/${photo.album_id}/${photo.filename}`;
}

export function thumbKey(photo: Photo): string {
  return `photos/${photo.album_id}/thumbs/${photo.id}.jpg`;
}

// Générations en cours : une miniature demandée plusieurs fois n'est calculée qu'une fois
const thumbsInFlight = new Map<string, Promise<void>>();

// `src` peut être une fonction de chargement : l'original n'est alors lu (depuis MinIO)
// qu'une fois une place libre dans la file, pour ne pas accumuler les fichiers en mémoire.
export function generateAndUploadThumb(
  src: Buffer | (() => Promise<Buffer>),
  tKey: string,
  mimeType = '',
): Promise<void> {
  const pending = thumbsInFlight.get(tKey);
  if (pending) return pending;

  const job = imageLimit(async () => {
    const srcBuffer = typeof src === 'function' ? await src() : src;
    const input = isHeic(mimeType) ? await convertHeic(srcBuffer, 92) : srcBuffer;
    return sharp(input)
      .rotate() // applique l'orientation EXIF (photos de téléphone), perdue sinon avec les métadonnées
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
  })
    .then((thumbBuffer) => upload(tKey, thumbBuffer, 'image/jpeg'))
    .finally(() => thumbsInFlight.delete(tKey));

  thumbsInFlight.set(tKey, job);
  return job;
}
