import type { ReadingQuestionsElement } from '../../../lib/readings'
import { ElementFrame } from './ElementFrame'

export function ReadingQuestions({ element }: { element: ReadingQuestionsElement }) {
  return (
    <ElementFrame element={element}>
      <ol className="space-y-3">
        {element.questions.map((question, index) => (
          <li key={`${index}-${question.slice(0, 24)}`} className="flex gap-3 border-t border-gold/10 pt-3 first:border-0 first:pt-0">
            <span className="font-mono text-[9px] tabular-nums text-gold/60">{String(index + 1).padStart(2, '0')}</span>
            <p className="text-pretty text-sm leading-relaxed text-parchment/85">{question}</p>
          </li>
        ))}
      </ol>
    </ElementFrame>
  )
}
