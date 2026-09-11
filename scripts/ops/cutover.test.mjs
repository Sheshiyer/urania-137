import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import test from 'node:test'
import { resolve } from 'node:path'
import { executeCutover, gateCutover, parsePagesDeploymentId, planCutover } from './cutover.mjs'
import { validateTargets, validateTargetsShape } from './validate-targets.mjs'

const TARGETS = {
  schema: 'urania.production-targets.v1',
  accountId: 'a'.repeat(32),
  teamDomain: 'red-queen-4dfa.cloudflareaccess.com',
  protectedPagesProjectId: 'protected-project',
  protectedPagesProjectName: 'urania-137',
  protectedHostname: 'urania.tryambakam.space',
  publicPagesProjectId: 'public-project',
  publicPagesProjectName: 'urania-137-landing',
  publicHostname: 'urania-landing.tryambakam.space',
  productionD1Id: 'd57550ea-c8d3-48fc-a2ee-c6b3fc41948e',
  previewD1Id: '6b90d773-0233-4dcf-b548-2feb61365c77',
  recoveryD1Id: 'e'.repeat(8) + '-0000-0000-0000-000000000000',
  accessAud: 'b'.repeat(64),
  accessApplicationId: 'app',
  accessPolicyId: 'pol',
}

test('validateTargetsShape rejects malformed targets', () => {
  const issues = validateTargetsShape({})
  assert.ok(issues.length > 0)
  assert.ok(issues.some((i) => i.includes('accountId')))
})

test('validateTargetsShape accepts well-formed split-host targets', () => {
  assert.deepEqual(validateTargetsShape(TARGETS), [])
  const collapsed = {
    ...TARGETS,
    previewD1Id: TARGETS.productionD1Id,
  }
  assert.ok(validateTargetsShape(collapsed).some((i) => i.includes('differ')))
})

test('validateTargets resolves projects and flags hostname/D1 mismatches (mocked API)', async () => {
  const api = {
    get: async (path) => {
      if (path.includes('urania-137-landing')) return { deployment_configs: {}, domains: [] }
      return {
        deployment_configs: {
          production: { d1_databases: { DB: { id: TARGETS.productionD1Id } } },
          preview: { d1_databases: { DB: { id: TARGETS.previewD1Id } } },
        },
        domains: [{ name: TARGETS.protectedHostname }],
      }
    },
  }
  const report = await validateTargets(TARGETS, api)
  assert.equal(report.ok, true, JSON.stringify(report.results))

  const badHost = { ...TARGETS, protectedHostname: 'wrong.example.com' }
  const badReport = await validateTargets(badHost, api)
  assert.equal(badReport.ok, false)
  assert.ok(badReport.results.some((r) => r.surface === 'pages.protected-hostname' && r.ok === false))
})

test('planCutover rejects unknown mutation and wildcard confirm', () => {
  assert.throws(() => planCutover('rm-rf', {}, TARGETS), /unknown mutation/)
  assert.throws(() => planCutover('app-deploy', { confirm: '*', sha: 'x' }, TARGETS), /wildcards/)
})

test('planCutover resolves the right resource per mutation', () => {
  assert.equal(planCutover('d1-migrate', {}, TARGETS).resource, TARGETS.productionD1Id)
  assert.equal(planCutover('app-deploy', {}, TARGETS).resource, TARGETS.protectedPagesProjectId)
  assert.equal(planCutover('landing-deploy', {}, TARGETS).resource, TARGETS.publicPagesProjectId)
})

test('gateCutover enforces --confirm match and d1 backup receipt', () => {
  const plan = planCutover('d1-migrate', {}, TARGETS)
  assert.ok(gateCutover(plan, {}).includes('d1-migrate requires a --backup receipt'))
  assert.ok(gateCutover(plan, { backupReceipt: { ok: true } }).length === 0, 'backup receipt satisfies d1 gate')
  const applyNoConfirm = gateCutover(plan, { apply: true, backupReceipt: {} })
  assert.ok(applyNoConfirm.some((e) => e.includes('--apply requires --confirm')))
  assert.ok(gateCutover(plan, { apply: true, confirm: 'wrong', backupReceipt: {} }).some((e) => e.includes('does not match')))
})

test('executeCutover dry-runs without calling the runner', () => {
  let calls = 0
  const report = executeCutover('app-deploy', {
    targets: TARGETS,
    artifact: 'dist/app',
    sha: 'a'.repeat(40),
    dryRun: true,
    confirm: null,
    apply: false,
  }, TARGETS, { run: () => { calls += 1; return { status: 0, stdout: '', stderr: '' } } })
  assert.equal(report.ok, true)
  assert.equal(report.dryRun, true)
  assert.equal(calls, 0, 'dry-run must not invoke the runner')
})

const DEPLOY_ID = '11111111-2222-3333-4444-555555555555'

