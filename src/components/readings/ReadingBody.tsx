import { parseReadingBody } from '../../lib/readings/markdown'

export function ReadingBody({ body }: { body: string }) {
  const blocks = parseReadingBody(body)
  return (
    <div className="space-y-4 text-sm leading-7 text-parchment/85">
      {blocks.map((block, index) => {
        if (block.kind === 'heading') {
          const className =
            block.level <= 1
              ? 'border-b border-gold/15 pb-2 font-serif text-lg uppercase tracking-[0.14em] text-parchment'
              : 'pt-2 font-serif text-sm uppercase tracking-[0.14em] text-gold'
          return (
            <h3 key={index} className={className}>
              {block.text}
            </h3>
          )
        }
        if (block.kind === 'code') {
          return (
            <pre key={index} className="overflow-auto border border-gold/10 bg-void/75 p-3 font-mono text-[11px] leading-relaxed text-parchment/80">
              <code data-language={block.language ?? undefined}>{block.text}</code>
            </pre>
          )
        }
        if (block.kind === 'list') {
          const List = block.ordered ? 'ol' : 'ul'
          return (
            <List key={index} className={`space-y-1 pl-5 ${block.ordered ? 'list-decimal' : 'list-disc marker:text-gold/60'}`}>
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
