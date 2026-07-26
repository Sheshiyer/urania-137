import { useCallback, useEffect, useRef, useState } from 'react'

export interface ThreadScrollPosition {
  scrollHeight: number
  scrollTop: number
  clientHeight: number
}

export interface ThreadFollowState {
  following: boolean
  unread: boolean
}

export type ThreadFollowEvent =
  | { type: 'manual-scroll'; nearLatest: boolean }
  | { type: 'content-appended' }
  | { type: 'return-to-latest' }

export const initialThreadFollowState: ThreadFollowState = {
  following: true,
  unread: false,
}

export function threadIsNearLatest(
  position: ThreadScrollPosition,
  threshold = 48,
): boolean {
  return (
    position.scrollHeight - position.scrollTop - position.clientHeight
    <= threshold
  )
}

export function reduceThreadFollowState(
  state: ThreadFollowState,
  event: ThreadFollowEvent,
): ThreadFollowState {
  if (event.type === 'return-to-latest') {
    return { following: true, unread: false }
  }
  if (event.type === 'manual-scroll') {
    if (!state.following) return state
    return event.nearLatest
      ? state
      : { following: false, unread: state.unread }
  }
  return state.following
    ? state
    : { following: false, unread: true }
}

export function useThreadScroll({
  revision,
  threshold = 48,
}: {
  revision: string | number
  threshold?: number
}) {
  const threadRef = useRef<HTMLDivElement | null>(null)
  const stateRef = useRef(initialThreadFollowState)
  const [state, setState] = useState(initialThreadFollowState)

  const commit = useCallback((event: ThreadFollowEvent) => {
    const next = reduceThreadFollowState(stateRef.current, event)
    stateRef.current = next
    setState(next)
    return next
  }, [])

  const scrollToLatest = useCallback(() => {
    const element = threadRef.current
    if (!element) return
    // Immediate following avoids a smooth-scroll event being mistaken for
    // manual upward movement. The reading transition provides its own
    // reduced-motion-safe visual beat.
    element.scrollTo({ top: element.scrollHeight, behavior: 'auto' })
  }, [])

  const onScroll = useCallback(() => {
    const element = threadRef.current
    if (!element) return
    commit({
      type: 'manual-scroll',
      nearLatest: threadIsNearLatest(element, threshold),
    })
  }, [commit, threshold])

  const returnToLatest = useCallback(() => {
    commit({ type: 'return-to-latest' })
    scrollToLatest()
  }, [commit, scrollToLatest])

  useEffect(() => {
    const next = commit({ type: 'content-appended' })
    if (next.following) scrollToLatest()
  }, [commit, revision, scrollToLatest])

  return {
    threadRef,
    following: state.following,
    unread: state.unread,
    onScroll,
    returnToLatest,
  }
}
