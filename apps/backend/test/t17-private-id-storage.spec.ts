import { R2Service } from '../src/common/storage/r2.service';
import {
  runMigration,
  MigrationOptions,
  normalizeETag,
} from '../scripts/migrate-id-documents-to-private-bucket';
import {
  ListObjectsV2Command,
  HeadObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
  PutObjectCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';

// Mock getSignedUrl so we can inspect what command was passed
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(async (client: any, command: any, options: any) => {
    return `https://signed.hairconnekt.de/${command.input.Bucket}/${command.input.Key}?expiresIn=${options?.expiresIn ?? 60}`;
  }),
}));

describe('T17: Private ID Document Storage & Migration (BUG-045 step 2)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.R2_BUCKET_NAME = 'hairconnekt-media';
    process.env.R2_PRIVATE_BUCKET_NAME = 'hairconnekt-private-docs';
    process.env.R2_PUBLIC_URL = 'https://media.hairconnekt.de';
    process.env.R2_ENDPOINT = 'https://dummy-account.r2.cloudflarestorage.com';
    process.env.R2_ACCESS_KEY_ID = 'dummy-key';
    process.env.R2_SECRET_ACCESS_KEY = 'dummy-secret';
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe('1. R2Service constructor validation & fail-fast', () => {
    it('constructor throws when R2_PRIVATE_BUCKET_NAME is missing, empty, or equal to R2_BUCKET_NAME', () => {
      // 1. Missing / undefined
      delete process.env.R2_PRIVATE_BUCKET_NAME;
      expect(() => new R2Service()).toThrow(
        'R2_PRIVATE_BUCKET_NAME is required but missing or empty',
      );

      // 2. Empty string
      process.env.R2_PRIVATE_BUCKET_NAME = '   ';
      expect(() => new R2Service()).toThrow(
        'R2_PRIVATE_BUCKET_NAME is required but missing or empty',
      );

      // 3. Identical to public bucket
      process.env.R2_BUCKET_NAME = 'hairconnekt-media';
      process.env.R2_PRIVATE_BUCKET_NAME = 'hairconnekt-media';
      expect(() => new R2Service()).toThrow(
        'R2_PRIVATE_BUCKET_NAME must not be the same as R2_BUCKET_NAME',
      );

      // 4. Distinct valid buckets -> succeeds
      process.env.R2_BUCKET_NAME = 'hairconnekt-media';
      process.env.R2_PRIVATE_BUCKET_NAME = 'hairconnekt-private-docs';
      expect(() => new R2Service()).not.toThrow();
    });
  });

  describe('2. R2Service upload & delete separation', () => {
    let service: R2Service;
    let s3ClientMock: { send: jest.Mock };

    beforeEach(() => {
      service = new R2Service();
      s3ClientMock = { send: jest.fn().mockResolvedValue({}) };
      (service as any).client = s3ClientMock;
    });

    it('uploadPrivateFile writes to the private bucket with Cache-Control: private, no-cache, no-store', async () => {
      const buffer = Buffer.from('test-id-doc-binary');
      const key = await service.uploadPrivateFile(buffer, 'image/jpeg', 'id-documents');

      expect(key).toMatch(/^id-documents\/[a-f0-9-]+\.jpg$/);
      expect(s3ClientMock.send).toHaveBeenCalledTimes(1);

      const command = s3ClientMock.send.mock.calls[0][0];
      expect(command).toBeInstanceOf(PutObjectCommand);
      expect(command.input.Bucket).toBe('hairconnekt-private-docs');
      expect(command.input.Key).toBe(key);
      expect(command.input.ContentType).toBe('image/jpeg');
      expect(command.input.CacheControl).toBe('private, no-cache, no-store');
    });

    it('uploadFile and uploadFileWithKey still target the public bucket with public cache header', async () => {
      const buffer = Buffer.from('test-public-image');

      // uploadFile
      const publicUrl = await service.uploadFile(buffer, 'image/png', 'avatars');
      expect(publicUrl).toMatch(/^https:\/\/media\.hairconnekt\.de\/avatars\/[a-f0-9-]+\.png$/);

      const cmd1 = s3ClientMock.send.mock.calls[0][0];
      expect(cmd1.input.Bucket).toBe('hairconnekt-media');
      expect(cmd1.input.CacheControl).toBe('public, max-age=31536000');

      // uploadFileWithKey
      const key = 'popular-styles/braids-1.webp';
      const urlWithKey = await service.uploadFileWithKey(buffer, 'image/webp', key);
      expect(urlWithKey).toBe('https://media.hairconnekt.de/popular-styles/braids-1.webp');

      const cmd2 = s3ClientMock.send.mock.calls[1][0];
      expect(cmd2.input.Bucket).toBe('hairconnekt-media');
      expect(cmd2.input.Key).toBe(key);
      expect(cmd2.input.CacheControl).toBe('public, max-age=31536000');
    });

    it('deletePrivateByKey targets the private bucket', async () => {
      await service.deletePrivateByKey('id-documents/old-id.jpg');

      expect(s3ClientMock.send).toHaveBeenCalledTimes(1);
      const command = s3ClientMock.send.mock.calls[0][0];
      expect(command).toBeInstanceOf(DeleteObjectCommand);
      expect(command.input.Bucket).toBe('hairconnekt-private-docs');
      expect(command.input.Key).toBe('id-documents/old-id.jpg');
    });
  });

  describe('3. R2Service createSignedReadUrl & dual-read fallback', () => {
    let service: R2Service;
    let s3ClientMock: { send: jest.Mock };

    beforeEach(() => {
      service = new R2Service();
      s3ClientMock = { send: jest.fn() };
      (service as any).client = s3ClientMock;
    });

    it('signs against the private bucket when object exists there', async () => {
      // HeadObject on private bucket succeeds
      s3ClientMock.send.mockResolvedValueOnce({
        ContentLength: 12345,
        ETag: '"etag-123"',
      });

      const signedUrl = await service.createSignedReadUrl('id-documents/passport.jpg', 60);

      expect(signedUrl).toContain('/hairconnekt-private-docs/id-documents/passport.jpg');
      expect(s3ClientMock.send).toHaveBeenCalledTimes(1);
      const headCmd = s3ClientMock.send.mock.calls[0][0];
      expect(headCmd).toBeInstanceOf(HeadObjectCommand);
      expect(headCmd.input.Bucket).toBe('hairconnekt-private-docs');
      expect(headCmd.input.Key).toBe('id-documents/passport.jpg');
    });

    it('falls back to public bucket ONLY on not found and logs warning without the key', async () => {
      const warnSpy = jest.spyOn((service as any).logger, 'warn').mockImplementation(() => {});

      // HeadObject on private bucket returns 404 NotFound
      const notFoundErr = new Error('NotFound');
      notFoundErr.name = 'NotFound';
      (notFoundErr as any).$metadata = { httpStatusCode: 404 };
      s3ClientMock.send.mockRejectedValueOnce(notFoundErr);

      const secretKey = 'id-documents/secret-passport-photo.jpg';
      const signedUrl = await service.createSignedReadUrl(secretKey, 60);

      // Falls back to public bucket
      expect(signedUrl).toContain('/hairconnekt-media/id-documents/secret-passport-photo.jpg');

      // Warning logged without the key
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith('ID document served from legacy public bucket');
      const loggedArg = warnSpy.mock.calls[0][0];
      expect(loggedArg).not.toContain(secretKey);
      expect(loggedArg).not.toContain('passport');
    });

    it('rethrows other errors from HeadObject without falling back to public bucket', async () => {
      const fatalErr = new Error('Cloudflare network unreachable');
      fatalErr.name = 'TimeoutError';
      (fatalErr as any).$metadata = { httpStatusCode: 500 };
      s3ClientMock.send.mockRejectedValueOnce(fatalErr);

      await expect(
        service.createSignedReadUrl('id-documents/passport.jpg', 60),
      ).rejects.toThrow('Cloudflare network unreachable');
    });
  });

  describe('4. R2Service onModuleInit startup check', () => {
    it('sends HeadBucketCommand in production and throws on error, but skips in non-production', async () => {
      const service = new R2Service();
      const sendMock = jest.fn();
      (service as any).client = { send: sendMock };

      // Non-production (test/dev) -> skips check
      process.env.NODE_ENV = 'test';
      await service.onModuleInit();
      expect(sendMock).not.toHaveBeenCalled();

      // Production -> sends HeadBucket to private bucket
      process.env.NODE_ENV = 'production';
      sendMock.mockResolvedValueOnce({});
      await service.onModuleInit();
      expect(sendMock).toHaveBeenCalledTimes(1);
      const cmd = sendMock.mock.calls[0][0];
      expect(cmd).toBeInstanceOf(HeadBucketCommand);
      expect(cmd.input.Bucket).toBe('hairconnekt-private-docs');

      // Production with unreachable bucket -> throws error
      sendMock.mockRejectedValueOnce(new Error('BucketNotFound'));
      await expect(service.onModuleInit()).rejects.toThrow(
        'R2 private bucket "hairconnekt-private-docs" is unreachable or credentials lack access. Startup aborted.',
      );
    });
  });

  describe('5. ID Document Migration Script Logic (runMigration)', () => {
    // Helper in-memory S3 client for testing migration script
    class FakeMigrationS3Client {
      public buckets: Record<string, Map<string, { size: number; etag: string; body?: Buffer }>> = {
        'hairconnekt-media': new Map(),
        'hairconnekt-private-docs': new Map(),
      };
      public callLog: string[] = [];

      constructor() {
        this.buckets['hairconnekt-media'].set('id-documents/doc1.jpg', {
          size: 1024,
          etag: 'etag1',
        });
        this.buckets['hairconnekt-media'].set('id-documents/doc2.png', {
          size: 2048,
          etag: 'etag2',
        });
        // Non-id-document file to verify prefix isolation
        this.buckets['hairconnekt-media'].set('avatars/user.jpg', {
          size: 512,
          etag: 'etag-avatar',
        });
      }

      async send(command: any): Promise<any> {
        const bucketName: string = command.input?.Bucket ?? '';
        const key: string = command.input?.Key ?? '';

        if (command instanceof ListObjectsV2Command) {
          this.callLog.push(`ListObjectsV2:${bucketName}:${command.input?.Prefix ?? ''}`);
          const bucket = this.buckets[bucketName] || new Map();
          const prefix = command.input?.Prefix || '';
          const contents = Array.from(bucket.entries())
            .filter(([k]) => k.startsWith(prefix))
            .map(([Key, val]) => ({ Key, Size: val.size, ETag: `"${val.etag}"` }));
          return { Contents: contents, IsTruncated: false };
        }

        if (command instanceof HeadObjectCommand) {
          this.callLog.push(`HeadObject:${bucketName}:${key}`);
          const bucket = this.buckets[bucketName];
          const obj = bucket?.get(key);
          if (!obj) {
            const err: any = new Error('NotFound');
            err.name = 'NotFound';
            err.$metadata = { httpStatusCode: 404 };
            throw err;
          }
          return { ContentLength: obj.size, ETag: `"${obj.etag}"` };
        }

        if (command instanceof CopyObjectCommand) {
          const copySource: string = command.input?.CopySource ?? '';
          this.callLog.push(`CopyObject:${copySource}->${bucketName}/${key}`);
          const [srcBucket, ...srcKeyParts] = copySource.split('/');
          const srcKey = srcKeyParts.join('/');
          const srcObj = this.buckets[srcBucket]?.get(srcKey);
          if (!srcObj) throw new Error(`Source object not found: ${copySource}`);
          if (!this.buckets[bucketName]) {
            this.buckets[bucketName] = new Map();
          }
          this.buckets[bucketName].set(key, { ...srcObj });
          return {};
        }

        if (command instanceof DeleteObjectCommand) {
          this.callLog.push(`DeleteObject:${bucketName}:${key}`);
          this.buckets[bucketName]?.delete(key);
          return {};
        }

        throw new Error(`Unexpected command: ${command.constructor?.name}`);
      }
    }

    const silentLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    it('dry run mode lists what it would copy and delete, but performs zero copies or deletes', async () => {
      const client = new FakeMigrationS3Client();
      const options: MigrationOptions = {
        mode: 'dry-run',
        sourceBucket: 'hairconnekt-media',
        targetBucket: 'hairconnekt-private-docs',
      };

      const result = await runMigration(client as any, options, silentLogger);

      expect(result.mode).toBe('dry-run');
      expect(result.totalFound).toBe(2); // doc1.jpg and doc2.png (avatars/ ignored)
      expect(result.copied).toBe(2); // Would copy 2
      expect(result.purged).toBe(2); // Would purge 2
      expect(result.errors).toBe(0);

      // Verify ZERO write or delete commands were actually executed on the S3 client
      expect(client.callLog.some((c) => c.startsWith('CopyObject'))).toBe(false);
      expect(client.callLog.some((c) => c.startsWith('DeleteObject'))).toBe(false);
      expect(client.buckets['hairconnekt-private-docs'].size).toBe(0);
      expect(client.buckets['hairconnekt-media'].size).toBe(3);
    });

    it('--copy mode copies all uncopied objects and verifies size/ETag via HeadObject', async () => {
      const client = new FakeMigrationS3Client();
      const options: MigrationOptions = {
        mode: 'copy',
        sourceBucket: 'hairconnekt-media',
        targetBucket: 'hairconnekt-private-docs',
      };

      const result = await runMigration(client as any, options, silentLogger);

      expect(result.mode).toBe('copy');
      expect(result.totalFound).toBe(2);
      expect(result.copied).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.errors).toBe(0);

      // Private bucket now contains both objects
      expect(client.buckets['hairconnekt-private-docs'].has('id-documents/doc1.jpg')).toBe(true);
      expect(client.buckets['hairconnekt-private-docs'].has('id-documents/doc2.png')).toBe(true);
      // Source bucket objects remain intact
      expect(client.buckets['hairconnekt-media'].has('id-documents/doc1.jpg')).toBe(true);
    });

    it('--copy mode stops immediately on size or ETag mismatch without proceeding', async () => {
      const client = new FakeMigrationS3Client();
      // Corrupt target copy simulation
      const originalSend = client.send.bind(client);
      client.send = async (cmd: any) => {
        const res = await originalSend(cmd);
        if (cmd instanceof HeadObjectCommand && cmd.input.Bucket === 'hairconnekt-private-docs') {
          return { ContentLength: 999999, ETag: '"corrupt-etag"' }; // Mismatch!
        }
        return res;
      };

      const options: MigrationOptions = {
        mode: 'copy',
        sourceBucket: 'hairconnekt-media',
        targetBucket: 'hairconnekt-private-docs',
      };

      await expect(runMigration(client as any, options, silentLogger)).rejects.toThrow(
        /Verification failed for "id-documents\/doc1\.jpg": source size 1024 != target size 999999/,
      );
    });

    it('re-running --copy skips already-moved and verified objects', async () => {
      const client = new FakeMigrationS3Client();
      // Pre-populate target with verified doc1.jpg
      client.buckets['hairconnekt-private-docs'].set('id-documents/doc1.jpg', {
        size: 1024,
        etag: 'etag1',
      });

      const options: MigrationOptions = {
        mode: 'copy',
        sourceBucket: 'hairconnekt-media',
        targetBucket: 'hairconnekt-private-docs',
      };

      const result = await runMigration(client as any, options, silentLogger);

      expect(result.totalFound).toBe(2);
      expect(result.skipped).toBe(1); // doc1.jpg skipped
      expect(result.copied).toBe(1); // doc2.png copied
      expect(result.errors).toBe(0);

      // Verify CopyObject was called only for doc2
      const copyCalls = client.callLog.filter((c) => c.startsWith('CopyObject'));
      expect(copyCalls).toHaveLength(1);
      expect(copyCalls[0]).toContain('id-documents/doc2.png');
    });

    it('--purge-source mode deletes only verified objects and never touches other prefixes', async () => {
      const client = new FakeMigrationS3Client();
      // doc1 is in target and verified; doc2 is NOT in target
      client.buckets['hairconnekt-private-docs'].set('id-documents/doc1.jpg', {
        size: 1024,
        etag: 'etag1',
      });

      const options: MigrationOptions = {
        mode: 'purge-source',
        sourceBucket: 'hairconnekt-media',
        targetBucket: 'hairconnekt-private-docs',
      };

      const result = await runMigration(client as any, options, silentLogger);

      expect(result.mode).toBe('purge-source');
      expect(result.purged).toBe(1); // doc1 purged
      expect(result.errors).toBe(1); // doc2 cannot be purged (not in target)

      // doc1 was deleted from public bucket
      expect(client.buckets['hairconnekt-media'].has('id-documents/doc1.jpg')).toBe(false);
      // doc2 was NOT deleted from public bucket
      expect(client.buckets['hairconnekt-media'].has('id-documents/doc2.png')).toBe(true);
      // avatars/ was NEVER touched
      expect(client.buckets['hairconnekt-media'].has('avatars/user.jpg')).toBe(true);
    });

    it('normalizeETag helper correctly strips quotes and whitespace', () => {
      expect(normalizeETag('"abc-123"')).toBe('abc-123');
      expect(normalizeETag('"""xyz"""')).toBe('xyz');
      expect(normalizeETag('plain-etag')).toBe('plain-etag');
      expect(normalizeETag(undefined)).toBe('');
      expect(normalizeETag(null)).toBe('');
    });
  });
});
