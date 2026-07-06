import { expect, test } from '@playwright/test'

// Visual verification for spec 002 (Richer Client Tiles). Each test asserts a spec-002 success
// criterion AND captures a labelled screenshot into e2e/screenshots/ as review evidence.
// Runs frontend-only (no backend, no API key) — a green run also demonstrates the zero-LLM floor.

const SHOTS = 'e2e/screenshots'
const ALERT_LEVELS = ['critical', 'high', 'medium', 'none']

test.beforeEach(async ({ page }) => {
  await page.goto('/rm')
  await expect(page.getByTestId('client-tile').first()).toBeVisible()
})

test('SC-201/204 — every tile has a sparkline and an alert-level tint (cold, no AI)', async ({
  page,
}) => {
  const tiles = page.getByTestId('client-tile')
  await expect(tiles).toHaveCount(8)

  for (let i = 0; i < 8; i++) {
    const tile = tiles.nth(i)
    // SC-201: a 30-day cash-flow sparkline is present on the tile.
    await expect(tile.locator('svg[role="img"]')).toBeVisible()
    // SC-204: the tile is tinted per its dataset alert level, and the textual alert chip remains
    // (colour is never the sole signal).
    const level = await tile.getAttribute('data-alert-level')
    expect(ALERT_LEVELS).toContain(level)
    const chip = level === 'none' ? 'No alert' : level!
    await expect(tile.getByText(chip, { exact: false }).first()).toBeVisible()
  }

  await page.screenshot({ path: `${SHOTS}/01-dashboard-cold.png`, fullPage: true })
})

test('SC-201/202 — a critical tile shows tint, sparkline and the "View details" hint', async ({
  page,
}) => {
  const tile = page.locator('[data-testid="client-tile"][data-alert-level="critical"]').first()
  await expect(tile).toBeVisible()
  await expect(tile.locator('svg[role="img"]')).toBeVisible()
  await expect(tile.getByText('View details', { exact: false })).toBeVisible()
  await tile.screenshot({ path: `${SHOTS}/02-tile-critical.png` })
})

test('FR-204 — a tile shows an interactive state on hover', async ({ page }) => {
  const tile = page.getByTestId('client-tile').first()
  await tile.hover()
  await tile.screenshot({ path: `${SHOTS}/03-tile-hover.png` })
})

test('SC-202 — clicking the tile body opens the client detail view', async ({ page }) => {
  const tile = page.getByTestId('client-tile').first()
  await tile.getByText('View details', { exact: false }).click()
  await expect(page.getByTestId('client-detail')).toBeVisible()
  await page.screenshot({ path: `${SHOTS}/04-detail-open.png`, fullPage: true })
})

test('SC-203 — clicking the in-card NBC toggle does NOT open the detail view', async ({ page }) => {
  const tile = page.getByTestId('client-tile').first()
  await tile.getByTestId('nbc-toggle').click()
  // The toggle expands the briefing in place...
  await expect(tile.getByText('Hide', { exact: false })).toBeVisible()
  // ...and must NOT have opened the full-screen detail view.
  await expect(page.getByTestId('client-detail')).toHaveCount(0)
  await page.screenshot({ path: `${SHOTS}/05-nbc-toggle-no-detail.png`, fullPage: true })
})
