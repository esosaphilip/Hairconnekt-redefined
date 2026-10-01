import {
  S3Client,
  ListObjectsV2Command,
  HeadObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

export type MigrationMode = 'dry-run' | 'copy' | 'purge-source';

export interface MigrationOptions {
  mode: MigrationMode;
  sourceBucket: string;
  targetBucket: string;
  prefix?: string;
}

export interface MigrationItemResult {
  key: string;
  action: 'copied' | 'skipped' | 'purged' | 'dry-run-copy' | 'dry-run-purge' | 'error';
  reason?: string;
}

export interface MigrationSummary {
  mode: MigrationMode;
  sourceBucket: string;
  targetBucket: string;
  totalFound: number;
  copied: number;
  skipped: number;
  purged: number;
  errors: number;
  items: MigrationItemResult[];
}

export interface LoggerInterface {
  log: (msg: string) => void;
  warn: (msg: string) => void;
  error: (msg: string) => void;
}

/**
 * Normalizes ETags by stripping leading/trailing double-quotes.
 */
export function normalizeETag(etag?: string | null): string {
  if (!etag) return '';
  return etag.replace(/^"+|"+$/g, '').trim();
}

/**
 * Core migration function that operates purely on the S3/R2 client.
 * Takes the client as a parameter so it can be fully tested using a fake/mock client.
 */
export async function runMigration(
  s3Client: S3Client | any,
  options: MigrationOptions,
  logger: LoggerInterface = console,
): Promise<MigrationSummary> {
  const prefix = options.prefix ?? 'id-documents/';
  const summary: MigrationSummary = {
    mode: options.mode,
    sourceBucket: options.sourceBucket,
    targetBucket: options.targetBucket,
    totalFound: 0,
    copied: 0,
    skipped: 0,
    purged: 0,
    errors: 0,
    items: [],
  };

  if (!options.sourceBucket || !options.targetBucket) {
    throw new Error('Both sourceBucket and targetBucket must be defined.');
  }

  if (options.sourceBucket === options.targetBucket) {
    throw new Error('sourceBucket and targetBucket must not be the same.');
  }

  logger.log(`Starting ID document migration in mode: [${options.mode}]`);
  logger.log(`Source (public) bucket: "${options.sourceBucket}"`);
  logger.log(`Target (private) bucket: "${options.targetBucket}"`);
  logger.log(`Prefix: "${prefix}"`);

  // 1. Enumerate all objects under prefix in source bucket (handling pagination)
  let continuationToken: string | undefined = undefined;
  const sourceObjects: Array<{ key: string; size: number; etag: string }> = [];

  do {
    const listRes: any = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: options.sourceBucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );

    if (listRes.Contents) {
      for (const obj of listRes.Contents) {
        if (obj.Key && obj.Key.startsWith(prefix) && !obj.Key.endsWith('/')) {
          sourceObjects.push({
            key: obj.Key,
            size: obj.Size ?? 0,
            etag: normalizeETag(obj.ETag),
          });
        }
      }
    }

    continuationToken = listRes.IsTruncated ? listRes.NextContinuationToken : undefined;
  } while (continuationToken);

  summary.totalFound = sourceObjects.length;
  logger.log(`Found ${sourceObjects.length} object(s) in source bucket under prefix "${prefix}".`);

  // 2. Process each object according to mode
  for (const src of sourceObjects) {
    // Safety check: Never touch keys outside prefix
    if (!src.key.startsWith(prefix)) {
      logger.warn(`Skipping key outside prefix: "${src.key}"`);
      continue;
    }

    // Inspect target bucket for this key
    let targetExists = false;
    let targetSize = 0;
    let targetETag = '';

    try {
      const headRes: any = await s3Client.send(
        new HeadObjectCommand({
          Bucket: options.targetBucket,
          Key: src.key,
        }),
      );
      targetExists = true;
      targetSize = headRes.ContentLength ?? 0;
      targetETag = normalizeETag(headRes.ETag);
    } catch (err: any) {
      const isNotFound =
        err?.name === 'NotFound' ||
        err?.name === 'NoSuchKey' ||
        err?.$metadata?.httpStatusCode === 404;

      if (!isNotFound) {
        summary.errors++;
        summary.items.push({ key: src.key, action: 'error', reason: `HeadObject failed: ${err.message}` });
        logger.error(`Error checking target object "${src.key}": ${err.message}`);
        throw new Error(`Migration stopped on error checking "${src.key}": ${err.message}`);
      }
    }

    const matches = targetExists && targetSize === src.size && (!src.etag || !targetETag || targetETag === src.etag);

    // ── Mode: dry-run ────────────────────────────────────────────────────────
    if (options.mode === 'dry-run') {
      if (matches) {
        logger.log(`[DRY-RUN] "${src.key}": already copied and verified in target bucket.`);
        summary.skipped++;
        summary.items.push({ key: src.key, action: 'skipped', reason: 'already exists in target' });
      } else {
        logger.log(`[DRY-RUN] "${src.key}": would copy from source to target (size: ${src.size} bytes).`);
        summary.copied++;
        summary.items.push({ key: src.key, action: 'dry-run-copy' });
      }
      logger.log(`[DRY-RUN] "${src.key}": would delete from source bucket after verified copy.`);
      summary.purged++;
      summary.items.push({ key: src.key, action: 'dry-run-purge' });
      continue;
    }

    // ── Mode: copy ───────────────────────────────────────────────────────────
    if (options.mode === 'copy') {
      if (matches) {
        logger.log(`"${src.key}": already exists in target with matching size/ETag. Skipping copy.`);
        summary.skipped++;
        summary.items.push({ key: src.key, action: 'skipped', reason: 'already exists in target' });
        continue;
      }

      logger.log(`Copying "${src.key}" to target bucket...`);
      await s3Client.send(
        new CopyObjectCommand({
          CopySource: `${options.sourceBucket}/${src.key}`,
          Bucket: options.targetBucket,
          Key: src.key,
        }),
      );

      // Verify immediately with HeadObject on copy
      const verifyRes: any = await s3Client.send(
        new HeadObjectCommand({
          Bucket: options.targetBucket,
          Key: src.key,
        }),
      );
      const copiedSize = verifyRes.ContentLength ?? 0;
      const copiedETag = normalizeETag(verifyRes.ETag);

      if (copiedSize !== src.size) {
        summary.errors++;
        const errorMsg = `Verification failed for "${src.key}": source size ${src.size} != target size ${copiedSize}. Migration halted.`;
        summary.items.push({ key: src.key, action: 'error', reason: errorMsg });
        logger.error(errorMsg);
        throw new Error(errorMsg);
      }

      if (src.etag && copiedETag && copiedETag !== src.etag) {
        summary.errors++;
        const errorMsg = `Verification failed for "${src.key}": source ETag ${src.etag} != target ETag ${copiedETag}. Migration halted.`;
        summary.items.push({ key: src.key, action: 'error', reason: errorMsg });
        logger.error(errorMsg);
        throw new Error(errorMsg);
      }

      logger.log(`Verified copy of "${src.key}" (size: ${copiedSize} bytes).`);
      summary.copied++;
      summary.items.push({ key: src.key, action: 'copied' });
      continue;
    }

    // ── Mode: purge-source ───────────────────────────────────────────────────
    if (options.mode === 'purge-source') {
      if (!matches) {
        summary.errors++;
        const reason = !targetExists
          ? 'not present in target bucket'
          : `size/ETag mismatch (source: ${src.size}B/${src.etag}, target: ${targetSize}B/${targetETag})`;
        logger.warn(`CANNOT purge "${src.key}" from public bucket: ${reason}. Skipped.`);
        summary.items.push({ key: src.key, action: 'error', reason });
        continue;
      }

      logger.log(`Purging verified object "${src.key}" from source bucket...`);
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: options.sourceBucket,
          Key: src.key,
        }),
      );
      summary.purged++;
      summary.items.push({ key: src.key, action: 'purged' });
    }
  }

  logger.log(`\nMigration completed (${options.mode}): Total found: ${summary.totalFound}, Copied: ${summary.copied}, Skipped: ${summary.skipped}, Purged: ${summary.purged}, Errors: ${summary.errors}`);
  return summary;
}

