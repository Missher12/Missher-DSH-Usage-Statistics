/**
 * Declared compatibility metadata, checked as ranges against known versions.
 *
 * The Host gates a Bundle by evaluating only its `@deepseek-ai/dsh*` peers
 * against the running runtime (`evaluatePluginCompatibility`), which is why
 * those peers stay `*` and need no exemption. The Cordis and Schemastery peers
 * are ordinary npm ranges, and they are evaluated here with the real `semver`
 * implementation that the locked development dependency
 * `@deepseek-ai/dsh-app-boot` resolves — not with a hand-written comparator.
 * A range fixture proves which versions a declared range admits; it never
 * claims that the non-baseline versions in the table were run.
 *
 * Scope of this file: metadata only. No absolute machine path and no real Host
 * boot is asserted here; the real Loader evidence for a runtime is produced by
 * `scripts/verify-profile.mjs` in its own process.
 */
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { evaluatePluginCompatibility } from '@deepseek-ai/dsh-app-boot'

const root = resolve(import.meta.dirname, '../..')
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  name: string
  version: string
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
  peerDependencies: Record<string, string>
  exports: Record<string, string>
  dsh: { bundle: { patch: string } }
  packageManager: string
}

/** Resolve the real semver implementation through a locked development dependency. */
const semver = createRequire(createRequire(import.meta.url).resolve('@deepseek-ai/dsh-app-boot'))('semver') as {
  satisfies(version: string, range: string): boolean
}

/**
 * Versions of the two library peers, as range fixtures.
 *
 * `baseline` marks the exact versions published by the two real runtimes this
 * candidate was exercised against; the remaining entries only check where the
 * declared range ends, and are not claims of a run.
 */
const RANGE_FIXTURES = {
  '@deepseek-ai/cordis': {
    baseline: ['4.0.4', '4.0.5-alpha.1'],
    admittedByRange: ['4.0.5-alpha.5', '4.0.5', '4.0.6', '4.1.0'],
    rejectedByRange: ['4.0.3', '4.0.6-alpha.1', '5.0.0', '3.9.0'],
  },
  '@deepseek-ai/schemastery': {
    baseline: ['3.18.4', '3.18.5-alpha.1'],
    admittedByRange: ['3.18.5-alpha.5', '3.18.5', '3.18.9', '3.19.0'],
    rejectedByRange: ['3.18.3', '3.19.1-alpha.1', '4.0.0'],
  },
} as const

describe('declared compatibility metadata', () => {
  it('resolves the real semver implementation, not a hand-written comparator', () => {
    expect(typeof semver.satisfies).toBe('function')
    // Sanity: prerelease admission is the reason a bare caret range is not enough.
    expect(semver.satisfies('4.0.5-alpha.1', '^4.0.4')).toBe(false)
    expect(semver.satisfies('4.0.5-alpha.1', '^4.0.4 || ^4.0.5-alpha.1')).toBe(true)
  })

  it('keeps the Host runtime gate on the Host and declares no exemption', () => {
    expect(manifest.version).toBe('0.2.2')
    for (const name of ['@deepseek-ai/dsh-storage-domain', '@deepseek-ai/dsh-typert-protocol', '@deepseek-ai/dsh-session-persistence', '@deepseek-ai/dsh-client-ui-primitives']) {
      expect(manifest.peerDependencies[name]).toBe('*')
    }
    expect(Object.hasOwn(manifest.peerDependencies, '@deepseek-ai/dsh')).toBe(false)
  })

  it('admits every baseline version and rejects the untested boundaries', () => {
    for (const [name, fixtures] of Object.entries(RANGE_FIXTURES)) {
      const range = manifest.peerDependencies[name]
      expect(range, `${name} must declare an explicit range`).toBeDefined()
      for (const version of fixtures.baseline) {
        expect(semver.satisfies(version, range as string), `${name}@${version} baseline must satisfy ${String(range)}`).toBe(true)
      }
      for (const version of fixtures.admittedByRange) {
        expect(semver.satisfies(version, range as string), `${name}@${version} must satisfy ${String(range)}`).toBe(true)
      }
      for (const version of fixtures.rejectedByRange) {
        expect(semver.satisfies(version, range as string), `${name}@${version} must not satisfy ${String(range)}`).toBe(false)
      }
      // A mechanical `*` would admit every rejected version above, which is why it is refused.
      expect(semver.satisfies('9.9.9', '*')).toBe(true)
    }
  })

  it('still rejects an incompatible Host row through the Host runtime gate', () => {
    // `^0.9.0` is unsatisfied by every runtime under test, prereleases included,
    // so this is a real negative case rather than an accidentally admitted one.
    const incompatible = { ...manifest, peerDependencies: { ...manifest.peerDependencies, '@deepseek-ai/dsh': '^0.9.0' } }
    for (const runtimeVersion of ['0.1.7-rc.2', '0.2.0-rc.2', '0.2.1-alpha.2']) {
      expect(evaluatePluginCompatibility(incompatible, {}, runtimeVersion)).toMatchObject({
        name: manifest.name, version: '0.2.2', runtimeVersion, exempted: false,
      })
    }
    // The same gate admits this Bundle on every `*`-declared Host peer.
    for (const runtimeVersion of ['0.2.0-rc.1', '0.2.0-rc.2', '0.2.1-alpha.2', '0.2.1-alpha.5']) {
      expect(evaluatePluginCompatibility(manifest, {}, runtimeVersion)).toBeUndefined()
    }
  })

  it('keeps the development SDK lock reproducible', () => {
    expect(manifest.devDependencies['@deepseek-ai/dsh-session-persistence']).toBe('0.2.0-rc.2')
    expect(manifest.devDependencies['@deepseek-ai/cordis']).toBe('4.0.4')
    expect(manifest.devDependencies['@deepseek-ai/schemastery']).toBe('3.18.4')
    expect(manifest.packageManager).toBe('pnpm@11.7.0')
  })

  it('declares exactly the runtime dependencies the bundler leaves external', () => {
    // The Host entry keeps Cordis, Schemastery, zod and the Host service
    // packages external; the client bundle keeps React and the Host UI packages
    // external, so no second Cordis or Host copy can be installed or bundled.
    expect(manifest.dependencies).toEqual({ zod: '4.4.3' })
    expect(Object.keys(manifest.peerDependencies).sort()).toEqual([
      '@deepseek-ai/cordis',
      '@deepseek-ai/dsh-client-ui-primitives',
      '@deepseek-ai/dsh-session-persistence',
      '@deepseek-ai/dsh-storage-domain',
      '@deepseek-ai/dsh-typert-protocol',
      '@deepseek-ai/schemastery',
    ])
    expect(manifest.exports).toEqual({
      '.': './lib/index.js',
      './client': './lib/client.js',
      './typert': './lib/typert.js',
      './package.json': './package.json',
    })
    expect(manifest.dsh.bundle.patch).toBe('./cordis.patch.yml')
  })
})
