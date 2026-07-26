#!/usr/bin/env node
import { parseArgs } from 'node:util'
import { loadPilotDescriptor, preparePilot, serializePilot } from './lib/pilot-import.mjs'
import { buildPilotSoftDeleteSql, buildPilotUpsertSql } from './lib/pilot-sql.mjs'

const { values } = parseArgs({
  options: {
    descriptor: { type: 'string' },
    'corpus-root': { type: 'string' },
    bucket: { type: 'string', default: 'tryambakam-noesis-readings' },
    sql: { type: 'boolean', default: false },
    'delete-sql': { type: 'boolean', default: false },
  },
})

if (!values.descriptor || !values['corpus-root']) {
  process.stderr.write(
    'Usage: prepare-pilot --descriptor <json> --corpus-root <dir> [--bucket <name>] [--sql|--delete-sql]\n',
  )
  process.exitCode = 2
} else {
  const pilot = await preparePilot(await loadPilotDescriptor(values.descriptor), {
    corpusRoot: values['corpus-root'],
  })
  if (values.sql) {
    process.stdout.write(buildPilotUpsertSql(pilot, { bucket: values.bucket }))
  } else if (values['delete-sql']) {
    process.stdout.write(buildPilotSoftDeleteSql(pilot))
  } else {
    process.stdout.write(`${JSON.stringify(serializePilot(pilot), null, 2)}\n`)
  }
}