// CLI entry point: executed only when called directly from terminal, NOT when imported in tests
/* istanbul ignore next */
if (require.main === module) {
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const sourceBucket = process.env.R2_BUCKET_NAME;
  const targetBucket = process.env.R2_PRIVATE_BUCKET_NAME;

  if (!endpoint || !accessKeyId || !secretAccessKey || !sourceBucket || !targetBucket) {
    console.error(
      'Error: Missing required environment variables.\n' +
      'Required: R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PRIVATE_BUCKET_NAME',
    );
    process.exit(1);
  }

  if (sourceBucket.trim() === targetBucket.trim()) {
    console.error('Error: R2_BUCKET_NAME and R2_PRIVATE_BUCKET_NAME must not be the same.');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  let mode: MigrationMode = 'dry-run';
  if (args.includes('--copy')) {
    mode = 'copy';
  } else if (args.includes('--purge-source')) {
    mode = 'purge-source';
  }

  const client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });

  runMigration(client, {
    mode,
    sourceBucket: sourceBucket.trim(),
    targetBucket: targetBucket.trim(),
  })
    .then((result) => {
      console.log('Result:', {
        mode: result.mode,
        totalFound: result.totalFound,
        copied: result.copied,
        skipped: result.skipped,
        purged: result.purged,
        errors: result.errors,
      });
      process.exit(result.errors > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error('Migration aborted with error:', err.message);
      process.exit(1);
    });
}
