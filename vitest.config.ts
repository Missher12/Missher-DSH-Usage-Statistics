import { defineConfig } from 'vitest/config'
import { standardDecoratorPlugin } from './harness-sdk/vitest.shared.ts'
export default defineConfig({
  // Linked SDK controls and the test renderer must share one React instance.
  resolve: { dedupe: ['react', 'react-dom'] },
  plugins: [standardDecoratorPlugin()],
  test: {include: ['tests/**/*.spec.ts', 'tests/**/*.spec.tsx'], environment: 'node', execArgv: ['--no-experimental-webstorage'], testTimeout: 15_000},
})
