import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class R2Service {
  private readonly logger = new Logger(R2Service.name);
  private client: S3Client;
  private bucket: string;
  private publicUrl: string;

  constructor() {
    this.bucket = process.env.R2_BUCKET_NAME!;
    this.publicUrl = process.env.R2_PUBLIC_URL!;
    this.client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT!,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }

  async uploadFile(
    buffer: Buffer,
    mimeType: string,
    folder: string,
  ): Promise<string> {
    const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
    const key = `${folder}/${uuidv4()}.${ext}`;
    await this.putObject(buffer, mimeType, key, 'public, max-age=31536000');
    return this.getPublicUrlForKey(key);
  }

  async uploadPrivateFile(
    buffer: Buffer,
    mimeType: string,
    folder: string,
  ): Promise<string> {
    const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
    const key = `${folder}/${uuidv4()}.${ext}`;
    await this.putObject(buffer, mimeType, key, 'private, max-age=0, no-store');
    return key;
  }

  getPublicUrlForKey(key: string): string {
    return `${this.publicUrl}/${key}`;
  }

  async uploadFileWithKey(
    buffer: Buffer,
    mimeType: string,
    key: string,
  ): Promise<string> {
    try {
      await this.putObject(buffer, mimeType, key, 'public, max-age=31536000');
      return this.getPublicUrlForKey(key);
    } catch (err) {
      this.logger.error('R2 upload failed');
      throw new InternalServerErrorException('Bild konnte nicht hochgeladen werden.');
    }
  }

  normalizeStoredKey(value: string): string {
    const trimmed = String(value ?? '').trim();
    if (!trimmed) {
      throw new InternalServerErrorException('Ungueltiger Dateischluessel.');
    }

    if (trimmed.startsWith(`${this.publicUrl}/`)) {
      return trimmed.slice(this.publicUrl.length + 1);
    }

    return trimmed.replace(/^\/+/, '');
  }

  async createSignedReadUrl(
    storedKey: string,
    expiresInSeconds = 60,
  ): Promise<string> {
    try {
      const key = this.normalizeStoredKey(storedKey);
      return await getSignedUrl(
        this.client as any,
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
        { expiresIn: expiresInSeconds },
      );
    } catch (err) {
      this.logger.error('R2 signed URL generation failed');
      throw new InternalServerErrorException(
        'Datei konnte nicht sicher bereitgestellt werden.',
      );
    }
  }

  async deleteFile(url: string): Promise<void> {
    const key = this.normalizeStoredKey(url);
    await this.deleteByKey(key);
  }

  async deleteByKey(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch (err) {
      this.logger.error('R2 delete failed');
      throw new InternalServerErrorException(
        'Datei konnte nicht aus dem Speicher gelöscht werden.',
      );
    }
  }

  private async putObject(
    buffer: Buffer,
    mimeType: string,
    key: string,
    cacheControl: string,
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        CacheControl: cacheControl,
      }),
    );
  }
}
