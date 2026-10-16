/**
 * Host interface admission for the real service.
 *
 * These fixtures exercise the same initialization path the Host runs:
 * a malformed core interface must be reported with the exact missing member,
 * an absent required service must leave the service unavailable (Cordis
 * postpones initialization for `static inject`, and the Loader reports that
 * pending entry) instead of faking a snapshot, and a missing optional
 * live-session index must not reduce the statistics.
 *
 * A fixture is not Host evidence. Real Loader and service behaviour for a
 * concrete runtime is produced by `scripts/verify-profile.mjs`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Storage from '@deepseek-ai/dsh-storage'
import { DomainFacility } from '@deepseek-ai/dsh-storage-domain'
import type { SessionEvent, SessionHeader, SessionId } from '@deepseek-ai/dsh-session/types'
import { SessionSeq, type Session } from '@deepseek-ai/dsh-session'
import { SessionPersistenceRevision } from '@deepseek-ai/dsh-session-persistence'
import { MemoryMediaPool, MemoryStorageBackend } from './helpers/memory-backend.ts'
import UsageStatistics from '../../src/index.ts'
import { requireHostCapability, SESSION_PERSISTENCE_CAPABILITY, STORAGE_DOMAIN_CAPABILITY } from '../../src/capabilities.ts'

/** Frozen instant for every calendar and hourly assertion in this file. */
const FROZEN_NOW = Date.parse('2026-10-13T12:00:00.000Z')
/** Session lifecycle start, four hours before the frozen instant, same UTC day. */
const SESSION_CREATED_AT = Date.parse('2026-10-13T08:00:00.000Z')
/** Provider buckets of the single synthetic sample: 1000 + 2000 + 7000 + 0. */
const TOTAL_TOKENS = 10_000

const contexts: Context[] = []

beforeEach(() => {
  // Only `Date` is faked: real timers keep the Host's bounded refresh deadline working.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(FROZEN_NOW)
})

afterEach(async () => {
  vi.useRealTimers()
  await Promise.all(contexts.splice(0).map(ctx => ctx.fiber.dispose()))
})

/** One synthetic durable session with a single measured assistant sample. */
function sessionLog(id: string): { header: SessionHeader; revision: string; events: SessionEvent[] } {
  const header: SessionHeader = { version: 4, id: id as SessionId, createdAt: SESSION_CREATED_AT, isSeeded: false }
  const events = [
    { seq: SessionSeq(0), time: SESSION_CREATED_AT, type: 'turn/start', data: { turn: 1 } },
    {
      seq: SessionSeq(1),
      time: SESSION_CREATED_AT + 1_000,
      type: 'user/message',
      surfaceOp: 'append',
      data: { id: 'capability-user', role: 'user', source: { kind: 'user' }, content: [] },
    },
    {
      seq: SessionSeq(2),
      time: SESSION_CREATED_AT + 2_000,
      type: 'assistant/message',
      surfaceOp: 'append',
      data: {
        turn: 1,
        step: 1,
        stream: [],
        usage: { inputTokens: 1_000, outputTokens: 2_000, cacheReadTokens: 7_000, cacheWriteTokens: 0 },
        message: {
          id: 'capability-assistant',
          role: 'assistant',
          source: { kind: 'model', provider: 'synthetic', model: 'synthetic-model' },
          content: [],
        },
      },
    },
    { seq: SessionSeq(3), time: SESSION_CREATED_AT + 3_000, type: 'turn/end', data: { turn: 1, reason: { kind: 'completed' } } },
  ] as unknown as SessionEvent[]
  return { header, revision: 'r1', events }
}

/** A well-formed read-only persistence double over the synthetic logs. */
function persistenceDouble(logs: Map<string, ReturnType<typeof sessionLog>>) {
  return {
    list: vi.fn(async () => [...logs.values()].map(log => ({
      header: structuredClone(log.header),
      revision: SessionPersistenceRevision(log.revision),
    }))),
    stat: vi.fn(async (id: SessionId) => {
      const log = logs.get(String(id))
      return log === undefined ? undefined : { header: log.header, revision: SessionPersistenceRevision(log.revision) }
    }),
    open: vi.fn(async (id: SessionId) => {
      const log = logs.get(String(id))
      if (log === undefined) throw new Error(`missing ${id}`)
      return {
        header: structuredClone(log.header),
        inheritedEventCount: 0,
        read: async () => ({ events: structuredClone(log.events), eventState: 'detached' }),
        close: vi.fn(async () => {}),
      }
    }),
  }
}

