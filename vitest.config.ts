import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: false,
    pool: 'forks',
    // The smoke tests in this initial suite are pure-function tests — no DB,
    // no Next.js runtime, so they can run in parallel forks without issues.
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
