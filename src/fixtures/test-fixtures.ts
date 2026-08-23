import { test as base, expect, APIRequestContext, request as pwRequest } from '@playwright/test';
import { PlaywrightDocsPage } from '../pages/PlaywrightDocsPage';
import { HackerNewsPage } from '../pages/HackerNewsPage';
import { WikipediaPage } from '../pages/WikipediaPage';
import { GitHubClient } from '../api/GitHubClient';
import { BasePage } from '../pages/BasePage';
import { githubHeaders, GITHUB_API } from '../utils/constants';

/**
 * Custom fixtures.
 *
 * Fixtures are the feature that most teams migrating from Selenium never
 * adopt, and it is the one that pays off hardest. A fixture is lazy (it
 * only runs if a test actually asks for it), scoped (test or worker), and
 * composable. Together that replaces almost every @BeforeMethod hook and
 * every static ThreadLocal driver holder you have ever maintained.
 */

type Fixtures = {
  docsPage: PlaywrightDocsPage;
  hackerNews: HackerNewsPage;
  wikipedia: WikipediaPage;
  github: GitHubClient;
  /** A page with third-party trackers and images blocked — much faster. */
  fastPage: PlaywrightDocsPage;
};

type WorkerFixtures = {
  /**
   * One APIRequestContext per worker rather than per test.
   *
   * On a rate-limited API this matters: worker scope means we create a
   * handful of contexts for the whole run instead of one per test, and
   * connection reuse cuts both latency and load on the host.
   */
  apiContext: APIRequestContext;
};

export const test = base.extend<Fixtures, WorkerFixtures>({
  apiContext: [
    async ({}, use) => {
      const context = await pwRequest.newContext({
        baseURL: GITHUB_API,
        extraHTTPHeaders: githubHeaders(),
      });
      await use(context);
      await context.dispose();
    },
    { scope: 'worker' },
  ],

  github: async ({ apiContext }, use) => {
    await use(new GitHubClient(apiContext));
  },

  docsPage: async ({ page }, use) => {
    await use(new PlaywrightDocsPage(page));
  },

  hackerNews: async ({ page }, use) => {
    await use(new HackerNewsPage(page));
  },

  wikipedia: async ({ page }, use) => {
    await use(new WikipediaPage(page));
  },

  fastPage: async ({ page }, use) => {
    await BasePage.blockThirdPartyNoise(page);
    await use(new PlaywrightDocsPage(page));
  },
});

export { expect };
