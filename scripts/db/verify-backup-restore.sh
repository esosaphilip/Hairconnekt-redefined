#!/usr/bin/env bash
set -euo pipefail

source_url="${SOURCE_DATABASE_URL:-${1:-}}"
target_url="${TARGET_DATABASE_URL:-${2:-}}"

if [[ -z "$source_url" || -z "$target_url" ]]; then
  echo "Usage:" >&2
  echo "  SOURCE_DATABASE_URL=... TARGET_DATABASE_URL=... $0" >&2
  echo "or:" >&2
  echo "  $0 <source_database_url> <target_database_url>" >&2
  exit 1
fi

./scripts/db/check-tools.sh >/dev/null

echo "Checking source connectivity..."
psql "$source_url" -v ON_ERROR_STOP=1 -c "select 1 as ok;" >/dev/null

echo "Checking target connectivity..."
psql "$target_url" -v ON_ERROR_STOP=1 -c "select 1 as ok;" >/dev/null

mkdir -p backups
dump_file="backups/hairconnekt-verify-$(date +%Y%m%d-%H%M%S).dump"

echo "Creating backup: $dump_file"
pg_dump "$source_url" --format=custom --no-owner --no-privileges --file "$dump_file"

echo "Restoring into target..."
pg_restore --no-owner --no-privileges --clean --if-exists --dbname "$target_url" "$dump_file"

echo "Basic post-restore checks..."
psql "$target_url" -v ON_ERROR_STOP=1 -c "\dt" >/dev/null

echo "OK: backup+restore completed"

