# Database Backup/Restore Runbook (Render Postgres)

This runbook covers how to take a production backup of the HairConnekt Postgres database on Render and how to restore it into a separate database for verification.

## Preconditions

- You have access to the Render dashboard for the Postgres instance.
- You have the production `DATABASE_URL`.
- Local tools installed: `pg_dump`, `pg_restore`, `psql`.
- Your connection method is non-interactive (either the password is in the URL, or you use a `.pgpass` entry).

## Backup (Recommended: custom format)

1) Export the production connection string:

```bash
export DATABASE_URL="postgres://..."
```

2) Create a timestamped backup file:

```bash
mkdir -p backups
pg_dump "$DATABASE_URL" --format=custom --no-owner --no-privileges --file "backups/hairconnekt-$(date +%Y%m%d-%H%M%S).dump"
```

You can also use the helper:

```bash
./scripts/db/backup.sh
```

3) Store the backup securely (private bucket/drive). Treat it like a secret.

## Restore (verification target)

Restore should always go into a separate database (never restore into production).

If you want an automated end-to-end verification (backup → restore), you need:
- `SOURCE_DATABASE_URL` (production)
- `TARGET_DATABASE_URL` (separate database you can safely overwrite)

1) Create an empty target database (example on a local Postgres):

```bash
createdb hairconnekt_restore_verify
```

2) Restore the dump:

```bash
pg_restore --no-owner --no-privileges --clean --if-exists --dbname "postgresql://localhost/hairconnekt_restore_verify" "backups/<file>.dump"
```

You can also use the helper:

```bash
./scripts/db/restore.sh "backups/<file>.dump" "postgresql://localhost/hairconnekt_restore_verify"
```

Or run the full verification helper (backup + restore + basic checks):

```bash
SOURCE_DATABASE_URL="$DATABASE_URL" \
TARGET_DATABASE_URL="postgresql://localhost/hairconnekt_restore_verify" \
./scripts/db/verify-backup-restore.sh
```

3) Verify basic integrity:

```bash
psql "postgresql://localhost/hairconnekt_restore_verify" -c "\dt"
psql "postgresql://localhost/hairconnekt_restore_verify" -c "select count(*) from \"user\";"
psql "postgresql://localhost/hairconnekt_restore_verify" -c "select count(*) from booking;"
```

## Render-native safety net (Dashboard)

If available on your Render plan, also enable/verify automated backups/snapshots in the Render Postgres dashboard and confirm the retention policy matches your operational needs.
