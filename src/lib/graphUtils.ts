/** Shared geometry + text helpers for the stellar graphs. */

/**
 * Wrap a node label into balanced lines so it fits inside a child orb.
 * Greedy fill to `maxChars`, capped at `maxLines` (overflow folds into the last).
 */
export function wrapLabel(label: string, maxChars = 11, maxLines = 3): string[] {
  const words = label.split(' ')
  if (words.length === 1) return [label]

  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    if (!cur) cur = w
    else if ((cur + ' ' + w).length <= maxChars) cur += ' ' + w
    else {
      lines.push(cur)
      cur = w
    }
  }
  if (cur) lines.push(cur)

  if (lines.length > maxLines) {
    const head = lines.slice(0, maxLines - 1)
    const tail = lines.slice(maxLines - 1).join(' ')
    return [...head, tail]
  }
  return lines
}

/**
 * Deterministic pseudo-random in [0,1) from an integer + salt. Seeded by index
 * (not Math.random) so the starfield stays put across re-renders and resizes.
 */
export function noise(i: number, salt = 0): number {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453
  return x - Math.floor(x)
}

export const toRad = (deg: number) => (deg * Math.PI) / 180
