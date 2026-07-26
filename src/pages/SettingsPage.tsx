import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CircleOff,
  Clock3,
  Copy,
  Eye,
  Link2,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react'
import type { User } from '../lib/api/contract'
import {
  acceptRelationshipInvitation,
  createRelationshipInvitation,
  declineRelationshipInvitation,
  listRelationships,
  revokeRelationship,
  type Relationship,
  type RelationshipStatus,
} from '../lib/relationshipsApi'
import { deleteSubject, listSubjects } from '../lib/subjectsApi'
import {
  relationshipPeerLabel,
  relationshipStatusPresentation,
  splitSubjects,
} from '../lib/settingsView'
import type { SubjectProfile } from '../types/chat'
import { PageFrame } from '../components/layout/PageFrame'
import { PatternSection } from '../components/chrome/PatternSection'
import { navigate } from '../hooks/useHashRoute'

type LoadState = 'loading' | 'ready' | 'error'

const STATUS_STYLE: Record<RelationshipStatus, string> = {
  pending: 'border-gold/45 bg-gold/10 text-gold',
  active: 'border-emerald/45 bg-emerald/10 text-emerald',
  declined: 'border-terracotta/45 bg-terracotta/10 text-evidence-copy-unresolved',
  revoked: 'border-evidence-unresolved/45 bg-evidence-unresolved/10 text-evidence-copy-unresolved',
  expired: 'border-silver/30 bg-silver/5 text-silver',
}

