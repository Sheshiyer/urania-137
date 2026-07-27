import type { ViewerContextState } from '../hooks/useViewerContext'

export type ViewerLifecycle = 'unknown' | 'new' | 'returning'

export type SubjectLifecycleState =
  | { status: 'loading'; subjects: null; error: null }
  | { status: 'ready'; subjects: readonly { id: string; role: string }[]; error: null }
  | { status: 'degraded'; subjects: null; error: string }

export interface ExperienceState {
  status: 'loading' | 'ready' | 'degraded'
  lifecycle: ViewerLifecycle
  /**
   * Presentation capability only. It must never be used to authorize an API
   * action; every write remains server/actor scoped.
   */
  operator: boolean
  notice: string | null
}

export const INITIAL_SUBJECT_LIFECYCLE: SubjectLifecycleState = {
  status: 'loading',
  subjects: null,
  error: null,
}

export const INITIAL_EXPERIENCE: ExperienceState = {
  status: 'loading',
  lifecycle: 'unknown',
  operator: false,
  notice: null,
}

/** Compose two independent facts: profile lifecycle and presentation capability. */
export function deriveExperience(
  viewer: ViewerContextState,
  subjectState: SubjectLifecycleState,
): ExperienceState {
  const lifecycle: ViewerLifecycle =
    subjectState.status === 'ready'
      ? subjectState.subjects.some((subject) => subject.role === 'self')
        ? 'returning'
        : 'new'
      : 'unknown'
  const operator =
    viewer.status === 'ready' ? viewer.context.capabilities.operator : false

  if (viewer.status === 'degraded' || subjectState.status === 'degraded') {
    return {
      status: 'degraded',
      lifecycle,
      operator,
      notice:
        subjectState.status === 'degraded'
          ? subjectState.error
          : viewer.status === 'degraded'
            ? viewer.error
            : null,
    }
  }

  if (viewer.status === 'loading' || subjectState.status === 'loading') {
    return {
      status: 'loading',
      lifecycle,
      operator,
      notice: null,
    }
  }

  return {
    status: 'ready',
    lifecycle,
    operator,
    notice: null,
  }
}
