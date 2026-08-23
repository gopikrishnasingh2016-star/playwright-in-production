import { Page, Locator, expect } from '@playwright/test';

/**
 * Shared behaviour for every page object in this repo.
 *
 * Deliberately thin. A base page that wraps click(), fill() and goto()
 * in your own names is a liability: it hides Playwright's auto-waiting,
 * breaks the trace viewer's readability, and means every new joiner has
 * to learn your API on top of Playwright's. Put only genuinely shared
 * behaviour here.
 */
export abstract class BasePage {
  protected constructor(
    /** Public so specs can drop to raw Playwright when a page object would
        add nothing. A page object should be a convenience, not a cage. */
    public readonly page: Page,
    /** Path relative to the site root, e.g. '/docs/intro'. */
    protected readonly path: string,
  ) {}

  /** A locator that is unique to this page — used by expectLoaded(). */
  protected abstract get uniqueMarker(): Locator;

  async goto(options?: { query?: Record<string, string> }): Promise<this> {
    const url = new URL(this.path, this.baseUrl);
    for (const [k, v] of Object.entries(options?.query ?? {})) {
      url.searchParams.set(k, v);
    }
    await this.page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
    return this;
  }

  /** Override in subclasses that live on a different host. */
  protected get baseUrl(): string {
    return 'https://playwright.dev';
  }

  /**
   * Assert we actually landed here. Every navigation on a live site can
   * be intercepted by a consent banner, a redirect, or an outage page;
   * a marker assertion turns "mysterious later failure" into "did not load".
   */
  async expectLoaded(): Promise<this> {
    await expect(this.uniqueMarker).toBeVisible();
    return this;
  }

  /**
   * Block third-party analytics, ads and fonts. On real production sites
   * this routinely halves page load time and removes a whole class of
   * flake caused by a slow tracker never settling.
   */
  static async blockThirdPartyNoise(page: Page): Promise<void> {
    const blocked = [
      '**/*.{png,jpg,jpeg,gif,webp,avif,svg,woff,woff2}',
      '**/google-analytics.com/**',
      '**/googletagmanager.com/**',
      '**/doubleclick.net/**',
      '**/*.hotjar.com/**',
      '**/segment.io/**',
      '**/sentry.io/**',
    ];
    for (const pattern of blocked) {
      await page.route(pattern, (route) => route.abort());
    }
  }

  /** Current page title, trimmed. Handy for smoke assertions. */
  async title(): Promise<string> {
    return (await this.page.title()).trim();
  }
}
