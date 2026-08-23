import { test, expect } from '../../src/fixtures/test-fixtures';

/**
 * DAY 5 — Page Object Model, and the version of it that ages badly.
 *
 * Target: playwright.dev (live)
 *
 * I have inherited a lot of POM codebases. The ones that rot share one
 * habit: the page object wraps every Playwright call in a method of its
 * own — clickLoginButton(), enterUsername(), waitForDashboard() — until
 * the object is a second, worse API that hides auto-waiting and produces
 * traces nobody can read.
 *
 * What works: expose LOCATORS as properties, and reserve METHODS for
 * multi-step journeys that carry real domain meaning.
 */

test.describe('Day 5 — page objects that age well @day5', () => {
  test('locators as properties keep specs readable', async ({ docsPage }) => {
    await docsPage.goto();
    await docsPage.expectLoaded();

    // The spec reads like a description of intent. All the auto-waiting
    // and retry behaviour of Playwright is still right here, in plain sight.
    await expect(docsPage.getStartedLink).toBeVisible();
    await expect(docsPage.searchButton).toBeEnabled();
  });

  test('methods encapsulate a journey, not a single click', async ({ docsPage, page }) => {
    await docsPage.goto();

    // search() is worth a method: it opens a lazy modal, waits for a
    // focus trap, types, and waits for network-backed results. That is a
    // journey. `clickSearchButton()` would not have been worth one.
    const results = await docsPage.search('locators');

    expect(await results.count()).toBeGreaterThan(0);
    await expect(results.first()).toBeVisible();

    await page.keyboard.press('Escape');
  });

  test('a journey method leaves the app in an asserted state', async ({ docsPage }) => {
    await docsPage.goto();
    await docsPage.openFirstSearchResult('assertions');

    // The method already asserted arrival internally. The spec adds the
    // domain-specific check. Neither duplicates the other.
    await expect(docsPage.docsHeading).toBeVisible();
    await expect(docsPage.page).toHaveURL(/\/docs\//);
  });

  test('page objects compose with raw Playwright when that is simpler', async ({
    docsPage,
    page,
  }) => {
    await docsPage.goto();

    // A page object should be a convenience, not a cage. When a one-off
    // check does not belong in the object, reach straight for `page`.
    // Forcing everything through the object is how POMs become 2,000-line
    // god classes that three people are afraid to touch.
    await expect(page.locator('footer')).toBeVisible();
  });
});
