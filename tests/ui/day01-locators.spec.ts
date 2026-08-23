import { test, expect } from '../../src/fixtures/test-fixtures';

/**
 * DAY 1 — Locators that survive a redeploy.
 *
 * Targets: playwright.dev and en.wikipedia.org (both live production)
 *
 * The core claim I want to prove: a role-based locator describes what the
 * user sees, and a CSS/XPath chain describes what the framework happened
 * to emit this build. The first survives a refactor. The second does not.
 */

test.describe('Day 1 — locator strategy @day1', () => {
  test('role-based locators read like the user experience', async ({ docsPage, page }) => {
    await docsPage.goto();

    // Good: a human could verify each of these by looking at the screen.
    await expect(page.getByRole('link', { name: 'Get started' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
    await expect(page.getByRole('button', { name: /search/i })).toBeVisible();
  });

  test('filtering beats index-chasing', async ({ hackerNews }) => {
    await hackerNews.goto();
    await hackerNews.expectLoaded();

    // Bad:  page.locator('tr').nth(17)          ← what is 17? who knows.
    // Good: describe the row by something a human would recognise.
    const rows = hackerNews.storyRows;
    await expect(rows.first()).toBeVisible();

    const count = await rows.count();
    expect(count, 'HN front page shows 30 stories').toBeGreaterThan(20);
  });

  test('chaining scopes a locator to a region, not the whole page', async ({
    wikipedia,
    page,
  }) => {
    await wikipedia.goto();
    await wikipedia.search('Playwright (software)');

    // Scope first, then find. This is how you stop matching the same word
    // in a nav bar, a footer and a cookie banner all at once.
    const content = page.locator('#mw-content-text');
    await expect(content.getByRole('heading').first()).toBeVisible();

    await expect(wikipedia.firstHeading).toContainText(/Playwright/i);
  });

  test('strict mode is a feature, not an obstacle @day1', async ({ docsPage, page }) => {
    await docsPage.goto();

    // Playwright throws if a locator resolves to more than one element.
    // Selenium would silently hand you the first match — and you would
    // ship a test that asserts against the wrong node for two years.
    const manyLinks = page.getByRole('link');
    expect(await manyLinks.count()).toBeGreaterThan(1);

    // Resolving ambiguity explicitly is the whole point:
    await expect(manyLinks.filter({ hasText: 'Get started' }).first()).toBeVisible();
  });
});
