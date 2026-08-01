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
  export function syncLockfileVersion<T>(lock: T, next: string): T

  export interface ReleaseArgs {
    mode: 'prepare' | 'publish'
    bump: 'patch' | 'minor' | 'major' | null
    version: string | null
    readinessRunId: string | null
    dryRun: boolean
    dispatch: boolean
    yes: boolean
  }

  export interface LocalPreflight {
    porcelain: string
    branch: string
    head: string
    originMain: string
    ahead: number
    behind: number
    ciConclusion: string
    localTagExists: boolean
    remoteTagExists: boolean
    backupReceiptValid: boolean
    packageVersion: string
    requestedVersion: string
  }

  export interface ActionsPreflight {
    requestedSha: string
    githubSha: string
    originMain: string
    ciConclusion: string
    localTagExists?: boolean
    remoteTagExists?: boolean
    backupReceiptValid: boolean
    packageVersion: string
    requestedVersion: string
  }

  export function parseReleaseArgs(argv: string[]): ReleaseArgs
  export function parsePorcelainStatus(output: string): string[]
  export function validateLocalPreflight(input: LocalPreflight): string[]
  export function validateActionsPreflight(input: ActionsPreflight): string[]
  export function validateReleasePhases(phases: string[]): string[]
  export function publicationCleanupCommands(tag: string): string[][]
  export function validateBackupReceipt(receipt: unknown, expectedSha: string): boolean
  export function collectLocalPreflight(version: string, env?: NodeJS.ProcessEnv): LocalPreflight
}
