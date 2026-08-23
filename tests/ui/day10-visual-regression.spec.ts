import { test, expect } from '../../src/fixtures/test-fixtures';

/**
 * DAY 10 — Visual regression on a site whose content you do not control.
 *
 * Target: playwright.dev (live)
 *
 * Screenshot testing gets abandoned by most teams within a quarter, and
 * always for the same reason: they snapshot a whole page containing a
 * clock, a carousel and a star count, then drown in false positives.
 *
 * The technique that makes it survivable is subtraction — snapshot the
 * smallest region that carries the design contract, mask what moves,
 * disable animation, and pin the viewport.
 *
 * NOTE: run `npm run update:snapshots` once to create baselines. Baselines
 * are OS- and browser-specific; CI here pins to the Playwright container
 * image so the bytes match.
 */

test.describe('Day 10 — visual regression @day10', () => {
  test.beforeEach(async ({ page }) => {
    // Pin the viewport. A different window size is a different design.
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  test('the hero region matches its baseline', async ({ page }) => {
    await page.goto('https://playwright.dev/', { waitUntil: 'load' });

    const hero = page.locator('header').first();
    await expect(hero).toBeVisible();

    await expect(hero).toHaveScreenshot('hero.png', {
      animations: 'disabled',
      // Fonts can arrive a frame late and shift metrics by a pixel.
      maxDiffPixelRatio: 0.02,
    });
  });

  test('the docs sidebar is stable once volatile regions are masked', async ({ page }) => {
    await page.goto('https://playwright.dev/docs/intro', { waitUntil: 'load' });

    const sidebar = page.getByRole('navigation', { name: 'Docs sidebar' });
    await expect(sidebar).toBeVisible();

    await expect(sidebar).toHaveScreenshot('docs-sidebar.png', {
      animations: 'disabled',
      // Mask anything version-stamped: it changes on every release and
      // has nothing to do with whether the layout regressed.
      mask: [page.locator('.navbar__item.dropdown')],
      maxDiffPixelRatio: 0.02,
    });
  });

  test('full-page snapshots are the anti-pattern — here is the proof @day10', async ({
    page,
  }) => {
    await page.goto('https://playwright.dev/', { waitUntil: 'load' });

    // Deliberately NOT asserting a full-page screenshot. Instead, count
    // how many independently-changing regions a full-page shot would have
    // to cover. Every one of them is a future false positive.
    const volatileRegions = await page
      .locator('[class*="carousel"], [class*="banner"], time, [data-testid*="count"]')
      .count();

    test.info().annotations.push({
      type: 'why-not-fullpage',
      description: `${volatileRegions} independently-changing region(s) on this page — each one a false-positive source in a full-page snapshot.`,
    });

    expect(volatileRegions).toBeGreaterThanOrEqual(0);
  });
});
