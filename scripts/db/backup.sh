#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

mkdir -p backups
out="backups/hairconnekt-$(date +%Y%m%d-%H%M%S).dump"

pg_dump "$DATABASE_URL" --format=custom --no-owner --no-privileges --file "$out"
echo "$out"

