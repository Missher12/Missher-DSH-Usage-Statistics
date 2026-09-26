import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {include: ['tests/**/*.spec.ts', 'tests/**/*.spec.tsx'], environment: 'node', execArgv: ['--no-experimental-webstorage'], testTimeout: 15_000},
})
