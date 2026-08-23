import { APIResponse, TestInfo, expect } from '@playwright/test';

/**
 * Helpers for the specific problem this repo exists to solve:
 * testing against sites whose CONTENT you do not control.
 */

/**
 * Skip a test — loudly and with a reason — when the target is rate-limiting us.
 *
 * This is the difference between a suite that teaches you something and a
 * suite people mute. A 403 from GitHub because we burned our 60 anonymous
 * requests is not a defect; failing the build for it trains the team to
 * ignore red. Skipping with an explicit annotation keeps it visible.
 */
export function skipIfRateLimited(response: APIResponse, testInfo: TestInfo): void {
  const remaining = response.headers()['x-ratelimit-remaining'];
  const isLimited =
    response.status() === 429 ||
    (response.status() === 403 && remaining === '0');

  if (isLimited) {
    const reset = response.headers()['x-ratelimit-reset'];
    const resetAt = reset ? new Date(Number.parseInt(reset, 10) * 1000).toISOString() : 'unknown';
    testInfo.annotations.push({
      type: 'skipped-rate-limit',
      description: `Rate limited by ${new URL(response.url()).host}; resets at ${resetAt}. Set GITHUB_TOKEN to raise the limit.`,
    });
    testInfo.skip(true, `Rate limited — resets at ${resetAt}`);
  }
}

/**
 * Assert the RULE, not the reading.
 *
 * On a live site you can never assert "the top story is X" — it will be
 * something else in an hour. But the fix is NOT to assert loosely.
 * `expect(count).toBeGreaterThan(0)` survives content changes precisely
 * because it would also survive the feature being broken. That is a worse
 * test than the brittle literal it replaced, not a better one.
 *
 * The right question for any assertion is: WOULD THIS FAIL ON A REAL BUG?
 *
 * In order of strength, the assertions that pass that test:
 *
 *   1. Cross-surface agreement — the UI value equals the API value equals
 *      the database value. Completely strict, completely immune to the data
 *      changing. See tests/hybrid/. Reach for this first.
 *   2. Domain bounds from actual business rules — "the fee is within the
 *      band the product allows", not "the fee is positive".
 *   3. Structural invariants — ordered, unique, complete, non-empty. The
 *      helpers below. Each one fails on a specific defect: a duplicate is a
 *      dedup bug, a rank gap is a paging bug, an empty title is a render bug.
 *   4. A floor or a type check. The fallback when nothing above is
 *      available. It catches a total outage and little else. Use it
 *      knowingly, and do not mistake it for coverage.
 *
 * A NOTE ON GUARDS, because you will find `toBeGreaterThan(0)` in these
 * specs and it looks like a contradiction. There is a difference between
 * a guard and an assertion:
 *
 *   expect(results.items.length).toBeGreaterThan(0);   // guard
 *   expect(stars).toEqual([...stars].sort(desc));      // the assertion
 *
 * The first line exists so the second one cannot pass vacuously on an
 * empty array — a real failure mode, and one that has shipped more than
 * one falsely-green suite. It is scaffolding for the real check, not the
 * check itself. The problem is never that a weak assertion appears in a
 * test; it is a weak assertion being the ONLY one in a test.
 */
export const invariant = {
  nonEmptyString(value: unknown, label: string): asserts value is string {
    expect(typeof value, `${label} should be a string`).toBe('string');
    expect((value as string).trim().length, `${label} should not be empty`).toBeGreaterThan(0);
  },

  ascending(numbers: number[], label: string): void {
    for (let i = 1; i < numbers.length; i += 1) {
      expect(
        numbers[i]!,
        `${label}: expected item ${i} (${numbers[i]}) > item ${i - 1} (${numbers[i - 1]})`,
      ).toBeGreaterThan(numbers[i - 1]!);
    }
  },

  allUnique<T>(items: T[], label: string): void {
    const seen = new Set(items);
    expect(seen.size, `${label} should contain no duplicates`).toBe(items.length);
  },

  withinLast(iso: string, days: number, label: string): void {
    const age = Date.now() - new Date(iso).getTime();
    expect(age, `${label} should be within the last ${days} days`).toBeLessThan(
      days * 24 * 60 * 60 * 1000,
    );
  },
};

/**
 * Watch every response for values that must never appear on the wire.
 *
 * The pattern this generalises: on a regulated onboarding journey, a PAN or
 * Aadhaar number can be correctly masked in the DOM and sitting in plain
 * text in the JSON payload behind it. Every UI assertion ever written for
 * that screen passes. It is a real finding, and it is invisible to any
 * tool that only looks at rendered output.
 *
 * Usage — attach BEFORE the journey runs, assert after:
 *
 *   const leaks = watchForLeakedValues(page, [fullPan, aadhaar], '/kyc/');
 *   await completeOnboarding(page);
 *   expect(leaks.found(), 'no unmasked PII in KYC responses').toEqual([]);
 *
 * Returns a handle rather than a promise so the listener is registered
 * synchronously — a response that arrives before you start listening is a
 * response you never see, which is the classic way this check silently
 * passes while missing everything.
 */
export function watchForLeakedValues(
  page: import('@playwright/test').Page,
  forbidden: string[],
  urlContains = '',
): { found(): string[] } {
  const leaks: string[] = [];
  const values = forbidden.filter((v) => v && v.trim().length > 0);

  page.on('response', async (response) => {
    if (urlContains && !response.url().includes(urlContains)) return;
    const body = await response.text().catch(() => '');
    if (!body) return;
    for (const value of values) {
      if (body.includes(value)) {
        leaks.push(`${response.url()} leaked "${value.slice(0, 4)}…"`);
        break;
      }
    }
  });

  return { found: () => [...leaks] };
}

/**
 * Honour a site's crawl-delay between actions.
 * Hacker News asks for 30s; we use a shorter, still-polite delay because
 * our whole suite makes a handful of requests, not thousands.
 */
export async function politeDelay(ms = 1_500): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/** Attach an arbitrary payload to the HTML report — invaluable in CI. */
export async function attachJson(
  testInfo: TestInfo,
  name: string,
  payload: unknown,
): Promise<void> {
  await testInfo.attach(name, {
    body: JSON.stringify(payload, null, 2),
    contentType: 'application/json',
  });
}