test('executeCutover applies only with --apply + matching --confirm', () => {
  const workspace = mkdtempSync(resolve(tmpdir(), 'urania-cutover-'))
  try {
    let calls = 0
    const receiptPath = resolve(workspace, 'receipt.json')
    const report = executeCutover('app-deploy', {
      targets: TARGETS,
      artifact: 'dist/app',
      sha: 'a'.repeat(40),
      receipt: receiptPath,
      apply: true,
      confirm: TARGETS.protectedPagesProjectId,
    }, TARGETS, {
      run: () => {
        calls += 1
        return { status: 0, stdout: `Deployment complete ${DEPLOY_ID}`, stderr: '' }
      },
    })
    assert.equal(report.ok, true)
    assert.equal(report.dryRun, false)
    assert.equal(calls, 1)
    assert.ok(report.receipt.sha256, 'receipt is checksummed')
    assert.ok(report.receipt.rollbackCommand.length > 0)
    assert.equal(report.receipt.after.sourceSha, 'a'.repeat(40), 'deploy receipt carries sourceSha')
    assert.equal(report.receipt.after.deploymentId, DEPLOY_ID, 'deploymentId recorded from runner stdout')
    assert.equal(report.receipt.deploymentId, DEPLOY_ID, 'deploymentId copied to receipt root')
  } finally {
    rmSync(workspace, { recursive: true, force: true })
  }
})

test('executeCutover mocked apply never reads CLOUDFLARE env for a deployment id', () => {
  const previousToken = process.env.CLOUDFLARE_API_TOKEN
  const previousAccount = process.env.CLOUDFLARE_ACCOUNT_ID
  process.env.CLOUDFLARE_API_TOKEN = 'gha-would-have-a-real-token'
  process.env.CLOUDFLARE_ACCOUNT_ID = 'a'.repeat(32)
  const workspace = mkdtempSync(resolve(tmpdir(), 'urania-cutover-env-'))
  try {
    assert.throws(
      () => executeCutover('app-deploy', {
        targets: TARGETS,
        artifact: 'dist/app',
        sha: 'a'.repeat(40),
        receipt: resolve(workspace, 'receipt.json'),
        apply: true,
        confirm: TARGETS.protectedPagesProjectId,
      }, TARGETS, { run: () => ({ status: 0, stdout: 'deployed', stderr: '' }) }),
      /deployment id missing/,
    )
  } finally {
    if (previousToken === undefined) delete process.env.CLOUDFLARE_API_TOKEN
    else process.env.CLOUDFLARE_API_TOKEN = previousToken
    if (previousAccount === undefined) delete process.env.CLOUDFLARE_ACCOUNT_ID
    else process.env.CLOUDFLARE_ACCOUNT_ID = previousAccount
    rmSync(workspace, { recursive: true, force: true })
  }
})

test('executeCutover records deploymentId from injected fetcher when stdout has none', () => {
  const workspace = mkdtempSync(resolve(tmpdir(), 'urania-cutover-fetch-'))
  try {
    let fetched = 0
    const report = executeCutover('landing-deploy', {
      targets: TARGETS,
      artifact: 'dist/landing',
      sha: 'b'.repeat(40),
      receipt: resolve(workspace, 'receipt.json'),
      apply: true,
      confirm: TARGETS.publicPagesProjectId,
    }, TARGETS, {
      run: () => ({ status: 0, stdout: 'deployed', stderr: '' }),
      fetchDeploymentId: (projectName, sha) => {
        fetched += 1
        assert.equal(projectName, TARGETS.publicPagesProjectName)
        assert.equal(sha, 'b'.repeat(40))
        return DEPLOY_ID
      },
    })
    assert.equal(fetched, 1)
    assert.equal(report.receipt.deploymentId, DEPLOY_ID)
    assert.equal(report.receipt.sourceSha, 'b'.repeat(40))
  } finally {
    rmSync(workspace, { recursive: true, force: true })
  }
})

test('parsePagesDeploymentId reads JSON then a UUID scan', () => {
  assert.equal(parsePagesDeploymentId(`{"id":"${DEPLOY_ID}"}`), DEPLOY_ID)
  assert.equal(parsePagesDeploymentId(`take a peek at ${DEPLOY_ID}`), DEPLOY_ID)
  assert.equal(parsePagesDeploymentId('deployed'), null)
})

test('executeCutover refuses --apply with a non-matching confirm', () => {
  assert.throws(
    () => executeCutover('app-deploy', {
      targets: TARGETS,
      artifact: 'dist/app',
      sha: 'a'.repeat(40),
      apply: true,
      confirm: 'other-project',
    }, TARGETS, { run: () => ({ status: 0, stdout: '', stderr: '' }) }),
    /does not match/,
  )
})

test('executeCutover refuses d1-migrate without a backup receipt', () => {
  assert.throws(
    () => executeCutover('d1-migrate', {
      targets: TARGETS,
      backup: null,
      apply: true,
      confirm: TARGETS.productionD1Id,
    }, TARGETS, { run: () => ({ status: 0, stdout: '', stderr: '' }) }),
    /backup receipt/,
  )
})

test('executeCutover surfaces runner failure', () => {
  assert.throws(
    () => executeCutover('landing-deploy', {
      targets: TARGETS,
      artifact: 'dist/landing',
      sha: 'a'.repeat(40),
      apply: true,
      confirm: TARGETS.publicPagesProjectId,
    }, TARGETS, { run: () => ({ status: 1, stdout: '', stderr: 'boom' }) }),
    /failed/,
  )
})
