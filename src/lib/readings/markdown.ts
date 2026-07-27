export type ReadingBodyBlock =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'code'; language: string | null; text: string }

/**
 * Small, deterministic block parser for stored reading Markdown. It handles
 * the structures Urania itself archives without adding an HTML parser or
 * allowing embedded markup.
 */
export function parseReadingBody(input: string): ReadingBodyBlock[] {
  const blocks: ReadingBodyBlock[] = []
  const lines = input.replace(/\r\n/g, '\n').split('\n')
  let paragraph: string[] = []
  let list: { ordered: boolean; items: string[] } | null = null
  let code: { language: string | null; lines: string[] } | null = null

  const flushParagraph = () => {
    if (!paragraph.length) return
    blocks.push({ kind: 'paragraph', text: paragraph.join(' ').trim() })
    paragraph = []
  }
  const flushList = () => {
    if (!list) return
    blocks.push({ kind: 'list', ordered: list.ordered, items: list.items })
    list = null
  }

  for (const line of lines) {
    const fence = line.match(/^```(.*)$/)
    if (fence) {
      flushParagraph()
      flushList()
      if (code) {
        blocks.push({ kind: 'code', language: code.language, text: code.lines.join('\n') })
        code = null
      } else {
        code = { language: fence[1].trim() || null, lines: [] }
      }
      continue
    }
    if (code) {
      code.lines.push(line)
      continue
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/)
    if (heading) {
      flushParagraph()
      flushList()
      blocks.push({ kind: 'heading', level: heading[1].length, text: heading[2].trim() })
      continue
    }

    const unordered = line.match(/^\s*[-*]\s+(.+)$/)
    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/)
    if (unordered || ordered) {
      flushParagraph()
      const isOrdered = Boolean(ordered)
      const text = (ordered?.[1] ?? unordered?.[1] ?? '').trim()
      if (!list || list.ordered !== isOrdered) flushList()
      if (!list) list = { ordered: isOrdered, items: [] }
      list.items.push(text)
      continue
    }

    if (!line.trim()) {
      flushParagraph()
      flushList()
      continue
    }
    flushList()
    paragraph.push(line.trim())
  }

  if (code) blocks.push({ kind: 'code', language: code.language, text: code.lines.join('\n') })
  flushParagraph()
  flushList()
  return blocks
}
