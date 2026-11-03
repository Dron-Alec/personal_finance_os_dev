#!/usr/bin/env bash
# Full logical backup of the live database. auth is included because every
# row hangs off auth.users ids — a restore without it breaks the FKs.
# The dump holds every user's transactions and password hashes: keep it
# out of the repo and somewhere encrypted.
#
# Usage: scripts/backup-db.sh [out-dir]
#   DATABASE_URL = Session pooler URI (Dashboard → Connect), prompted if unset.
set -euo pipefail

export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH" # server is Postgres 17

if [ -z "${DATABASE_URL:-}" ]; then
  read -rsp "Session pooler URI (with password): " DATABASE_URL
  echo
fi

out_dir="${1:-$HOME/Documents/candid-backups}"
out="$out_dir/candid-$(date +%Y-%m-%d-%H%M).dump"
mkdir -p "$out_dir"
chmod 700 "$out_dir"

pg_dump "$DATABASE_URL" --format=custom --schema=public --schema=private --schema=auth --file="$out"
chmod 600 "$out"

tables=$(pg_restore --list "$out" | grep -c 'TABLE DATA' || true)
echo "Wrote $out"
echo "Tables with data: $tables"
# A dump that "succeeds" with nothing in it is worse than a loud failure.
if [ "$tables" -eq 0 ]; then
  echo "Backup is empty — failing." >&2
  exit 1
fi
if [ -n "${GITHUB_OUTPUT:-}" ]; then echo "file=$out" >> "$GITHUB_OUTPUT"; fi
