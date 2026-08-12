import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import type { Readable } from 'stream';
import { config } from './config.js';

export const s3 = new S3Client({
  endpoint: config.s3Endpoint,
  region: config.s3Region,
  credentials: {
    accessKeyId: config.s3AccessKey,
    secretAccessKey: config.s3SecretKey,
  },
  forcePathStyle: true,
  requestHandler: {
    requestTimeout: 10_000,   // abandon si MinIO ne répond pas en 10s
    connectionTimeout: 5_000, // abandon si la connexion TCP prend plus de 5s
  },
});

const BUCKET = config.s3Bucket;

export async function ensureBucket(): Promise<void> {
  try {
    await s3.send(new CreateBucketCommand({ Bucket: BUCKET }));
  } catch (err: unknown) {
    const code = (err as { Code?: string; name?: string }).Code ?? (err as { name?: string }).name ?? '';
    if (!['BucketAlreadyOwnedByYou', 'BucketAlreadyExists'].includes(code)) throw err;
  }
}

export async function upload(key: string, body: Buffer, contentType: string): Promise<void> {
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType }));
}

export async function download(key: string): Promise<Readable> {
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  return res.Body as Readable;
}

export async function downloadBuffer(key: string): Promise<Buffer> {
  const stream = await download(key);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array));
  }
  return Buffer.concat(chunks);
}

export async function remove(key: string): Promise<void> {
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch { /* already gone */ }
}

export async function exists(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

export async function getContentType(key: string): Promise<string> {
  const res = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
  return res.ContentType ?? 'application/octet-stream';
}
