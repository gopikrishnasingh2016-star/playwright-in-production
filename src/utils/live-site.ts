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
 * Assert an INVARIANT rather than a value.
 *
 * On a live site you can never assert "the top story is X". You assert the
 * properties that must hold for any correct rendering: non-empty, in range,
 * ordered, unique. Write your assertions this way and your suite survives
 * content changes without a single maintenance commit.
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
