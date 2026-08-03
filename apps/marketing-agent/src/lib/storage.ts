import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { Readable } from 'node:stream';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env.js';

// Media-asset object storage adapter — same swappable local/S3 shape as
// apps/api/src/lib/storage.ts, so this service never requires a proprietary
// storage provider either. Deliberately its own copy, not an import from
// apps/api, to keep the two services independently deployable.

export interface StoredObject {
  key: string;
  size: number;
  contentType: string;
}

export interface Storage {
  put(prefix: string, filename: string, body: Buffer, contentType: string): Promise<StoredObject>;
  getStream(key: string): Promise<{ stream: Readable; contentType?: string }>;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string | null>;
  delete(key: string): Promise<void>;
}

function safeKey(prefix: string, filename: string): string {
  const ext = path.extname(filename).toLowerCase().replace(/[^.a-z0-9]/g, '');
  const rand = crypto.randomBytes(12).toString('hex');
  const cleanPrefix = prefix.replace(/[^a-z0-9/_-]/gi, '').replace(/^\/+|\/+$/g, '');
  return `${cleanPrefix}/${Date.now()}-${rand}${ext}`;
}

class LocalStorage implements Storage {
  constructor(private baseDir: string) {}

  private resolve(key: string): string {
    const full = path.resolve(this.baseDir, key);
    const base = path.resolve(this.baseDir);
    if (full !== base && !full.startsWith(base + path.sep)) {
      throw new Error('Invalid storage key');
    }
    return full;
  }

  async put(prefix: string, filename: string, body: Buffer, contentType: string) {
    const key = safeKey(prefix, filename);
    const full = this.resolve(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, body);
    return { key, size: body.length, contentType };
  }

  async getStream(key: string) {
    const full = this.resolve(key);
    await fs.access(full);
    return { stream: createReadStream(full) };
  }

  async getSignedUrl() {
    return null;
  }

  async delete(key: string) {
    try {
      await fs.unlink(this.resolve(key));
    } catch {
      /* already gone */
    }
  }
}

class S3Storage implements Storage {
  private client: S3Client;
  constructor(private bucket: string) {
    this.client = new S3Client({
      region: env.OBJECT_STORAGE_REGION,
      endpoint: env.OBJECT_STORAGE_ENDPOINT,
      forcePathStyle: true,
      credentials:
        env.OBJECT_STORAGE_ACCESS_KEY && env.OBJECT_STORAGE_SECRET_KEY
          ? { accessKeyId: env.OBJECT_STORAGE_ACCESS_KEY, secretAccessKey: env.OBJECT_STORAGE_SECRET_KEY }
          : undefined,
    });
  }

  async put(prefix: string, filename: string, body: Buffer, contentType: string) {
    const key = safeKey(prefix, filename);
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }));
    return { key, size: body.length, contentType };
  }

  async getStream(key: string) {
    const out = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    return { stream: out.Body as Readable, contentType: out.ContentType };
  }

  async getSignedUrl(key: string, expiresInSeconds = 300) {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), { expiresIn: expiresInSeconds });
  }

  async delete(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

export const storage: Storage =
  env.OBJECT_STORAGE_PROVIDER === 's3'
    ? new S3Storage(env.OBJECT_STORAGE_BUCKET)
    : new LocalStorage(path.resolve(process.cwd(), env.OBJECT_STORAGE_LOCAL_DIR));
