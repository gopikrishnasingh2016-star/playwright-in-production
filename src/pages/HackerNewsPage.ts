import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export interface HnStory {
  rank: number;
  title: string;
  url: string | null;
  points: number | null;
  comments: number | null;
}

/**
 * Page object for news.ycombinator.com.
 *
 * WHY THIS SITE: it is real production traffic, its markup is famously
 * table-based and old-school, and its content changes every few minutes.
 * That combination kills two bad habits at once — brittle CSS chains, and
 * assertions that hard-code data that will not exist tomorrow.
 *
 * RESPONSIBLE USE (from https://news.ycombinator.com/robots.txt):
 *   Crawl-delay: 30
 *   Disallow: /vote /reply /login /logout /fave /flag /hide /submitlink
 *
 * We are strictly READ-ONLY. We never click an upvote, never log in, and
 * we serialise these tests so we honour the crawl delay.
 */
export class HackerNewsPage extends BasePage {
  constructor(page: Page, path = '/news') {
    super(page, path);
  }

  protected override get baseUrl(): string {
    return 'https://news.ycombinator.com';
  }

  protected get uniqueMarker(): Locator {
    return this.page.getByRole('link', { name: 'Hacker News' }).first();
  }

  get storyRows(): Locator {
    return this.page.locator('tr.athing');
  }

  get moreLink(): Locator {
    return this.page.getByRole('link', { name: 'More' });
  }

  /**
   * Scrape the front page into typed objects.
   *
   * Note the shape of the assertions this enables: we can never assert
   * "the top story is X", because X changes. We assert INVARIANTS —
   * 30 stories, ranks ascending from 1, every title non-empty. Those hold
   * today, tomorrow and next year. This is the single most transferable
   * idea in the whole repo.
   */
  async stories(): Promise<HnStory[]> {
    await expect(this.storyRows.first()).toBeVisible();
    const rows = await this.storyRows.all();

    const out: HnStory[] = [];
    for (const row of rows) {
      const rankText = (await row.locator('span.rank').innerText()).replace('.', '');
      const titleLink = row.locator('span.titleline > a').first();
      const title = (await titleLink.innerText()).trim();
      const url = await titleLink.getAttribute('href');

      // The metadata lives in the *next* sibling row on HN. This is the
      // one place a structural locator genuinely beats a role-based one.
      const subtext = row.locator('xpath=following-sibling::tr[1]').locator('span.subline');
      const hasSubtext = (await subtext.count()) > 0;

      let points: number | null = null;
      let comments: number | null = null;
      if (hasSubtext) {
        const scoreText = await subtext.locator('span.score').first().textContent().catch(() => null);
        points = scoreText ? Number.parseInt(scoreText, 10) : null;

        const commentText = await subtext
          .getByRole('link', { name: /comment|discuss/i })
          .first()
          .textContent()
          .catch(() => null);
        const parsed = commentText ? Number.parseInt(commentText, 10) : Number.NaN;
        comments = Number.isNaN(parsed) ? 0 : parsed;
      }

      out.push({ rank: Number.parseInt(rankText, 10), title, url, points, comments });
    }
    return out;
  }

  async goToNextPage(): Promise<void> {
    await this.moreLink.click();
    await expect(this.storyRows.first()).toBeVisible();
  }
}
