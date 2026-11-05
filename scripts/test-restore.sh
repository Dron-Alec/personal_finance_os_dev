#!/usr/bin/env bash
# Proves a backup actually restores: loads it into a throwaway local
# Postgres 17 container, prints row counts to compare with production, then
# deletes the container. The data never leaves this machine.
#
# Usage: scripts/test-restore.sh [backup.dump | backup.dump.age]
#   default: newest file in ~/Documents/candid-backups
#   .age files are decrypted first (asks for ~/candid-backup-key.txt or $AGE_KEY)
# Needs Docker and the postgresql@17 client (brew install postgresql@17).
set -euo pipefail
export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"

file="${1:-$(ls -t "$HOME"/Documents/candid-backups/*.dump 2>/dev/null | head -1)}"
[ -f "$file" ] || { echo "No backup file found." >&2; exit 1; }

work=$(mktemp -d)
container=candid-restore-test-$$
cleanup() { docker rm -f "$container" >/dev/null 2>&1 || true; rm -rf "$work"; }
trap cleanup EXIT

if [[ "$file" == *.age ]]; then
  age -d -i "${AGE_KEY:-$HOME/candid-backup-key.txt}" -o "$work/backup.dump" "$file"
  file="$work/backup.dump"
fi

docker run -d --name "$container" -e POSTGRES_PASSWORD=restore -p 127.0.0.1:55432:5432 postgres:17 >/dev/null
url="postgresql://postgres:restore@127.0.0.1:55432/postgres"
until pg_isready -q -d "$url"; do sleep 1; done

# Roles the dump's policies refer to. Ownership/grants are skipped (--no-owner --no-acl).
psql -q -d "$url" -c "create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; create role supabase_auth_admin nologin; create role authenticator nologin;"

start=$(date +%s)
# Supabase-specific objects (extensions, publications) may warn; table data is what matters.
pg_restore --no-owner --no-acl -d "$url" "$file" 2> "$work/restore.log" || true
echo "Restored $(basename "$file") in $(( $(date +%s) - start ))s ($(grep -c 'error' "$work/restore.log" || true) restore warnings)"

psql -d "$url" -c "
  select 'transactions' as table_name, count(*) from public.transactions
  union all select 'accounts', count(*) from public.accounts
  union all select 'account_balance_history', count(*) from public.account_balance_history
  union all select 'nw_snapshots', count(*) from public.nw_snapshots
  union all select 'goals', count(*) from public.goals
  union all select 'households', count(*) from public.households
  union all select 'auth.users', count(*) from auth.users
  union all select 'rls policies', count(*) from pg_policies;"
echo "Compare with production (SQL editor): select count(*) from public.transactions; …"
