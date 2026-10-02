import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class R2Service implements OnModuleInit {
  private readonly logger = new Logger(R2Service.name);
  private client: S3Client;
  private bucket: string;
  private privateBucket: string;
  private publicUrl: string;

  constructor() {
    const bucket = (process.env.R2_BUCKET_NAME ?? '').trim();
    const privateBucket = (process.env.R2_PRIVATE_BUCKET_NAME ?? '').trim();

    if (!privateBucket) {
      throw new Error('R2_PRIVATE_BUCKET_NAME is required but missing or empty');
    }
    if (bucket && privateBucket === bucket) {
      throw new Error('R2_PRIVATE_BUCKET_NAME must not be the same as R2_BUCKET_NAME');
    }

    this.bucket = bucket;
    this.privateBucket = privateBucket;
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

  async onModuleInit(): Promise<void> {
    if (process.env.NODE_ENV !== 'production') {
      return;
    }
    try {
      await this.client.send(
        new HeadBucketCommand({ Bucket: this.privateBucket }),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Private R2 bucket "${this.privateBucket}" check failed on startup: ${msg}`);
      throw new Error(`R2 private bucket "${this.privateBucket}" is unreachable or credentials lack access. Startup aborted.`);
    }
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
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.privateBucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        CacheControl: 'private, no-cache, no-store',
      }),
    );
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
    const key = this.normalizeStoredKey(storedKey);
    let targetBucket = this.privateBucket;

    // TODO(BUG-045): remove after migration
    // Temporary read-only fallback for the migration window:
    // First HeadObject in the private bucket; only if that returns "not found",
    // sign against the public bucket instead and log one warning line (without the key).
    // Any other error is thrown, not swallowed.
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.privateBucket,
          Key: key,
        }),
      );
    } catch (err: any) {
      const isNotFound =
        err?.name === 'NotFound' ||
        err?.name === 'NoSuchKey' ||
        err?.$metadata?.httpStatusCode === 404;

      if (isNotFound) {
        this.logger.warn('ID document served from legacy public bucket');
        targetBucket = this.bucket;
      } else {
        this.logger.error('R2 HeadObject failed on private bucket');
        throw err;
      }
    }

    try {
      return await getSignedUrl(
        this.client as any,
        new GetObjectCommand({
          Bucket: targetBucket,
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

  async deletePrivateByKey(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.privateBucket, Key: key }),
      );
    } catch (err) {
      this.logger.error('R2 private delete failed');
      throw new InternalServerErrorException(
        'Datei konnte nicht aus dem privaten Speicher gelöscht werden.',
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
