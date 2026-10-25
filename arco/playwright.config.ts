import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests/browser', testMatch: '*.e2e.ts', workers: 1,
  use: { baseURL: 'http://127.0.0.1:19528', locale: 'zh-CN', viewport: { width: 1440, height: 1000 }, trace: 'retain-on-failure' },
  webServer: { command: 'pnpm exec vite preview --host 127.0.0.1 --port 19528 --strictPort', url: 'http://127.0.0.1:19528', reuseExistingServer: false }
})
