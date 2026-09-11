import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { protectedAppHref } from '../config/landing'
import { Shell } from './Shell'
import { EnterPage } from './pages/EnterPage'
import { HomePage } from './pages/HomePage'
import { InstrumentPage } from './pages/InstrumentPage'
import { LensesPage } from './pages/LensesPage'
import { PrinciplesPage } from './pages/PrinciplesPage'

export interface LandingPageProps {
  protectedAppOrigin?: string
  development?: boolean
}

const HASH_ROOMS: Record<string, string> = {
  '#instrument': '/instrument',
  '#lenses': '/lenses',
  '#principles': '/principles',
  '#invitation': '/enter',
}

function HashRoomRedirect() {
  const { hash, pathname } = useLocation()
  if (pathname !== '/') return null
  const next = HASH_ROOMS[hash]
  return next ? <Navigate to={next} replace /> : null
}

export function LandingPage({
  protectedAppOrigin = import.meta.env.VITE_PROTECTED_APP_ORIGIN,
  development = import.meta.env.DEV,
}: LandingPageProps) {
  const appHref = protectedAppHref(protectedAppOrigin, { development })

  return (
    <Shell appHref={appHref}>
      <HashRoomRedirect />
      <Routes>
        <Route path="/" element={<HomePage appHref={appHref} />} />
        <Route path="/instrument" element={<InstrumentPage />} />
        <Route path="/lenses" element={<LensesPage />} />
        <Route path="/principles" element={<PrinciplesPage appHref={appHref} />} />
        <Route path="/enter" element={<EnterPage appHref={appHref} />} />
      </Routes>
    </Shell>
  )
}
