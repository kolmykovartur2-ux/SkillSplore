import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { Readable } from 'node:stream';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env.js';

// Object-storage adapter. Two interchangeable drivers:
//   - "local": writes under STORAGE_LOCAL_DIR. Needs no external service.
//   - "s3":    any S3-compatible endpoint (MinIO locally, AWS/Backblaze/etc).
// The rest of the app only depends on this interface, so infrastructure can be
// swapped without touching business logic.

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
    // Prevent path traversal outside the storage root.
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
    // Local driver has no direct-download URL; callers stream through the API,
    // which is where private-document authorisation is enforced anyway.
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
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      credentials:
        env.S3_ACCESS_KEY && env.S3_SECRET_KEY
          ? { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY }
          : undefined,
    });
  }

  async put(prefix: string, filename: string, body: Buffer, contentType: string) {
    const key = safeKey(prefix, filename);
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }),
    );
    return { key, size: body.length, contentType };
  }

  async getStream(key: string) {
    const out = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    return { stream: out.Body as Readable, contentType: out.ContentType };
  }

  async getSignedUrl(key: string, expiresInSeconds = 300) {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: expiresInSeconds,
    });
  }

  async delete(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

export const storage: Storage =
  env.STORAGE_DRIVER === 's3'
    ? new S3Storage(env.S3_BUCKET)
    : new LocalStorage(path.resolve(process.cwd(), env.STORAGE_LOCAL_DIR));
