import { test, expect } from '../../src/fixtures/test-fixtures';
import { skipIfRateLimited } from '../../src/utils/live-site';

/**
 * DAY 19 — The hybrid pattern: set up over the API, assert in the UI.
 *
 * Targets: api.github.com + github.com (same live system, two surfaces)
 *
 * This is the single highest-leverage pattern I have carried into every
 * client engagement. Driving preconditions through the UI is slow and
 * flaky, and it tests the same login form four hundred times. Drive state
 * over the API, then use the browser only for what only a browser can
 * check: that a human can actually see and use the result.
 *
 * A retail-banking onboarding suite that took 40 minutes through the UI
 * drops under 10 with this pattern, and stops failing on unrelated screens.
 */

test.describe('Day 19 — API-driven setup, UI-driven assertion @day19', () => {
  test('what the API reports is what the web page shows', async ({
    apiContext,
    page,
  }, testInfo) => {
    // 1. ARRANGE — fetch the source of truth over the API. Fast, stable,
    //    and immune to whatever the marketing team did to the layout.
    const response = await apiContext.get('/repos/microsoft/playwright');
    skipIfRateLimited(response, testInfo);
    expect(response.ok()).toBe(true);

    const repo = (await response.json()) as {
      full_name: string;
      description: string | null;
      default_branch: string;
      license: { spdx_id: string | null } | null;
    };

    // 2. ACT — visit the human-facing surface of the same system.
    await page.goto(`https://github.com/${repo.full_name}`, {
      waitUntil: 'domcontentloaded',
    });

    // 3. ASSERT — the UI must agree with the API. A mismatch here is a
    //    genuine integration defect, and it is exactly the class of bug
    //    that pure-UI and pure-API suites both miss.
    await expect(page.getByRole('heading', { name: repo.full_name.split('/')[1]! })).toBeVisible();

    if (repo.description) {
      const firstWords = repo.description.split(' ').slice(0, 4).join(' ');
      await expect(page.getByText(firstWords, { exact: false }).first()).toBeVisible();
    }

    await expect(page.getByText(repo.default_branch, { exact: false }).first()).toBeVisible();
  });

  test('API-sourced data drives which UI journeys we run', async ({ github, page }) => {
    // Choose the test data at runtime from live state rather than
    // hard-coding a repo that may be archived next quarter.
    const results = await github.searchRepos('playwright language:typescript stars:>1000', 3);
    expect(results.items.length).toBeGreaterThan(0);

    const target = results.items[0]!;

    await page.goto(target.html_url, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(new RegExp(target.full_name.replace('/', '\\/')));

    // The invariant: whatever repo we picked, its page must render its
    // own name. Self-consistent, and never needs updating.
    await expect(
      page.getByRole('link', { name: target.owner.login, exact: true }).first(),
    ).toBeVisible();
  });
});
