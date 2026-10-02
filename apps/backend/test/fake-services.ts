import { Injectable, Logger } from '@nestjs/common';
import * as mailer from '../src/common/email/mailer';
import { SendEmailParams } from '../src/common/email/mailer';
import { GeocodeAddressInput, GeocodeResult } from '../src/common/geocoding/geocoding.service';
import { v4 as uuidv4 } from 'uuid';

/**
 * FAKE MAILER
 * Captures all emails sent via sendEmail so tests can inspect them,
 * extract OTP verification codes and password reset codes.
 */
export interface CapturedEmail {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  date: Date;
}

export class FakeMailer {
  public sentEmails: CapturedEmail[] = [];
  private originalSendEmail = mailer.sendEmail;

  install(): void {
    (mailer as any).sendEmail = async (params: SendEmailParams): Promise<void> => {
      this.sentEmails.push({
        ...params,
        date: new Date(),
      });
    };
  }

  restore(): void {
    (mailer as any).sendEmail = this.originalSendEmail;
  }

  clear(): void {
    this.sentEmails = [];
  }

  getLastEmail(to?: string): CapturedEmail | undefined {
    const list = to ? this.sentEmails.filter((e) => e.to.toLowerCase() === to.toLowerCase()) : this.sentEmails;
    return list[list.length - 1];
  }

  getLastVerificationCode(to?: string): string | null {
    const email = this.getLastEmail(to);
    if (!email) return null;
    const content = `${email.text ?? ''} ${email.html ?? ''}`;
    // Look for 6-digit OTP code
    const match = content.match(/\b(\d{6})\b/);
    return match ? match[1] : null;
  }

  getLastResetCode(to?: string): string | null {
    return this.getLastVerificationCode(to);
  }
}

export const fakeMailer = new FakeMailer();

/**
 * FAKE R2 STORAGE SERVICE
 * Never connects to Cloudflare R2; stores keys/URLs in memory and returns dummy URLs.
 */
@Injectable()
export class FakeR2Service {
  private readonly logger = new Logger(FakeR2Service.name);
  public readonly publicUrl = 'https://r2-test.hairconnekt.de';
  public readonly bucket: string = process.env.R2_BUCKET_NAME || 'test-bucket';
  public readonly privateBucket: string = process.env.R2_PRIVATE_BUCKET_NAME || 'test-private-bucket';
  public uploadedFiles: Array<{ key: string; mimeType: string; isPrivate: boolean; bucket: string }> = [];
  public deletedFiles: Array<{ key: string; bucket: string }> = [];
  public signedUrlRequests: Array<{ key: string; bucket: string; expiresInSeconds: number }> = [];

  async uploadFile(buffer: Buffer, mimeType: string, folder: string): Promise<string> {
    const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
    const key = `${folder}/${uuidv4()}.${ext}`;
    this.uploadedFiles.push({ key, mimeType, isPrivate: false, bucket: this.bucket });
    return this.getPublicUrlForKey(key);
  }

  async uploadPrivateFile(buffer: Buffer, mimeType: string, folder: string): Promise<string> {
    const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
    const key = `${folder}/${uuidv4()}.${ext}`;
    this.uploadedFiles.push({ key, mimeType, isPrivate: true, bucket: this.privateBucket });
    return key;
  }

  getPublicUrlForKey(key: string): string {
    return `${this.publicUrl}/${key}`;
  }

  async uploadFileWithKey(buffer: Buffer, mimeType: string, key: string): Promise<string> {
    this.uploadedFiles.push({ key, mimeType, isPrivate: false, bucket: this.bucket });
    return this.getPublicUrlForKey(key);
  }

  normalizeStoredKey(value: string): string {
    const trimmed = String(value ?? '').trim();
    if (trimmed.startsWith(`${this.publicUrl}/`)) {
      return trimmed.slice(this.publicUrl.length + 1);
    }
    return trimmed.replace(/^\/+/, '');
  }

  async createSignedReadUrl(storedKey: string, expiresInSeconds = 60): Promise<string> {
    const key = this.normalizeStoredKey(storedKey);
    this.signedUrlRequests.push({ key, bucket: this.privateBucket, expiresInSeconds });
    return `${this.publicUrl}/signed/${key}?expiresIn=${expiresInSeconds}`;
  }

  async deleteFile(url: string): Promise<void> {
    const key = this.normalizeStoredKey(url);
    await this.deleteByKey(key);
  }

  async deleteByKey(key: string): Promise<void> {
    this.uploadedFiles = this.uploadedFiles.filter((f) => !(f.key === key && f.bucket === this.bucket));
    this.deletedFiles.push({ key, bucket: this.bucket });
  }

  async deletePrivateByKey(key: string): Promise<void> {
    this.uploadedFiles = this.uploadedFiles.filter((f) => !(f.key === key && f.bucket === this.privateBucket));
    this.deletedFiles.push({ key, bucket: this.privateBucket });
  }

  clear(): void {
    this.uploadedFiles = [];
    this.deletedFiles = [];
    this.signedUrlRequests = [];
  }
}

/**
 * FAKE GEOCODING SERVICE
 * Returns deterministic coordinates for test addresses without calling Nominatim.
 */
@Injectable()
export class FakeGeocodingService {
  async geocodeAddress(address: GeocodeAddressInput): Promise<GeocodeResult> {
    if (!address.city && !address.postalCode && !address.street) {
      return { status: 'not_found' };
    }
    return {
      status: 'success',
      coordinates: {
        lat: 52.5200,
        lng: 13.4050,
      },
    };
  }
}
