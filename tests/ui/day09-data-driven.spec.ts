import { test, expect } from '../../src/fixtures/test-fixtures';
import { invariant } from '../../src/utils/live-site';

/**
 * DAY 9 — Data-driven tests, done so failures stay readable.
 *
 * Target: en.wikipedia.org (live)
 *
 * The trap in data-driven testing is the for-loop INSIDE a single test.
 * When case 7 of 12 fails you get one red test, one stack trace, and no
 * idea which input broke. Generating one test PER case gives you twelve
 * named results, independent retries, and parallel execution for free.
 */

interface SearchCase {
  term: string;
  expectHeading: RegExp;
  /** A section every correct article on this topic must have. */
  expectSection?: RegExp;
}

const cases: SearchCase[] = [
  { term: 'Software testing', expectHeading: /Software testing/i, expectSection: /History/i },
  { term: 'Test automation', expectHeading: /Test automation/i },
  { term: 'Regression testing', expectHeading: /Regression testing/i },
  { term: 'Continuous integration', expectHeading: /Continuous integration/i },
  { term: 'Application programming interface', expectHeading: /Application programming interface/i },
];

test.describe('Day 9 — one test per case @day9', () => {
  for (const testCase of cases) {
    // Each iteration declares its own test. The title carries the input,
    // so a CI failure tells you what broke before you open a single log.
    test(`article "${testCase.term}" loads with the expected structure`, async ({
      wikipedia,
      page,
    }) => {
      await wikipedia.goto();
      await wikipedia.search(testCase.term);

      await expect(wikipedia.firstHeading).toContainText(testCase.expectHeading);
      await expect(page).toHaveURL(/\/wiki\//);

      if (testCase.expectSection) {
        await expect(
          page.getByRole('heading', { name: testCase.expectSection }).first(),
        ).toBeVisible();
      }

      const body = page.locator('#mw-content-text');
      const text = await body.innerText();
      invariant.nonEmptyString(text, `${testCase.term} article body`);
      expect(text.length, 'a real article is more than a stub').toBeGreaterThan(1_000);
    });
  }

  test('tables render with a consistent column count @day9', async ({ wikipedia }) => {
    await wikipedia.goto();
    await wikipedia.search('Comparison of web browsers');

    const table = await wikipedia.readTable(0);
    expect(table.length, 'table has rows').toBeGreaterThan(2);

    const headerWidth = table[0]!.length;
    expect(headerWidth).toBeGreaterThan(1);

    // Ragged rows are a classic rendering defect that eyeballing misses.
    const ragged = table.slice(1).filter((row) => row.length > headerWidth);
    expect(ragged.length, 'no row should exceed the header width').toBe(0);
  });
});
