# Import the protected 723 reading archive

`readings:import-archive` inventories the bounded `723` corpus and prepares one
migration-036 transaction. It selects exactly one completed HTML render for
each of 51 Solo and 2 Synastry units:

1. `new-l0-local/reading.html` when present
2. `local/reading.html` otherwise

The importer streams each selected file to compute SHA-256, records metadata
and an absolute canonical filesystem locator, and never copies rendered bytes
into PostgreSQL. Solo labels remain candidate subjects. The two bounded
Synastry units preserve two separate candidate participants and an explicit
relationship row; they are never silently merged with other subject records.
Display names are deterministic title-cased labels, while stable IDs retain
the exact raw unit key.

## Dry-run first

Migration `036_living_readings_archive.sql` and the owner `users` row must
already exist in the target database.

```sh
npm run readings:import-archive -- \
  --corpus-root /absolute/path/to/723 \
  --owner-email owner@example.com \
  --confirm-owner-consent
```

This is the default and performs no database write. Standard output is a
privacy-safe JSON inventory: it hashes the owner email and omits absolute
paths. Add `--show-paths` only for a private operator inspection.

To review the transaction without applying it:

```sh
npm run readings:import-archive -- \
  --corpus-root /absolute/path/to/723 \
  --owner-email owner@example.com \
  --confirm-owner-consent \
  --sql-out ./archive-import.sql
```

The SQL file is forced to mode `0600` because it contains the owner email and
canonical artifact locators, and an existing destination is never overwritten.
`--show-sql` is an explicit alternative that writes SQL to standard output and
the JSON summary to standard error.

## Apply

Configure the Selemene process to resolve the same artifacts:

```sh
export LIVING_READING_ARTIFACT_ROOT=/absolute/path/to/723
```

`LIVING_READING_ARTIFACT_ROOT` and `--corpus-root` must resolve to the same
canonical directory. Supply `DATABASE_URL` through the operator environment or
secret manager, then run:

```sh
npm run readings:import-archive -- \
  --corpus-root "$LIVING_READING_ARTIFACT_ROOT" \
  --owner-email owner@example.com \
  --confirm-owner-consent \
  --apply
```

Apply invokes the local `psql` executable without putting the database URL or
credentials in process arguments, generated SQL, or command output. It uses a
temporary mode-`0600` SQL file and removes it afterward.

The transaction is idempotent only for an exact manifest match. It aborts on
changed content, locator or identity collisions, deleted records, archived
subjects, non-reusable import runs, or an existing current editorial state
other than `approved`/`owner_only`. Imported readings are therefore eligible
for completed-reading invitations while remaining private by default.
