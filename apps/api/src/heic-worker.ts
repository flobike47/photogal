import { parentPort } from 'worker_threads';
import decodeHeic from 'heic-decode';

// Le décodage libheif (WASM) est synchrone : exécuté ici, il ne bloque plus les requêtes de l'API.
parentPort!.on('message', async ({ id, buffer }: { id: number; buffer: Uint8Array }) => {
  try {
    const { width, height, data } = await decodeHeic({
      buffer: Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength),
    });
    parentPort!.postMessage({ id, width, height, data }, [data.buffer as ArrayBuffer]);
  } catch (err) {
    parentPort!.postMessage({ id, error: err instanceof Error ? err.message : String(err) });
  }
});
