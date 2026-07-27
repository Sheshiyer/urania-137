# Urania graph-first UI evidence

This directory contains bounded verification records for the graph-first UI
realignment. Every identity, reading, relationship, checksum, timestamp, and
network response used by the visual matrix is deterministic and synthetic.
`Reader A` is the identity mask used immediately before screenshots.

The matrix runs against a local built application with intercepted,
allowlisted fixture responses. It does not write to D1, KV, Vectorize, or any
other persistence layer, and it never calls or mutates live Selemene services.
No production account, corpus record, capture, or media payload belongs here.

`manifest.json` is the machine-readable index. Each row declares:

- a stable `id`;
- a `fixtureLabel` declared by `syntheticFixtureLabels`;
- one PNG `screenshot`;
- one `domText` snapshot;
- one `requests` record;
- one `console` record;
- one `axe` accessibility record.

`allowlist.txt` names itself, this README, the manifest, and every exact
artifact produced by the matrix. Files not named there are outside the
evidence contract. The redaction gate compares the directory to that list,
checks every row record, and rejects real identity data, credentials, birth
facts, local corpus paths, or raw capture and media payloads before staging.
