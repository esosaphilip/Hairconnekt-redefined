#!/usr/bin/env bash
set -euo pipefail

file="${1:-}"
target="${2:-}"

if [[ -z "$file" || -z "$target" ]]; then
  echo "Usage: $0 <backup.dump> <target_database_url>" >&2
  exit 1
fi

pg_restore --no-owner --no-privileges --clean --if-exists --dbname "$target" "$file"

