#!/usr/bin/env bash
set -euo pipefail

missing=0

for bin in pg_dump pg_restore psql; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    echo "Missing required tool: $bin" >&2
    missing=1
  fi
done

if [[ "$missing" -ne 0 ]]; then
  exit 1
fi

echo "OK"

