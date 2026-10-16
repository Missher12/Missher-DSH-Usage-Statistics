import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Include from '@deepseek-ai/cordis-plugin-include'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import SessionStore, { SessionId } from '@deepseek-ai/dsh-session'
import JsonlSessionPersistence from '@deepseek-ai/dsh-session-persistence-jsonl'
import Storage from '@deepseek-ai/dsh-storage'
import * as StorageDomain from '@deepseek-ai/dsh-storage-domain'
import * as StorageJson from '@deepseek-ai/dsh-storage-json'
import { remoteMethods } from '@deepseek-ai/dsh-typert-protocol'
import { auditStartupEntries } from '@deepseek-ai/dsh-app-boot'
import UsageStatistics from '../../src/index.ts'

let root: string | undefined
const contexts: Context[] = []

afterEach(async () => {
  vi.useRealTimers()
  await Promise.all(contexts.splice(0).map(ctx => ctx.fiber.dispose()))
  if (root !== undefined) await rm(root, { recursive: true, force: true })
  root = undefined
})

async function loadComposition(configPath: string): Promise<Context> {
  const ctx = new Context()
  contexts.push(ctx)
  ctx.baseUrl = pathToFileURL(root as string).href + '/'
  await ctx.plugin(Loader)
  ctx.loader.builtins.include = Include
  const modules = new Map<string, unknown>([
    ['@deepseek-ai/dsh-session', SessionStore],
    ['@deepseek-ai/dsh-session-persistence-jsonl', JsonlSessionPersistence],
    ['@deepseek-ai/dsh-storage', Storage],
    ['@deepseek-ai/dsh-storage-json', StorageJson],
    ['@deepseek-ai/dsh-storage-domain', StorageDomain],
    ['@deepseek-ai/dsh-usage-insights', UsageStatistics],
  ])
  ctx.loader.internal = {
    version: 'v2',
    async import(specifier: string) {
      if (!modules.has(specifier)) throw new Error(`unexpected Loader import: ${specifier}`)
      return modules.get(specifier)
    },
  } as unknown as NonNullable<typeof ctx.loader.internal>
  await ctx.loader.create({
    name: 'cordis:include',
    config: { path: pathToFileURL(configPath).href },
  })
  await ctx.loader.await()
  expect([...ctx.loader.entries()]
    .filter(entry => entry.fiber === undefined && !entry.disabled)
    .map(entry => entry.options.name)).toEqual([])
  return ctx
}

describe('usage insights through a real Loader composition', () => {
  it('activates the Bundle when every required Host service is composed', async () => {
    root = await mkdtemp(join(tmpdir(), 'dsh-usage-insights-loader-'))
    const configPath = join(root, 'cordis.yml')
    await writeFile(configPath, [
      "- name: '@deepseek-ai/dsh-session'",
      "- name: '@deepseek-ai/dsh-session-persistence-jsonl'",
      '  config:',
      `    root: ${JSON.stringify(join(root, 'sessions'))}`,
      '    compression: none',
      "- name: '@deepseek-ai/dsh-storage'",
      "- name: '@deepseek-ai/dsh-storage-json'",
      '  config:',
      `    root: ${JSON.stringify(join(root, 'storage'))}`,
      "- name: '@deepseek-ai/dsh-storage-domain'",
      '  config:',
      '    backend: json',
      "- name: '@deepseek-ai/dsh-usage-insights'",
      '',
    ].join('\n'))

    const ctx = await loadComposition(configPath)
    expect(ctx.usageStatistics.typertRemote.namespace).toBe('usageStatistics')
  })

  it('reports the missing required service through the Loader instead of degrading silently', async () => {
    // `sessionPersistence` is deliberately absent from this composition: the
    // plugin must stay unavailable with the Host's own audit naming the missing
    // service, and must never publish a statistics service reporting zero usage.
    root = await mkdtemp(join(tmpdir(), 'dsh-usage-insights-loader-'))
    const configPath = join(root, 'cordis.yml')
    await writeFile(configPath, [
      "- name: '@deepseek-ai/dsh-storage'",
      "- name: '@deepseek-ai/dsh-storage-json'",
      '  config:',
      `    root: ${JSON.stringify(join(root, 'storage'))}`,
      "- name: '@deepseek-ai/dsh-storage-domain'",
      '  config:',
      '    backend: json',
      "- name: '@deepseek-ai/dsh-usage-insights'",
      '',
    ].join('\n'))

    const ctx = await loadComposition(configPath)
    // `auditStartupEntries` is the Host's real activation audit: it inspects each
    // Loader entry and reports pending entries with the services they wait for.
    const diagnostics: string[] = []
    await auditStartupEntries(ctx, 'loader-composition', line => { diagnostics.push(line) })
    const audit = diagnostics.join('\n')

    const entry = [...ctx.loader.entries()].find(candidate => candidate.options.name === '@deepseek-ai/dsh-usage-insights')
    expect(entry === undefined).toBe(false)
    // Scalar reads only: the Cordis fiber/context are proxies that a pretty-print
    // of a whole object would trip over ("cannot get property $$typeof without inject").
    const disabled = entry?.disabled === true
    expect(disabled).toBe(false)
    expect(ctx.get('usageStatistics') === undefined).toBe(true)
    expect(audit.includes('@deepseek-ai/dsh-usage-insights')).toBe(true)
    expect(audit.includes('pending (waiting for service: sessionPersistence)')).toBe(true)
  })

  it('folds a durable local session without any provider key', async () => {
    vi.setSystemTime(new Date('2026-08-18T12:00:00.000Z'))
    root = await mkdtemp(join(tmpdir(), 'dsh-usage-insights-loader-'))
    const configPath = join(root, 'cordis.yml')
    await writeFile(configPath, [
      "- name: '@deepseek-ai/dsh-session'",
      "- name: '@deepseek-ai/dsh-session-persistence-jsonl'",
      '  config:',
      `    root: ${JSON.stringify(join(root, 'sessions'))}`,
      '    compression: none',
      "- name: '@deepseek-ai/dsh-storage'",
      "- name: '@deepseek-ai/dsh-storage-json'",
      '  config:',
      `    root: ${JSON.stringify(join(root, 'storage'))}`,
      "- name: '@deepseek-ai/dsh-storage-domain'",
      '  config:',
      '    backend: json',
      "- name: '@deepseek-ai/dsh-usage-insights'",
      '  config:',
      '    timeZone: UTC',
      '',
    ].join('\n'))

    const ctx = await loadComposition(configPath)
    expect(ctx.usageStatistics.typertRemote.namespace).toBe('usageStatistics')
    expect(remoteMethods(ctx.usageStatistics)).toEqual([
      { method: 'snapshot', invocation: { kind: 'direct' } },
    ])
    const session = ctx.sessions.create(SessionId('loader-usage'))
    const handle = await ctx.sessionPersistence.create(session.header)
    session.append('user/message', {
      id: 'loader-user',
      role: 'user',
      source: { kind: 'user' },
      content: [],
    } as never, { surfaceOp: 'append' })
    await ctx.sessions.flush(session)
    await handle.close()

    const snapshot = await ctx.usageStatistics.snapshot()

    expect(snapshot.sessionCount).toBe(1)
    expect(snapshot.summary.currentStreakDays).toBe(1)
    expect(snapshot.insights.chatDays).toBe(1)
  })
})
