import { test, expect } from '../../src/fixtures/test-fixtures';
import { z } from 'zod';
import { RepoSchema, WikiSearchSchema } from '../../src/api/schemas';
import { skipIfRateLimited } from '../../src/utils/live-site';

/**
 * DAY 17 — Schema validation: catching the change nobody told you about.
 *
 * Targets: api.github.com and en.wikipedia.org/w/api.php (both live)
 *
 * The failure mode this prevents is the quietest one in testing. A field
 * changes from a number to a string, or goes nullable. Your assertions
 * still pass because you only checked three fields. Six weeks later a
 * downstream report is wrong and nobody can say when it started.
 */

test.describe('Day 17 — contract validation against live responses @day17', () => {
  test('every field we depend on is present and correctly typed', async ({
    apiContext,
  }, testInfo) => {
    const response = await apiContext.get('/repos/microsoft/TypeScript');
    skipIfRateLimited(response, testInfo);
    expect(response.ok()).toBe(true);

    // safeParse rather than parse, so we can render every violation at
    // once instead of stopping at the first one.
    const result = RepoSchema.safeParse(await response.json());

    if (!result.success) {
      const report = result.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('\n');
      await testInfo.attach('schema-violations.txt', {
        body: report,
        contentType: 'text/plain',
      });
    }

    expect(result.success, 'GitHub repo response must match our contract').toBe(true);
  });

  test('a deliberately wrong schema fails loudly — proving the check works', async ({
    apiContext,
  }, testInfo) => {
    const response = await apiContext.get('/repos/microsoft/TypeScript');
    skipIfRateLimited(response, testInfo);

    // A validator you have never seen fail is a validator you cannot trust.
    // This is the test that tests the test.
    const WrongSchema = RepoSchema.extend({
      // Deliberately impossible: no repo has a negative star count.
      stargazers_count: z.number().max(-1),
    });

    const result = WrongSchema.safeParse(await response.json());
    expect(result.success, 'an impossible constraint must be rejected').toBe(false);
  });

  test('the MediaWiki search API honours its documented envelope', async ({ request }) => {
    const response = await request.get('https://en.wikipedia.org/w/api.php', {
      params: {
        action: 'query',
        list: 'search',
        srsearch: 'test automation',
        srlimit: '5',
        format: 'json',
      },
    });
    expect(response.ok()).toBe(true);

    const body = WikiSearchSchema.parse(await response.json());

    expect(body.query.searchinfo.totalhits).toBeGreaterThan(0);
    expect(body.query.search.length).toBeLessThanOrEqual(5);

    for (const hit of body.query.search) {
      expect(hit.pageid).toBeGreaterThan(0);
      expect(hit.title.trim().length).toBeGreaterThan(0);
      expect(new Date(hit.timestamp).toString()).not.toBe('Invalid Date');
    }
  });
});
