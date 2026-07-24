# Release workflow

How the Urania 137 SPA is versioned, released, and deployed — and where the
running version shows up in the UI.

## Cutting a release

```bash
node scripts/release.mjs [patch|minor|major|X.Y.Z] [--dry-run] [--deploy] [--yes]
```

- **Bump** — default `patch`. An explicit `X.Y.Z` is validated as semver.
- **`--dry-run`** — prints the full plan (next version, notes, exact commands)
  and exits 0 with no side effects. Run this first.
- **`--yes`** — skips the interactive confirmation before pushing. Required in
  non-interactive shells.
- **`--deploy`** — after the GitHub release, runs the production deploy and
  appends the deployment URL to the release notes.

Typical flow:

```bash
node scripts/release.mjs --dry-run          # inspect the plan
node scripts/release.mjs minor --deploy     # confirm, release, deploy
```

## What the script does

1. **Guards** — refuses (exit 1) when the tracked working tree is dirty, when
   the computed tag `vX.Y.Z` already exists, or when `gh auth status` fails.
2. **Bump** — writes the new semver into `package.json` (the single source of
   truth for the app version).
3. **Notes** — `git log <last-tag>..HEAD --oneline` (last tag found via
   `git tag -l 'v*' --sort=-v:refname`; if there is no tag yet, full history
   capped at 50 lines), grouped by conventional-commit prefix
   (feat / fix / docs / chore / test / other). Always includes the production
   URL <https://urania.tryambakam.space>.
4. **Release** — commits ONLY `package.json` as `chore(release): vX.Y.Z`,
   creates the annotated tag `vX.Y.Z`, pushes the current branch and the tag,
   and creates the GitHub release with the notes
   (`gh release create vX.Y.Z --title "vX.Y.Z" --notes-file -`).
5. **Summary** — prints version, tag, release URL, and the deploy URL when
   `--deploy` was used.

## How the version reaches the UI

```
package.json ──read by──▶ vite.config.ts `define`
                              ├─ __APP_VERSION__   (from package.json)
                              ├─ __APP_BUILD_TIME__ (ISO at build time)
                              └─ __APP_BUILD_SHA__  (git rev-parse --short HEAD, 'dev' fallback)
                                   │  (ambient declarations live in src/vite-env.d.ts)
                                   ▼
                        src/lib/appVersion.ts (tolerant readers + formatting)
                                   ▼
        VersionBadge (bottom-right of the rail)  ·  SettingsPanel (Settings card)
```

So bumping `package.json` via the release script is all it takes — the next
build stamps the new version into the bundle automatically.

## Where the version shows up

- **VersionBadge** — a subtle `vX.Y.Z · sha` pill pinned to the right edge of
  the bottom chrome rail (rendered by `BottomChrome`, so every page gets it).
  Clicking it opens Settings.
- **Settings card** — app version, build time (UTC), short SHA, the signed-in
  identity (via `useMe` → `GET /api/me`), and logout (`/api/logout`, full
  navigation so CF Access tears down the session).

This is the **app** version. The Selemene **engine** version
(`health.version`) is shown separately in Engine Status.

## Deploy tie-in

Production deploy (unchanged):

```bash
npm run build && wrangler pages deploy dist --project-name urania-137 --branch main --commit-dirty=true
```

`--deploy` runs exactly this after the release and edits the GitHub release
notes to record the deployment URL.