/** The same double with `stat` removed entirely. */
function withoutStat(complete: ReturnType<typeof persistenceDouble>) {
  const malformed: Record<string, unknown> = { ...complete }
  delete malformed.stat
  return malformed
}

/** One synthetic log map keyed by session id. */
function logsFor(ids: string[] = ['capability-session']) {
  return new Map(ids.map(id => [id, sessionLog(id)]))
}

/**
 * Build a Context with an in-memory cache backend and only the services the test
 * asks for, so a service that is expected to be absent is really absent.
 * @param provided - Which Host services to register.
 * @returns The Context, the storage facility and the synthetic logs by session id.
 */
async function hostLike(provided: {
  storageDomain?: 'absent' | 'malformed' | 'facility'
  sessionPersistence?: 'absent' | Record<string, unknown>
  sessions?: unknown
} = {}) {
  const pool = new MemoryMediaPool()
  const ctx = new Context()
  contexts.push(ctx)
  await ctx.plugin(Storage)
  ctx.storage.backend.register('memory', new MemoryStorageBackend(pool))
  const facility = new DomainFacility(ctx, { backend: 'memory', routes: {} })
  ctx.storage.mount('domain', facility)
  if (provided.storageDomain !== 'absent') {
    ctx.provide('storageDomain', (provided.storageDomain === 'malformed' ? { open: 'not-a-function' } : facility) as never)
  }
  if (provided.sessionPersistence !== undefined && provided.sessionPersistence !== 'absent') {
    ctx.provide('sessionPersistence', provided.sessionPersistence as never)
  }
  if (provided.sessions !== undefined) ctx.provide('sessions', provided.sessions as never)
  return { ctx, pool, facility }
}

/**
 * Mount the real service plugin on one prepared Context.
 * @param ctx - Context carrying the Host services under test.
 * @returns The mounted service (when the plugin became active) or the mount failure.
 */
async function mount(ctx: Context): Promise<{ service?: UsageStatistics; error?: Error }> {
  try {
    await ctx.plugin(UsageStatistics, { timeZone: 'UTC' })
  } catch (error) {
    return { error: error as Error }
  }
  return { service: ctx.get('usageStatistics') as UsageStatistics | undefined }
}

/**
 * Yield to the event loop until a condition holds.
 * @param condition - Predicate evaluated after each yield.
 * @param attempts - Bounded number of event-loop turns.
 * @returns Whether the condition became true.
 */
async function settle(condition: () => boolean, attempts = 50) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (condition()) return true
    await new Promise(resolveTurn => setTimeout(resolveTurn, 0))
  }
  return condition()
}