function StatusMark({ status }: { status: RelationshipStatus }) {
  const copy = relationshipStatusPresentation(status)
  const Icon =
    status === 'active'
      ? Check
      : status === 'pending'
        ? Clock3
        : status === 'declined'
          ? X
          : status === 'revoked'
            ? CircleOff
            : Clock3
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-display text-xs uppercase tracking-[0.16em] ${STATUS_STYLE[status]}`}
      title={copy.description}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {copy.label}
    </span>
  )
}

function SettingsConstellation({
  self,
  circleCount,
  relationships,
}: {
  self: SubjectProfile | null
  circleCount: number
  relationships: readonly Relationship[]
}) {
  const active = relationships.filter((relationship) => relationship.status === 'active').length
  return (
    <div className="console-card relative min-h-64 overflow-hidden" aria-label="Your settings constellation">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 720 260" aria-hidden="true">
        <circle cx="360" cy="130" r="62" fill="none" className="stroke-gold/20" />
        <circle cx="360" cy="130" r="105" fill="none" className="stroke-gold/10" strokeDasharray="3 8" />
        <line x1="360" y1="130" x2="180" y2="70" className="stroke-gold/25" />
        <line x1="360" y1="130" x2="540" y2="70" className="stroke-gold/25" />
        <line x1="360" y1="130" x2="360" y2="232" className="stroke-gold/25" />
      </svg>
      <div className="absolute left-1/2 top-1/2 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-gold/40 bg-void/95 text-center shadow-[0_0_50px_rgba(197,160,23,0.13)]">
        <UserRound className="h-5 w-5 text-gold" aria-hidden="true" />
        <span className="mt-2 max-w-20 truncate font-serif text-xs uppercase tracking-[0.14em] text-parchment">
          {self?.name ?? 'Your pattern'}
        </span>
      </div>
      <div className="absolute left-[25%] top-[27%] -translate-x-1/2 rounded-sm border border-gold/25 bg-void/90 px-3 py-2 text-center">
        <UsersRound className="mx-auto h-4 w-4 text-silver" aria-hidden="true" />
        <span className="mt-1 block font-mono text-xs text-parchment">{circleCount} circle</span>
      </div>
      <div className="absolute left-[75%] top-[27%] -translate-x-1/2 rounded-sm border border-emerald/25 bg-void/90 px-3 py-2 text-center">
        <Link2 className="mx-auto h-4 w-4 text-emerald" aria-hidden="true" />
        <span className="mt-1 block font-mono text-xs text-parchment">{active} active</span>
      </div>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-sm border border-gold/20 bg-void/90 px-3 py-2 text-center">
        <Eye className="mx-auto h-4 w-4 text-gold" aria-hidden="true" />
        <span className="mt-1 block font-mono text-xs text-parchment">owner-only readings</span>
      </div>
    </div>
  )
}

export function SettingsPage({ me }: { me: User | null }) {
  const [subjects, setSubjects] = useState<SubjectProfile[]>([])
  const [subjectState, setSubjectState] = useState<LoadState>('loading')
  const [subjectError, setSubjectError] = useState<string | null>(null)
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [relationshipState, setRelationshipState] = useState<LoadState>('loading')
  const [relationshipError, setRelationshipError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [inviteeEmail, setInviteeEmail] = useState('')
  const [inviteSubjectId, setInviteSubjectId] = useState('')
  const [invitationToken, setInvitationToken] = useState<string | null>(null)
  const [consumeToken, setConsumeToken] = useState('')
  const [consumeSubjectId, setConsumeSubjectId] = useState('')

  const loadSubjects = useCallback(async () => {
    setSubjectState('loading')
    setSubjectError(null)
    try {
      const next = await listSubjects()
      setSubjects(next)
      setSubjectState('ready')
    } catch (error) {
      setSubjectState('error')
      setSubjectError(error instanceof Error ? error.message : 'Your subjects could not be read.')
    }
  }, [])

  const loadRelationships = useCallback(async () => {
    setRelationshipState('loading')
    setRelationshipError(null)
    try {
      setRelationships(await listRelationships())
      setRelationshipState('ready')
    } catch (error) {
      setRelationshipState('error')
      setRelationshipError(
        error instanceof Error
          ? error.message
          : 'Shared relationships are not available yet.',
      )
    }
  }, [])

  useEffect(() => {
    void loadSubjects()
    void loadRelationships()
  }, [loadRelationships, loadSubjects])

  const { self, circle } = useMemo(() => splitSubjects(subjects), [subjects])
  const subjectOptions = subjects
  useEffect(() => {
    const defaultId = self?.id ?? subjectOptions[0]?.id ?? ''
    if (!inviteSubjectId) setInviteSubjectId(defaultId)
    if (!consumeSubjectId) setConsumeSubjectId(defaultId)
  }, [consumeSubjectId, inviteSubjectId, self?.id, subjectOptions])

  const runAction = async (key: string, action: () => Promise<unknown>) => {
    setBusy(key)
    setActionError(null)
    try {
      await action()
      await loadRelationships()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Consent state did not change.')
    } finally {
      setBusy(null)
    }
  }

  const createInvite = (event: FormEvent) => {
    event.preventDefault()
    if (!inviteSubjectId || !inviteeEmail.trim()) return
    void runAction('create', async () => {
      const created = await createRelationshipInvitation({
        subjectId: inviteSubjectId,
        inviteeEmail: inviteeEmail.trim(),
      })
      setInvitationToken(created.inviteToken)
      setInviteeEmail('')
    })
  }

  const acceptInvite = () => {
    if (!consumeToken.trim() || !consumeSubjectId) return
    void runAction('accept', async () => {
      await acceptRelationshipInvitation(consumeToken.trim(), consumeSubjectId)
      setConsumeToken('')
    })
  }

  const declineInvite = () => {
    if (!consumeToken.trim()) return
    void runAction('decline', async () => {
      await declineRelationshipInvitation(consumeToken.trim())
      setConsumeToken('')
    })
  }

  const removeCircleSubject = (subject: SubjectProfile) => {
    if (!window.confirm(`Remove ${subject.name} from your circle? Existing readings remain in your Folio.`)) return
    setBusy(`subject:${subject.id}`)
    setSubjectError(null)
    void deleteSubject(subject.id)
      .then(() => loadSubjects())
      .catch((error: unknown) => {
        setSubjectError(error instanceof Error ? error.message : 'The circle member could not be removed.')
      })
      .finally(() => setBusy(null))
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-void">
      <PageFrame />
      <main id="main-content" className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-24 pt-24 sm:px-10 lg:px-14">
        <header className="grid gap-8 border-b border-gold/15 pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="console-eyebrow">Identity · circle · consent · visibility</p>
            <h1 className="mt-3 font-display text-3xl font-light tracking-[0.12em] text-parchment sm:text-5xl">Settings</h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-secondary">
              Your account owns access. Subjects name who a reading concerns. Shared relationships require both people to choose their own subject.
            </p>
          </div>
          <a href="#/" className="btn-ghost cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">
            Return to map
          </a>
        </header>

        <div className="mt-7">
          <SettingsConstellation self={self} circleCount={circle.length} relationships={relationships} />
        </div>

        <div className="mt-7 grid gap-7 lg:grid-cols-2">
          <section className="space-y-4" aria-labelledby="identity-settings-title">
            <div>
              <p className="console-eyebrow">The owner and their field</p>
              <h2 id="identity-settings-title" className="mt-1 font-serif text-lg uppercase tracking-[0.14em] text-parchment">
                Profile & circle
              </h2>
            </div>

            <PatternSection onClose={() => undefined} />

            <div className="console-card p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="console-eyebrow">Circle subjects</p>
                  <p className="mt-2 text-xs leading-relaxed text-secondary">
                    Circle members are personally held profiles, added only after “hold for next time” in chat.
                  </p>
                </div>
                <UsersRound className="h-5 w-5 shrink-0 text-gold" aria-hidden="true" />
              </div>

              {subjectState === 'loading' ? (
                <p className="mt-4 flex items-center gap-2 text-xs text-silver">
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  Reading your circle…
                </p>
              ) : circle.length === 0 ? (
                <p className="mt-4 border-l border-gold/25 pl-3 text-xs leading-relaxed text-secondary">
                  No circle subjects yet. Begin a reading in chat and explicitly choose to hold a completed subject.
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-gold/10 border-y border-gold/10">
                  {circle.map((subject) => (
                    <li key={subject.id} className="flex items-center gap-3 py-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gold/25 bg-gold/5 text-gold">
                        <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-serif text-sm text-parchment">{subject.name}</p>
                        <p className="mt-0.5 font-display text-xs uppercase tracking-[0.16em] text-metadata">
                          {subject.role} · {subject.birth_location_query}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCircleSubject(subject)}
                        disabled={busy === `subject:${subject.id}`}
                        className="cursor-pointer rounded-full border border-terracotta/25 p-2 text-silver transition-colors hover:border-terracotta/60 hover:text-evidence-copy-unresolved focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta disabled:cursor-wait disabled:opacity-50"
                        aria-label={`Remove ${subject.name} from your circle`}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {subjectError && (
                <p className="mt-3 flex items-center gap-2 text-xs text-evidence-copy-unresolved">
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                  {subjectError}
                </p>
              )}
            </div>

            <div className="console-card p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden="true" />
                <div>
                  <p className="console-eyebrow">Reading visibility</p>
                  <h3 className="mt-2 font-serif text-sm uppercase tracking-[0.14em] text-parchment">Owner only by default</h3>
                  <p className="mt-2 text-xs leading-relaxed text-secondary">
                    Folio records are scoped to {me?.email ?? 'the signed-in account'}. There is no public link. Active relationship consent authorizes shared generation; it does not expose either person’s complete archive.
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <div className="border border-emerald/25 bg-emerald/5 p-3">
                  <p className="font-display text-xs uppercase tracking-[0.16em] text-emerald">Current</p>
                  <p className="mt-1 text-xs text-parchment">Owner-scoped Folio</p>
                </div>
                <div className="border border-gold/20 bg-gold/5 p-3">
                  <p className="font-display text-xs uppercase tracking-[0.16em] text-gold">Shared readings</p>
                  <p className="mt-1 text-xs text-parchment">Active consent only</p>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4" aria-labelledby="relationship-settings-title">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="console-eyebrow">Two people · two owned subjects</p>
                <h2 id="relationship-settings-title" className="mt-1 font-serif text-lg uppercase tracking-[0.14em] text-parchment">
                  Shared relationships
                </h2>
              </div>
              <button
                type="button"
                onClick={() => void loadRelationships()}
                disabled={relationshipState === 'loading'}
                className="cursor-pointer rounded-full border border-gold/25 p-2 text-silver transition-colors hover:border-gold/60 hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:cursor-wait disabled:opacity-50"
                aria-label="Refresh shared relationships"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${relationshipState === 'loading' ? 'animate-spin motion-reduce:animate-none' : ''}`} aria-hidden="true" />
              </button>
            </div>

            {relationshipError && (
              <div className="border border-gold/25 bg-gold/5 p-4">
                <p className="flex items-center gap-2 text-sm text-parchment">
                  <ShieldCheck className="h-4 w-4 text-gold" aria-hidden="true" />
                  Consent service not yet available
                </p>
                <p className="mt-2 text-xs leading-relaxed text-secondary">{relationshipError}</p>
                <p className="mt-2 text-xs text-metadata">
                  Your existing same-owner Union Mirror path remains unchanged.
                </p>
              </div>
            )}

            {relationships.length > 0 && (
              <ul className="space-y-3">
                {relationships.map((relationship) => {
                  const status = relationshipStatusPresentation(relationship.status)
                  const canRevoke = relationship.status === 'pending' || relationship.status === 'active'
                  return (
                    <li key={relationship.id} className="console-card p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-serif text-sm text-parchment">
                            {relationshipPeerLabel(relationship, me?.id ?? null)}
                          </p>
                          <p className="mt-1 font-mono text-xs text-metadata">{relationship.id}</p>
                        </div>
                        <StatusMark status={relationship.status} />
                      </div>
                      <p className="mt-3 border-l border-gold/20 pl-3 text-xs leading-relaxed text-secondary">{status.description}</p>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gold/10 pt-3">
                        <span className="text-xs text-metadata">
                          {relationship.participants.length} bound participant{relationship.participants.length === 1 ? '' : 's'}
                        </span>
                        <div className="flex items-center gap-3">
                          {relationship.status === 'active' && (
                            <button
                              type="button"
                              onClick={() => navigate('/node/compat')}
                              className="inline-flex cursor-pointer items-center gap-1.5 font-display text-xs uppercase tracking-[0.16em] text-emerald transition-colors duration-300 hover:text-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald"
                            >
                              Enter Union Mirror
                              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          )}
                          {canRevoke && (
                            <button
                              type="button"
                              disabled={busy === `revoke:${relationship.id}`}
                              onClick={() => {
                                if (!window.confirm('Revoke future shared generation for this relationship?')) return
                                void runAction(`revoke:${relationship.id}`, () => revokeRelationship(relationship.id))
                              }}
                              className="cursor-pointer font-display text-xs uppercase tracking-[0.16em] text-secondary transition-colors duration-300 hover:text-evidence-copy-unresolved focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta disabled:cursor-wait disabled:opacity-50"
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}

            <form onSubmit={createInvite} className="console-card p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <Link2 className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden="true" />
                <div>
                  <p className="console-eyebrow">Invite someone</p>
                  <p className="mt-2 text-xs leading-relaxed text-secondary">
                    You choose only your subject. The invited person must sign in with the intended email and choose theirs.
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-3">
                <label>
                  <span className="font-display text-xs uppercase tracking-[0.18em] text-metadata">Your subject</span>
                  <select
                    value={inviteSubjectId}
                    onChange={(event) => setInviteSubjectId(event.target.value)}
                    className="mt-1.5 w-full border border-gold/20 bg-void px-3 py-2 text-sm text-parchment focus:border-gold/60 focus:outline-none"
                  >
                    {subjectOptions.map((subject) => (
                      <option key={subject.id} value={subject.id}>{subject.name} · {subject.role}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="font-display text-xs uppercase tracking-[0.18em] text-metadata">Invitee email</span>
                  <input
                    type="email"
                    value={inviteeEmail}
                    onChange={(event) => setInviteeEmail(event.target.value)}
                    className="mt-1.5 w-full border border-gold/20 bg-void px-3 py-2 text-sm text-parchment placeholder:text-silver/40 focus:border-gold/60 focus:outline-none"
                    placeholder="person@example.com"
                    required
                  />
                </label>
                <button type="submit" disabled={busy === 'create' || !inviteSubjectId} className="btn-primary cursor-pointer justify-self-start">
                  {busy === 'create' ? 'Creating…' : 'Create private invite'}
                </button>
              </div>

              {invitationToken && (
                <div className="mt-4 border border-emerald/30 bg-emerald/5 p-3" role="status">
                  <p className="font-display text-xs uppercase tracking-[0.18em] text-emerald">Shown once</p>
                  <p className="mt-2 break-all font-mono text-xs text-parchment">{invitationToken}</p>
                  <button
                    type="button"
                    onClick={() => void navigator.clipboard.writeText(invitationToken)}
                    className="mt-3 inline-flex cursor-pointer items-center gap-1.5 font-display text-xs uppercase tracking-[0.16em] text-secondary transition-colors duration-300 hover:text-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald"
                  >
                    <Copy className="h-3 w-3" aria-hidden="true" />
                    Copy private token
                  </button>
                </div>
              )}
            </form>

            <div className="console-card p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald" aria-hidden="true" />
                <div>
                  <p className="console-eyebrow">Respond to an invite</p>
                  <p className="mt-2 text-xs leading-relaxed text-secondary">
                    The token proves possession; your authenticated email and chosen subject are still checked server-side.
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-3">
                <label>
                  <span className="font-display text-xs uppercase tracking-[0.18em] text-metadata">Private token</span>
                  <input
                    value={consumeToken}
                    onChange={(event) => setConsumeToken(event.target.value)}
                    className="mt-1.5 w-full border border-gold/20 bg-void px-3 py-2 font-mono text-xs text-parchment placeholder:text-silver/40 focus:border-gold/60 focus:outline-none"
                    placeholder="Paste the one-time token"
                  />
                </label>
                <label>
                  <span className="font-display text-xs uppercase tracking-[0.18em] text-metadata">Your subject</span>
                  <select
                    value={consumeSubjectId}
                    onChange={(event) => setConsumeSubjectId(event.target.value)}
                    className="mt-1.5 w-full border border-gold/20 bg-void px-3 py-2 text-sm text-parchment focus:border-gold/60 focus:outline-none"
                  >
                    {subjectOptions.map((subject) => (
                      <option key={subject.id} value={subject.id}>{subject.name} · {subject.role}</option>
                    ))}
                  </select>
                </label>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={!consumeToken.trim() || !consumeSubjectId || busy === 'accept'}
                    onClick={acceptInvite}
                    className="btn-secondary cursor-pointer"
                  >
                    {busy === 'accept' ? 'Accepting…' : 'Accept with this subject'}
                  </button>
                  <button
                    type="button"
                    disabled={!consumeToken.trim() || busy === 'decline'}
                    onClick={declineInvite}
                    className="btn-ghost cursor-pointer hover:border-terracotta/60 hover:text-evidence-copy-unresolved"
                  >
                    {busy === 'decline' ? 'Declining…' : 'Decline invite'}
                  </button>
                </div>
              </div>
            </div>

            {actionError && (
              <p className="flex items-center gap-2 border border-terracotta/30 bg-terracotta/10 px-4 py-3 text-xs text-evidence-copy-unresolved">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {actionError}
              </p>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
