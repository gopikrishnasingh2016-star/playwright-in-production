import { test, expect } from '../../src/fixtures/test-fixtures';

/**
 * DAY 0 — The first test, against a site nobody seeded for me.
 *
 * Target: https://playwright.dev  (real production docs site)
 *
 * The lesson: notice what is NOT here. No driver setup. No implicit wait.
 * No WebDriverWait. No try/catch around a StaleElementReferenceException.
 * Four lines do what took forty in Selenium, and they are more reliable,
 * because every assertion below retries until it passes or times out.
 */

test.describe('Day 0 — first contact @day0', () => {
  test('the docs homepage loads and offers a way in', async ({ docsPage }) => {
    await docsPage.goto();
    await docsPage.expectLoaded();

    // Web-first assertion: retries automatically, no sleep, no polling loop.
    await expect(docsPage.getStartedLink).toBeVisible();
    await expect(docsPage.page).toHaveTitle(/Playwright/);
  });

  test('Get started navigates into the docs @day0', async ({ docsPage, page }) => {
    await docsPage.goto();
    await docsPage.getStartedLink.click();

    await expect(page).toHaveURL(/.*\/docs\/intro/);
    await expect(docsPage.docsHeading).toContainText(/Installation/i);
  });

  /**
   * The assertion that would have failed on Day 0 of my career:
   *   expect(heading).toHaveText('Installation')   ← exact, brittle
   * versus what survives a docs rewrite:
   *   expect(heading).toContainText(/Installation/i)
   *
   * On live sites, assert the contract, not the copy.
   */
});