describe('host capability admission', () => {
  it('reports the exact missing sessionPersistence member through real service initialization', async () => {
    const logs = logsFor()
    const { ctx } = await hostLike({
      storageDomain: 'facility',
      sessionPersistence: withoutStat(persistenceDouble(logs)),
    })
    const { error, service } = await mount(ctx)
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toContain('sessionPersistence')
    expect((error as Error).message).toContain('stat')
    expect(service).toBeUndefined()
  })

  it('reports a non-callable sessionPersistence member instead of failing later in a read', async () => {
    const logs = logsFor()
    const { ctx } = await hostLike({
      storageDomain: 'facility',
      sessionPersistence: { ...persistenceDouble(logs), stat: 'not-a-function' },
    })
    const { error } = await mount(ctx)
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toContain('missing required member(s): stat')
  })

  it('reports a malformed storageDomain interface by its missing member', async () => {
    const logs = logsFor()
    const { ctx } = await hostLike({
      storageDomain: 'malformed',
      sessionPersistence: persistenceDouble(logs),
    })
    const { error } = await mount(ctx)
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toContain('storageDomain service is missing required member(s): open')
  })

  it('keeps full statistics when only the optional live-session index is absent', async () => {
    const logs = logsFor()
    const { ctx } = await hostLike({ storageDomain: 'facility', sessionPersistence: persistenceDouble(logs) })
    const { service, error } = await mount(ctx)
    expect(error).toBeUndefined()
    expect(ctx.get('sessions')).toBeUndefined()
    const snapshot = await (service as UsageStatistics).snapshot()
    expect(snapshot.sessionCount).toBe(1)
    expect(snapshot.omittedSessions).toBe(0)
    expect(snapshot.summary.totalTokens).toBe(TOTAL_TOKENS)
    // Documented cache-hit semantics: cacheRead / (uncachedInput + cacheRead + cacheWrite).
    expect(snapshot.insights.cacheHitRate).toBe(0.875)
    expect(snapshot.hourly.date).toBe('2026-10-13')
    expect(snapshot.hourly.tokens).toHaveLength(24)
    expect(snapshot.hourly.tokens[8]).toBe(TOTAL_TOKENS)
    expect(snapshot.hourly.tokens.reduce((total, value) => total + value, 0)).toBe(TOTAL_TOKENS)
  })

  it('uses the optional live-session index when the Host provides it', async () => {
    const logs = logsFor(['capability-live'])
    const live = new Map([['capability-live', { id: 'capability-live' } as Session]])
    const { ctx } = await hostLike({
      storageDomain: 'facility',
      sessionPersistence: persistenceDouble(logs),
      sessions: { get: (id: SessionId) => live.get(String(id)) },
    })
    const { service } = await mount(ctx)
    const snapshot = await (service as UsageStatistics).snapshot()
    expect(snapshot.sessionCount).toBe(1)
    expect(snapshot.summary.totalTokens).toBe(TOTAL_TOKENS)
    expect(logs.size).toBe(1)
  })

  it('keeps the service unavailable while a required service is absent', async () => {
    // `static inject` makes Cordis postpone initialization until the dependency
    // arrives; the Loader's own inventory reports that pending entry. The plugin
    // must not fake a snapshot, and dropping the requirement is not acceptable.
    const logs = logsFor()
    const { ctx, facility } = await hostLike({ storageDomain: 'absent', sessionPersistence: persistenceDouble(logs) })
    const { error, service } = await mount(ctx)
    expect(error).toBeUndefined()
    expect(service).toBeUndefined()
    expect(ctx.get('usageStatistics')).toBeUndefined()
    // Proof that the plugin is waiting rather than broken: the same mount becomes
    // active as soon as the missing service appears.
    ctx.provide('storageDomain', facility as never)
    expect(await settle(() => ctx.get('usageStatistics') !== undefined)).toBe(true)
  })

  it('keeps the service unavailable while sessionPersistence itself is absent', async () => {
    const logs = logsFor()
    const { ctx } = await hostLike({ storageDomain: 'facility', sessionPersistence: 'absent' })
    const { error, service } = await mount(ctx)
    expect(error).toBeUndefined()
    expect(service).toBeUndefined()
    ctx.provide('sessionPersistence', persistenceDouble(logs) as never)
    expect(await settle(() => ctx.get('usageStatistics') !== undefined)).toBe(true)
  })
})

describe('capability descriptors', () => {
  it('admits a complete interface and rejects an incomplete or absent one', () => {
    const logs = logsFor(['descriptor'])
    const persistence = persistenceDouble(logs)
    const ctx = {
      get: (name: string) => name === 'sessionPersistence' ? persistence : undefined,
    }
    expect(requireHostCapability(ctx, SESSION_PERSISTENCE_CAPABILITY)).toBe(persistence)
    expect(() => requireHostCapability(ctx, STORAGE_DOMAIN_CAPABILITY))
      .toThrow('the Host does not provide the required storageDomain service')
    expect(() => requireHostCapability({ get: () => ({ open: 'not-a-function' }) }, STORAGE_DOMAIN_CAPABILITY))
      .toThrow('missing required member(s): open')
    expect(() => requireHostCapability({ get: () => withoutStat(persistence) }, SESSION_PERSISTENCE_CAPABILITY))
      .toThrow('missing required member(s): stat')
  })
})
