import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class R2Service {
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
    return this.uploadFileWithKey(buffer, mimeType, key);
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
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
          CacheControl: 'public, max-age=31536000',
        }),
      );
      return this.getPublicUrlForKey(key);
    } catch (err) {
      console.error('R2 upload error:', err);
      throw new InternalServerErrorException('Bild konnte nicht hochgeladen werden.');
    }
  }

  async deleteFile(url: string): Promise<void> {
    const key = url.replace(`${this.publicUrl}/`, '');
    await this.deleteByKey(key);
  }

  async deleteByKey(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch (err) {
      console.error('R2 delete error:', err);
      throw new InternalServerErrorException(
        'Datei konnte nicht aus dem Speicher gelöscht werden.',
      );
    }
  }
}
