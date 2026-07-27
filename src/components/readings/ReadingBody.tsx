import { parseReadingBody } from '../../lib/readings/markdown'

type ReadingHeading = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

function contextualHeadingLevel(sourceLevel: number, offset: number): number {
  return Math.min(Math.max(sourceLevel + offset, 1), 6)
}

export function ReadingBody({
  body,
  headingLevelOffset = 0,
}: {
  body: string
  headingLevelOffset?: number
}) {
  const blocks = parseReadingBody(body)
  return (
    <div className="max-w-[var(--reading-measure,70ch)] min-w-0 space-y-4 break-words text-base leading-7 text-current">
      {blocks.map((block, index) => {
        if (block.kind === 'heading') {
          const headingLevel = contextualHeadingLevel(block.level, headingLevelOffset)
          const Heading = `h${headingLevel}` as ReadingHeading
          const className = [
            'font-serif leading-tight text-current',
            headingLevel === 1 && 'border-b border-current/20 pb-2 text-2xl',
            headingLevel === 2 && 'pt-3 text-xl',
            headingLevel === 3 && 'pt-2 text-lg',
            headingLevel === 4 && 'pt-2 text-base font-semibold',
            headingLevel === 5 && 'pt-1 text-sm font-semibold uppercase tracking-[0.08em]',
            headingLevel >= 6 && 'pt-1 text-xs font-semibold uppercase tracking-[0.12em]',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <Heading
              key={index}
              className={className}
              data-reading-heading-level={headingLevel}
              data-reading-source-heading-level={block.level}
            >
              {block.text}
            </Heading>
          )
        }
        if (block.kind === 'code') {
          return (
            <div
              key={index}
              className="max-w-full overflow-x-auto"
              role="region"
              aria-label={block.language ? `${block.language} code block` : 'Code block'}
              tabIndex={0}
            >
              <pre className="w-full max-w-full whitespace-pre-wrap break-all border border-reading-rule/30 bg-void/90 p-3 font-mono text-xs leading-relaxed text-parchment">
                <code data-language={block.language ?? undefined}>{block.text}</code>
              </pre>
            </div>
          )
        }
        if (block.kind === 'list') {
          const List = block.ordered ? 'ol' : 'ul'
          return (
            <List key={index} className={`space-y-1 pl-5 ${block.ordered ? 'list-decimal' : 'list-disc'}`}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{item}</li>
              ))}
            </List>
          )
        }
        return <p key={index}>{block.text}</p>
      })}
    </div>
  )
}
