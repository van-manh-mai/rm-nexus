import { defineConfig, devices } from '@playwright/test'

// Spec-002 visual verification runs against the FRONTEND ALONE — no backend, no API key.
// Every asserted feature (tile sparkline, alert-level tint, click affordance) is static-data
// driven, so a green run is also proof of the zero-live-LLM floor (spec-001 SC-001/SC-006).
//
// Screenshots are written to e2e/screenshots/ and, in CI, published inline onto the PR.

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    viewport: { width: 1440, height: 900 },
    // Deterministic screenshots across runs.
    reducedMotion: 'reduce',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Boot the frontend only. `next build && next start` is deterministic (no HMR); locally we
  // reuse an already-running dev server if present.
  webServer: {
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000/rm',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
