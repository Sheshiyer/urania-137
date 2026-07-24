/**
 * Types for the pure helpers exported by scripts/release.mjs so the unit test
 * (src/lib/__tests__/release.test.ts) keeps `tsc` green without allowJs.
 * The script itself remains plain zero-dep Node.
 */
declare module '*/scripts/release.mjs' {
  export const PROD_URL: string

  export interface CommitEntry {
    hash: string
    subject: string
  }

  export interface CommitGroups {
    feat: CommitEntry[]
    fix: CommitEntry[]
    docs: CommitEntry[]
    chore: CommitEntry[]
    test: CommitEntry[]
    other: CommitEntry[]
  }

  export function computeNextVersion(current: string, bump?: string): string
  export function groupCommits(oneline: string): CommitGroups
  export function buildReleaseNotes(
    version: string,
    groups: CommitGroups,
    opts?: { deployedUrl?: string | null },
  ): string
}
