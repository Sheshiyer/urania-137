import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { BirthData } from '../../types'
import { useDailyReading } from '../../hooks/useDailyReading'
import { todayInTz } from '../../lib/daily/location'
import { DailyLocation } from '../../lib/daily/source'
import { BirthDataForm } from '../forms/BirthDataForm'
import { DailyReadingBody } from './daily/DailyReadingBody'
import { LocationDateHeader } from './daily/LocationDateHeader'
import { LocationPicker } from './daily/LocationPicker'

/**
 * The daily panchanga reading surface (T-050, T-054, T-055) — mounts in the Modal
 * from the Sky Weather "Today" child. Universal base always; the personal overlay
 * appends when birth data is present. No birth data → a complete base reading plus
 * an "add your birth moment" invitation (never an error/empty state).
 */
export function DailyReadingPanel() {
  const [birth, setBirth] = useState<BirthData | null>(null)
  const [picking, setPicking] = useState(false)
  const [addingBirth, setAddingBirth] = useState(false)
  const daily = useDailyReading(birth)

  const pick = (loc: DailyLocation) => {
    setPicking(false)
    daily.changeLocation(loc)
  }
  const date = daily.reading?.meta.date ?? todayInTz(daily.location.timezone)
  const needsBirth = !!daily.reading && !daily.reading.meta.hasOverlay

  return (
    <div className="space-y-4">
      <LocationDateHeader location={daily.location} date={date} source={daily.locationSource} onToggleChange={() => setPicking((v) => !v)} />
      {picking && <LocationPicker onPick={pick} />}

      {daily.status === 'loading' && !daily.reading && <p className="animate-pulse py-6 text-center text-sm text-silver">Reading the sky…</p>}
      {daily.status === 'error' && (
        <div className="space-y-2 rounded-lg border border-terracotta/20 bg-terracotta/10 p-3 text-sm text-terracotta">
          <p>{daily.error}</p>
          <button type="button" onClick={() => void daily.run(daily.location)} className="rounded-full border border-terracotta/30 px-3 py-1 text-xs transition-colors hover:bg-terracotta/10">
            Retry
          </button>
        </div>
      )}

      {daily.reading && <DailyReadingBody reading={daily.reading} />}

      {needsBirth && !addingBirth && (
        <button
          type="button"
          onClick={() => setAddingBirth(true)}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-gold/25 bg-gold/5 py-3 text-sm text-gold transition-colors hover:bg-gold/10"
        >
          <Sparkles className="h-4 w-4" /> Add your birth moment to see how today meets your pattern
        </button>
      )}
      {needsBirth && addingBirth && (
        <div className="rounded-xl border border-gold/15 p-4">
          <BirthDataForm actionLabel="Reveal today's overlay" onSubmit={(b) => { setBirth(b); setAddingBirth(false) }} busy={daily.status === 'loading'} />
        </div>
      )}
    </div>
  )
}
