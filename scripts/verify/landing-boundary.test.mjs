import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import test from 'node:test'

const ROOT = resolve(new URL('../..', import.meta.url).pathname)
const LANDING_OUTPUT = join(ROOT, 'dist', 'landing')
const TEXT_EXTENSIONS = new Set(['.html', '.js', '.css', '.json', '.svg', '.txt', '.xml'])
const FORBIDDEN_BUNDLE_MARKERS = [
  '/api/me',
  '/api/subjects',
  'CF_ACCESS_AUD',
  'CF_ACCESS_TEAM_DOMAIN',
  'SELEMENE_API_KEY',
  'NARRATOR_LLM_URL',
  'd57550ea-c8d3-48fc-a2ee-c6b3fc41948e',
  'AppShell',
  'src/main.tsx',
  '#/console',
]

function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? filesUnder(path) : [path]
  })
}

test('landing build is a separate static artifact with one allowlisted exit', () => {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const build = spawnSync(npm, ['run', 'build:landing', '--silent'], {
    cwd: ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      VITE_PROTECTED_APP_ORIGIN: 'https://app.urania.tryambakam.space',
    },
  })
  assert.equal(build.status, 0, build.stderr || build.stdout)
  assert.equal(existsSync(join(LANDING_OUTPUT, 'index.html')), true)
  assert.equal(existsSync(join(LANDING_OUTPUT, '404.html')), true)
  assert.equal(existsSync(join(LANDING_OUTPUT, 'favicon.svg')), true)
  assert.equal(existsSync(join(LANDING_OUTPUT, 'media', 'field-poster.svg')), true)
  assert.equal(existsSync(join(LANDING_OUTPUT, '_headers')), true)

  const text = filesUnder(LANDING_OUTPUT)
    .filter((path) => TEXT_EXTENSIONS.has(extname(path)))
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n')

  for (const marker of FORBIDDEN_BUNDLE_MARKERS) {
    assert.equal(text.includes(marker), false, `landing bundle contains forbidden marker: ${marker}`)
  }
  assert.equal(text.includes('preload="auto"'), false)
  assert.match(text, /https:\/\/app\.urania\.tryambakam\.space\//)
  assert.match(text, /rel="icon" href="\/favicon\.svg"/)
  assert.match(text, /prefers-reduced-motion/)

  const clientJavaScriptBytes = filesUnder(LANDING_OUTPUT)
    .filter((path) => extname(path) === '.js')
    .reduce((total, path) => total + readFileSync(path).byteLength, 0)
  assert.ok(clientJavaScriptBytes < 10_000, `landing client JavaScript is ${clientJavaScriptBytes} bytes`)

  const notFound = readFileSync(join(LANDING_OUTPUT, '404.html'), 'utf8')
  assert.match(notFound, /public site contains no application or API routes/i)
  assert.doesNotMatch(notFound, /https:\/\/app\.|\/api\//)
})

test('build scripts and Wrangler config preserve the artifact boundary', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
  assert.match(pkg.scripts['build:app'], /vite build --config vite\.config\.ts/)
  assert.match(pkg.scripts['build:landing'], /vite build --config vite\.landing\.config\.ts/)
  assert.match(pkg.scripts.build, /build:app.*build:landing/)

  const appConfig = readFileSync(join(ROOT, 'vite.config.ts'), 'utf8')
  assert.match(appConfig, /outDir:\s*'dist\/app'/)
  const appWranglerConfig = readFileSync(join(ROOT, 'wrangler.toml'), 'utf8')
  assert.match(appWranglerConfig, /pages_build_output_dir\s*=\s*"dist\/app"/)
  const landingConfig = readFileSync(join(ROOT, 'wrangler.landing.toml'), 'utf8')
  assert.match(landingConfig, /pages_build_output_dir\s*=\s*"dist\/landing"/)
  assert.doesNotMatch(
    landingConfig,
    /\[\[d1_databases\]\]|\[vars\]|functions(?:_directory)?\s*=/i,
  )

  const landingHeaders = readFileSync(join(LANDING_OUTPUT, '_headers'), 'utf8')
  assert.match(landingHeaders, /Content-Security-Policy:/)
  assert.match(landingHeaders, /default-src 'none'/)
  assert.match(landingHeaders, /frame-ancestors 'none'/)
  assert.match(landingHeaders, /Strict-Transport-Security:/)
})
