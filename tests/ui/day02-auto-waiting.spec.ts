import { test, expect } from '../../src/fixtures/test-fixtures';
import { invariant } from '../../src/utils/live-site';

/**
 * DAY 2 — Auto-waiting, and why every sleep in your suite is a bug.
 *
 * Target: news.ycombinator.com (live, content changes every few minutes)
 *
 * Hacker News is the perfect proving ground because its data is different
 * on every single run. Any test that passes here is a test that asserts a
 * real invariant rather than a memorised value.
 *
 * Read-only. We never touch /vote, /reply or /login (disallowed by robots.txt).
 */

// Serial so we make a handful of polite, spaced-out requests, not a burst.
test.describe.configure({ mode: 'serial' });

test.describe('Day 2 — auto-waiting and invariants @day2', () => {
  test('the front page always holds a full, well-ordered set of stories', async ({
    hackerNews,
  }) => {
    await hackerNews.goto();
    await hackerNews.expectLoaded();

    const stories = await hackerNews.stories();

    // Every assertion below is chosen to answer one question:
    // WOULD THIS FAIL ON A REAL BUG?
    //
    // `expect(stories.length).toBeGreaterThan(0)` would not — it passes on
    // one story and on thirty, so it survives the page half-rendering. The
    // assertions here each fail on a specific, nameable defect.
    expect(stories.length, 'front page shows a full page of stories').toBeGreaterThanOrEqual(25);

    // A gap or a repeat in the ranks is a paging defect.
    invariant.ascending(
      stories.map((s) => s.rank),
      'story ranks',
    );

    for (const story of stories) {
      invariant.nonEmptyString(story.title, `story #${story.rank} title`);
      if (story.points !== null) {
        expect(story.points, `story #${story.rank} points`).toBeGreaterThanOrEqual(0);
      }
    }

    invariant.allUnique(
      stories.map((s) => s.title),
      'story titles on one page',
    );
  });

  test('pagination preserves rank continuity across pages', async ({ hackerNews }) => {
    await hackerNews.goto();
    const firstPage = await hackerNews.stories();
    const lastRankOnPageOne = firstPage[firstPage.length - 1]!.rank;

    await hackerNews.goToNextPage();
    const secondPage = await hackerNews.stories();

    expect(
      secondPage[0]!.rank,
      'page 2 continues numbering from where page 1 stopped',
    ).toBe(lastRankOnPageOne + 1);
  });

  /**
   * THE POINT OF THE WHOLE DAY:
   *
   * There is not a single waitForTimeout() in this file. Every locator
   * call and every expect() polls until the condition holds or the
   * timeout expires. A fixed sleep is always either too short (flake)
   * or too long (slow suite) — usually both, on different machines.
   *
   * The one legitimate use of a delay is politeness toward a host you do
   * not own. That is what utils/live-site.ts#politeDelay is for, and it
   * is named so nobody mistakes it for a synchronisation tool.
   */
});
