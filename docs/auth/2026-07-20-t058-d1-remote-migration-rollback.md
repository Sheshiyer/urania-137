# T-058/T-065 — D1 remote migration 0001: pre-apply snapshot + rollback (R5 amendment)

**Date:** 2026-07-20 · **Account:** 9d9d (`9d9d23b27f32e70ae3afb6a1aa2c0f10`) · **DB:** `urania-137-db`
(`d57550ea-c8d3-48fc-a2ee-c6b3fc41948e`, region APAC) · **Migration:** `migrations/0001_init.sql`

## Pre-apply snapshot

Taken with `wrangler d1 export` immediately BEFORE the first `--remote` apply:

```
npx wrangler d1 export urania-137-db --remote \
  --output=backups/d1/urania-137-db-pre-0001-2026-07-20.sql
```

Result: the database was EMPTY (export contains only `PRAGMA defer_foreign_keys=TRUE;` — no
schema, no rows). Snapshot file: `backups/d1/urania-137-db-pre-0001-2026-07-20.sql` (committed).

## Rollback procedure for 0001_init

Because the pre-0001 state was empty, rollback is simply dropping the 0001 schema objects.
There is no user data to preserve at this point; if 0001 must be reverted AFTER real data
exists, take a fresh `wrangler d1 export` snapshot first and adapt step 2.

1. Snapshot current state (mandatory before any rollback):

   ```
   npx wrangler d1 export urania-137-db --remote \
     --output=backups/d1/urania-137-db-pre-rollback-$(date +%F).sql
   ```

2. Drop the 0001 objects (order matters: indexes, then readings, then users):

   ```
   npx wrangler d1 execute urania-137-db --remote --command "
     DROP INDEX IF EXISTS idx_readings_user_fav;
     DROP INDEX IF EXISTS idx_readings_user_time;
     DROP TABLE IF EXISTS readings;
     DROP TABLE IF EXISTS users;"
   ```

3. Remove 0001 from the migrations bookkeeping table so a later apply re-runs it cleanly:

   ```
   npx wrangler d1 execute urania-137-db --remote --command \
     "DELETE FROM d1_migrations WHERE name = '0001_init.sql';"
   ```

4. Verify rollback: `npx wrangler d1 migrations list urania-137-db --remote` shows 0001 under
   "Migrations to be applied", and `PRAGMA table_info(users);` returns no rows.

## Restore-from-snapshot alternative

For a full restore instead of a targeted drop:

```
npx wrangler d1 execute urania-137-db --remote \
  --file=backups/d1/urania-137-db-pre-0001-2026-07-20.sql
```

(Only meaningful once a snapshot with real content exists; the pre-0001 snapshot is empty.)
