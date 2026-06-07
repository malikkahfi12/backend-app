import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { randomBytes } from 'crypto';
import type { AppConfig } from '@/config/app.config';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;

@Injectable()
export class StorageService {
  private readonly s3: S3Client;
  private readonly bucketName: string;
  private readonly baseUrl: string;
  private readonly logger = new Logger(StorageService.name);

  constructor(configService: ConfigService<AppConfig, true>) {
    const config = configService.get('storage', { infer: true });

    this.bucketName = config.bucketName;
    this.baseUrl = config.publicUrl;

    this.s3 = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: true,
    });
  }

  async uploadAvatar(
    file: Express.Multer.File,
    userId: string,
  ): Promise<string> {
    this.validateFile(file);
    const ext = MIME_EXTENSIONS[file.mimetype] ?? 'bin';
    const key = `avatars/${userId}/${Date.now()}-${randomBytes(8).toString('hex')}.${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );

    const url = `${this.baseUrl}/${key}`;
    this.logger.log(`Avatar uploaded: ${url}`);
    return url;
  }

  async deleteFileByUrl(url: string): Promise<void> {
    try {
      const prefix = `${this.baseUrl}/`;
      if (!url.startsWith(prefix)) {
        return;
      }
      const key = url.slice(prefix.length);
      if (!key) return;

      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
      this.logger.log(`Deleted: ${key}`);
    } catch (error) {
      this.logger.warn(
        `Failed to delete old avatar: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new Error('No file provided');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File size exceeds 5 MB limit');
    }
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new Error(
        `Unsupported file type: ${file.mimetype}. Allowed: ${[...ALLOWED_MIME_TYPES].join(', ')}`,
      );
    }
  }
}
