import {
  ReportGenerationRequest,
  DeterministicRequest,
  WitnessMode,
  DeterministicWorkflow,
} from '../types'

const BASE_URL = import.meta.env.VITE_SELEMENE_API_URL || 'https://selemene.tryambakam.space'
const API_KEY = import.meta.env.VITE_SELEMENE_API_KEY || ''

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (API_KEY) {
    h['X-API-Key'] = API_KEY
  }
  return h
}

export async function generateWitnessReport(
  request: ReportGenerationRequest
): Promise<unknown> {
  const res = await fetch(`${BASE_URL}/api/v1/assets/generate`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(request),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Witness API error ${res.status}: ${text}`)
  }
  return res.json()
}

export async function executeDeterministicWorkflow(
  workflowId: DeterministicWorkflow,
  request: DeterministicRequest
): Promise<unknown> {
  const res = await fetch(`${BASE_URL}/api/v1/workflows/${workflowId}/execute`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(request),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Workflow API error ${res.status}: ${text}`)
  }
  return res.json()
}

export function isDeterministicWorkflow(id: string): id is DeterministicWorkflow {
  return [
    'birth-blueprint',
    'daily-practice',
    'decision-support',
    'self-inquiry',
    'creative-expression',
    'full-spectrum',
  ].includes(id)
}

export function isWitnessMode(id: string): id is WitnessMode {
  return [
    'birth-blueprint',
    'integrated-reading',
    'integrated-reading-l4',
    'mother-son-lineage',
    'business-partners',
    'family-penta',
    'unmarried-partners',
    'married-partners',
    'synastry',
    'transit',
    'bridge-query',
  ].includes(id)
}
