const REDACTED = '[REDACTED]'
const CAPTURE_ENGINE_IDS = new Set(['biofield', 'biofield-capture', 'face-reading'])
const CAPTURE_ENVELOPE_KEYS = new Set([
  'engine_id',
  'result',
  'error',
  '_error',
  'status',
  'failed',
  'witness_prompt',
  'witness_prompts',
  'consciousness_level',
  'metadata',
  'calculated_at',
  'processing_time_ms',
])
const CAPTURE_RESULT_KEYS = new Set([
  'available',
  'reading_id',
  'engine_id',
  'created_at',
  'session_id',
  'analysis_version',
  'contract_version',
  'quality_assessment',
  'analysis',
  'metrics',
  'chakra_readings',
  'areas_of_attention',
  'interpretation',
  'notice',
  'disclaimer',
  'traditions',
  'future_capabilities',
  'computation_mode',
  'is_mock_data',
])

const SENSITIVE_KEYS = new Set([
  'authorization',
  'cookie',
  'credentials',
  'credential',
  'token',
  'secret',
  'password',
  'passphrase',
  'private_key',
  'client_key',
  'client_secret',
  'api_key',
  'access_token',
  'refresh_token',
  'id_token',
  'session_token',
  'jwt',
  'input',
  'inputs',
  'capture',
  'capture_data',
  'capture_input',
  'captured_input',
  'raw_capture',
  'generated_image',
  'input_image',
  'source_image',
  'raw_image',
  'image_data',
  'image_base64',
  'image_bytes',
  'image_blob',
  'b64_json',
  'base64',
  'binary',
  'binary_data',
  'blob',
  'buffer',
  'bytes',
  'byte_array',
  'file_data',
  'file_bytes',
])

function normalizedKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase()
}

function isSensitiveKey(key: string): boolean {
  const normalized = normalizedKey(key)
  return SENSITIVE_KEYS.has(normalized)
    || normalized.endsWith('_password')
    || normalized.endsWith('_passphrase')
    || normalized.endsWith('_secret')
    || normalized.endsWith('_api_key')
    || normalized.endsWith('_token')
    || normalized.endsWith('_credentials')
}

function isEncodedBody(value: string): boolean {
  const compact = value.trim()
  if (/^data:(?:image|audio|video|application\/octet-stream)\/?[^,]*;base64,/i.test(compact)) return true
  if (/^eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(compact)) return true
  return compact.length >= 128
    && compact.length % 4 === 0
    && /^[A-Za-z0-9+/\r\n]+={0,2}$/.test(compact)
}

function containsCredentialUrl(value: string): boolean {
  const candidate = value.trim()
  if (!/^(?:https?:\/\/|\/)/i.test(candidate)) return false
  try {
    const url = new URL(candidate, 'https://local.invalid')
    if (url.username || url.password) return true
    for (const key of url.searchParams.keys()) {
      const normalized = normalizedKey(key)
      if (
        isSensitiveKey(key)
        || normalized === 'key'
        || normalized === 'sig'
        || normalized.endsWith('_signature')
        || normalized.endsWith('_auth')
      ) {
        return true
      }
    }
  } catch {
    return false
  }
  return false
}

function isImagePayload(value: unknown): boolean {
  return typeof value !== 'string'
    || isEncodedBody(value)
    || /^(?:https?:)?\/\//i.test(value.trim())
    || value.trim().startsWith('/')
}

type SourcePolicy = 'normal' | 'capture-envelope' | 'capture-result'

function privacySafeSource(
  value: unknown,
  seen = new WeakSet<object>(),
  policy: SourcePolicy = 'normal',
): unknown {
  if (typeof value === 'string') {
    return isEncodedBody(value) || containsCredentialUrl(value) ? REDACTED : value
  }
  if (typeof value !== 'object' || value === null) return value
  if (
    (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer)
    || (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView(value))
  ) {
    return REDACTED
  }
  if (seen.has(value)) return '[Circular]'
  seen.add(value)

  if (Array.isArray(value)) return value.map((item) => privacySafeSource(item, seen, policy))
  if (value instanceof Date) return value.toJSON()

  const record = value as Record<string, unknown>
  const engineId = typeof record.engine_id === 'string' ? record.engine_id : null
  const effectivePolicy = policy === 'normal' && engineId && CAPTURE_ENGINE_IDS.has(engineId)
    ? 'capture-envelope'
    : policy
  const allowedKeys = effectivePolicy === 'capture-envelope'
    ? CAPTURE_ENVELOPE_KEYS
    : effectivePolicy === 'capture-result'
      ? CAPTURE_RESULT_KEYS
      : null

  return Object.fromEntries(
    Object.entries(record).map(([key, item]) => [
      key,
      isSensitiveKey(key)
        || (normalizedKey(key) === 'image' && isImagePayload(item))
        || (allowedKeys !== null && !allowedKeys.has(key))
        ? REDACTED
        : privacySafeSource(
            item,
            seen,
            effectivePolicy === 'capture-envelope' && key === 'result'
              ? 'capture-result'
              : 'normal',
          ),
    ]),
  )
}

export function privacySafeSourceJson(value: unknown): string {
  try {
    return JSON.stringify(privacySafeSource(value), null, 2)
  } catch {
    return 'The source payload could not be serialized for display.'
  }
}

export function ReadingSourcePayload({ payload }: { payload: unknown }) {
  return (
    <details className="border-y border-gold/15 py-3">
      <summary className="min-h-10 cursor-pointer py-2 font-display text-[9px] uppercase tracking-[0.2em] text-gold marker:text-gold">
        Technical source
      </summary>
      <p className="mb-3 max-w-2xl text-[10px] leading-relaxed text-silver/65">
        This collapsed, privacy-filtered record shows the local engine response used by the visual elements. It is provenance, not an additional interpretation.
      </p>
      <pre className="max-h-[34rem] overflow-auto border border-gold/10 bg-void/80 p-3 font-mono text-[10px] leading-relaxed text-parchment/75">
        <code>{privacySafeSourceJson(payload)}</code>
      </pre>
    </details>
  )
}
