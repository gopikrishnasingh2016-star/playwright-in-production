import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../../src/fixtures/test-fixtures';

/**
 * DAY 11 — Accessibility as a regression gate, not a one-off audit.
 *
 * Targets: playwright.dev and en.wikipedia.org (both live production)
 *
 * In banking work this is not optional — accessibility conformance is a
 * regulatory requirement, and it is far cheaper to catch a contrast or
 * label defect in CI than in an external audit six weeks before go-live.
 *
 * The mature move is the baseline: you will not fix every finding on a
 * legacy app on day one, so you freeze the current count and fail only on
 * NEW violations. Progress becomes enforceable instead of aspirational.
 */

test.describe('Day 11 — accessibility @day11', () => {
  test('the docs homepage has no critical or serious violations', async ({ docsPage, page }) => {
    await docsPage.goto();
    await docsPage.expectLoaded();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const blocking = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );

    // Attach the full report so a failure is actionable without a re-run.
    await test.info().attach('axe-violations.json', {
      body: JSON.stringify(results.violations, null, 2),
      contentType: 'application/json',
    });

    expect(
      blocking.map((v) => `${v.id} (${v.impact}) — ${v.nodes.length} node(s): ${v.help}`),
      'critical/serious accessibility violations',
    ).toEqual([]);
  });

  test('an article page keeps its landmark and heading structure', async ({
    wikipedia,
    page,
  }) => {
    await wikipedia.goto();
    await wikipedia.search('Web accessibility');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      // Scope to the content area: we are testing the article, not
      // Wikimedia's chrome, which we cannot influence anyway.
      .include('#mw-content-text')
      .analyze();

    const critical = results.violations.filter((v) => v.impact === 'critical');
    expect(critical, 'no critical violations inside article content').toEqual([]);

    // Structural checks axe does not make for you:
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('keyboard navigation reaches the primary action @day11', async ({ docsPage, page }) => {
    await docsPage.goto();

    // A control you cannot reach with Tab is invisible to a screen-reader
    // user, no matter how good its ARIA label is.
    await page.keyboard.press('Tab');
    const firstFocused = page.locator(':focus');
    await expect(firstFocused).toBeVisible();

    // Focus must be visibly indicated — the single most common audit fail.
    const outline = await firstFocused.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return { outlineStyle: style.outlineStyle, boxShadow: style.boxShadow };
    });
    expect(
      outline.outlineStyle !== 'none' || outline.boxShadow !== 'none',
      'focused element must have a visible focus indicator',
    ).toBe(true);
  });
});
