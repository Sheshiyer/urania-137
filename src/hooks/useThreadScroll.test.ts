import { describe, expect, it } from 'vitest'
import {
  initialThreadFollowState,
  reduceThreadFollowState,
  threadIsNearLatest,
} from './useThreadScroll'

describe('threadIsNearLatest', () => {
  it('uses a bounded distance from the scroll end', () => {
    expect(threadIsNearLatest({ scrollHeight: 1_000, scrollTop: 700, clientHeight: 260 })).toBe(true)
    expect(threadIsNearLatest({ scrollHeight: 1_000, scrollTop: 500, clientHeight: 260 })).toBe(false)
  })
})

describe('thread follow state', () => {
  it('stops auto-following after manual upward movement and marks new content', () => {
    const paused = reduceThreadFollowState(initialThreadFollowState, {
      type: 'manual-scroll',
      nearLatest: false,
    })
    expect(paused).toEqual({ following: false, unread: false })

    expect(reduceThreadFollowState(paused, { type: 'content-appended' })).toEqual({
      following: false,
      unread: true,
    })
  })

  it('resumes only through Return to latest after following was paused', () => {
    const paused = { following: false, unread: true }
    expect(reduceThreadFollowState(paused, { type: 'content-appended' })).toEqual(paused)
    expect(reduceThreadFollowState(paused, { type: 'return-to-latest' })).toEqual({
      following: true,
      unread: false,
    })
    expect(
      reduceThreadFollowState(paused, {
        type: 'manual-scroll',
        nearLatest: true,
      }),
    ).toEqual(paused)
  })
})
