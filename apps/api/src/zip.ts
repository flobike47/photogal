import { once } from 'events';
import { basename, extname } from 'path';
import type { FastifyReply, FastifyBaseLogger } from 'fastify';
import type { Readable } from 'stream';
import { ZipArchive } from 'archiver';
import { download } from './storage.js';
import { photoKey } from './images.js';
import type { Photo } from './types.js';

function uniqueName(seen: Set<string>, original: string): string {
  if (!seen.has(original)) {
    seen.add(original);
    return original;
  }
  const ext = extname(original);
  const base = original.slice(0, -ext.length || undefined);
  let i = 2;
  let candidate = `${base}_${i}${ext}`;
  while (seen.has(candidate)) {
    i++;
    candidate = `${base}_${i}${ext}`;
  }
  seen.add(candidate);
  return candidate;
}

// Envoie les photos dans un ZIP diffusé au fil de l'eau. Chaque original n'est ouvert sur MinIO
// qu'une fois le précédent écrit : un ZIP n'occupe qu'une connexion, au lieu d'en ouvrir une par
// photo d'avance (ce qui saturait le pool et faisait échouer toutes les autres requêtes).
export async function sendZip(
  reply: FastifyReply,
  filename: string,
  photos: Photo[],
  log: FastifyBaseLogger,
): Promise<void> {
  reply.hijack();
  reply.raw.writeHead(200, {
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
  });

  // Les photos sont déjà compressées : les stocker telles quelles épargne le CPU du Pi
  const archive = new ZipArchive({ store: true });
  const stop = new AbortController();
  let current: Readable | null = null;
  const abort = () => {
    if (stop.signal.aborted) return;
    stop.abort();
    current?.destroy();
    archive.abort();
  };
  archive.on('error', (err) => {
    log.warn({ err }, 'zip interrupted');
    abort();
    reply.raw.destroy();
  });
  reply.raw.on('close', () => {
    if (!reply.raw.writableFinished) abort();
  });
  archive.pipe(reply.raw);

  const seen = new Set<string>();
  for (const photo of photos) {
    if (stop.signal.aborted) return;
    try {
      current = await download(photoKey(photo));
    } catch (err) {
      log.warn({ err, photoId: photo.id }, 'photo missing from zip');
      continue;
    }
    if (stop.signal.aborted) {
      current.destroy();
      return;
    }
    const written = once(archive, 'entry', { signal: stop.signal });
    archive.append(current, { name: uniqueName(seen, basename(photo.original_name)) });
    try {
      await written;
    } catch {
      return; // client parti ou erreur, déjà traités par abort()
    }
  }
  current = null;
  await archive.finalize();
}
