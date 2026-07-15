import { ScrollJourney } from './components/motion/ScrollJourney'

/**
 * Urania 137 is a single scroll-driven journey: the galactic overview, then a
 * dive into each node's cluster in turn (clicks jump the journey, the URL syncs
 * to #/node/:id). The whole experience lives in ScrollJourney.
 */
export default function App() {
  return <ScrollJourney />
}
