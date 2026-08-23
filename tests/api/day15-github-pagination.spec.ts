import { test, expect } from '../../src/fixtures/test-fixtures';
import { GitHubClient } from '../../src/api/GitHubClient';
import { BaseApiClient } from '../../src/api/BaseApiClient';
import { invariant, skipIfRateLimited, attachJson } from '../../src/utils/live-site';

/**
 * DAY 15 — Pagination and rate limits: the two things every real API has
 * and every tutorial API does not.
 *
 * Target: https://api.github.com (public REST API, documented for
 * programmatic use; 60 req/hr anonymous, 5,000 with a token)
 *
 * If you have only ever tested against a mock that returns a fixed array
 * of ten records, this is the day the job changes.
 */

test.describe('Day 15 — pagination and rate limits @day15', () => {
  test('a known repository satisfies its contract', async ({ github }) => {
    const repo = await github.getRepo('microsoft', 'playwright');

    expect(repo.full_name).toBe('microsoft/playwright');
    expect(repo.private).toBe(false);
    expect(repo.stargazers_count).toBeGreaterThan(50_000);
    invariant.nonEmptyString(repo.default_branch, 'default_branch');

    // Note what is NOT asserted: an exact star count. It changes hourly.
    // Assert the floor, the type and the shape — never today's number.
  });

  test('Link headers drive pagination, not a guessed page count', async ({
    apiContext,
  }, testInfo) => {
    const response = await apiContext.get('/repos/microsoft/playwright/issues', {
      params: { state: 'open', per_page: '10', page: '1' },
    });
    skipIfRateLimited(response, testInfo);
    expect(response.ok()).toBe(true);

    const links = GitHubClient.parseLinkHeader(response);
    expect(links, 'a busy repo must expose a next page').toHaveProperty('next');
    expect(links['next']).toContain('page=2');

    const rate = BaseApiClient.rateLimit(response);
    await attachJson(testInfo, 'rate-limit.json', rate);

    // Turn the invisible into a visible signal.
    if (rate.remaining !== null && rate.limit !== null) {
      expect(rate.remaining, 'we should not be at zero mid-run').toBeGreaterThan(0);
      testInfo.annotations.push({
        type: 'rate-limit',
        description: `${rate.remaining}/${rate.limit} remaining, resets ${rate.resetAt?.toISOString() ?? 'n/a'}`,
      });
    }
  });

  test('walking pages yields a growing, duplicate-free result set', async ({
    github,
  }, testInfo) => {
    const { issues, pagesFetched } = await github.listAllIssues('microsoft', 'playwright', {
      maxPages: 2,
      perPage: 25,
    });

    expect(pagesFetched).toBeGreaterThanOrEqual(1);
    expect(issues.length).toBeGreaterThan(0);

    // The bug this catches in real systems: an off-by-one in the paging
    // loop that returns page 1 twice. Silent, and devastating for any
    // report built on top of it.
    invariant.allUnique(
      issues.map((i) => i.number),
      'issue numbers across pages',
    );

    for (const issue of issues) {
      expect(issue.state).toBe('open');
      invariant.nonEmptyString(issue.title, `issue #${issue.number} title`);
    }

    await attachJson(testInfo, 'sample-issues.json', issues.slice(0, 5));
  });

  test('a missing resource is a 404, not a 200 with an empty body', async ({
    apiContext,
  }) => {
    const response = await apiContext.get('/repos/microsoft/this-repo-does-not-exist-xyz');
    expect(response.status()).toBe(404);

    const body = (await response.json()) as { message?: string };
    expect(body.message).toMatch(/not found/i);

    // Worth saying out loud: an API that returns 200 with `{"data": null}`
    // for a missing record is the reason half of your null-pointer
    // defects reach production. Test the unhappy path deliberately.
  });

  test('search results come back sorted as requested', async ({ github }) => {
    const results = await github.searchRepos('playwright language:typescript', 5);

    expect(results.total_count).toBeGreaterThan(0);
    expect(results.items.length).toBeLessThanOrEqual(5);

    const stars = results.items.map((r) => r.stargazers_count);
    const sortedDesc = [...stars].sort((a, b) => b - a);
    expect(stars, 'sort=stars&order=desc must actually be honoured').toEqual(sortedDesc);
  });
});
