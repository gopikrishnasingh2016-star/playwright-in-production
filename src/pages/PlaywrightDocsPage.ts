import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page object for playwright.dev — the Playwright documentation site.
 *
 * Target notes (checked against robots.txt):
 *   Allowed:    /, /docs/intro, /docs/<current-version topics>, /community/*
 *   Disallowed: /docs/next/, /docs/1.*..9.*  (old versioned docs)
 * We only ever touch the current, allowed docs.
 */
export class PlaywrightDocsPage extends BasePage {
  constructor(page: Page, path = '/') {
    super(page, path);
  }

  protected override get baseUrl(): string {
    return 'https://playwright.dev';
  }

  protected get uniqueMarker(): Locator {
    return this.page.getByRole('navigation', { name: 'Main' });
  }

  /* ---------- Locators: role-first, user-visible, resilient ---------- */

  get searchButton(): Locator {
    return this.page.getByRole('button', { name: /search/i }).first();
  }

  get searchInput(): Locator {
    return this.page
      .getByRole('searchbox', { name: /search/i })
      .or(this.page.getByRole('combobox', { name: /search/i }))
      .first();
  }

  get searchResults(): Locator {
    return this.page.getByRole('listbox');
  }

  get getStartedLink(): Locator {
    return this.page.getByRole('link', { name: 'Get started' });
  }

  get docsHeading(): Locator {
    return this.page.getByRole('heading', { level: 1 });
  }

  get sidebar(): Locator {
    return this.page.getByRole('navigation', { name: 'Docs sidebar' });
  }

  /* ---------------------- Actions ---------------------- */

  /**
   * Open the Algolia DocSearch modal and type a query.
   *
   * This is a genuinely hard interaction to automate on a live site: the
   * modal mounts lazily, the input is focus-trapped, and results arrive
   * over the network. Playwright's auto-waiting handles all three without
   * a single explicit sleep.
   */
  async search(term: string): Promise<Locator> {
    await this.searchButton.click();
    await expect(this.searchInput).toBeVisible();
    await this.searchInput.fill(term);
    // Web-first assertion: wait for at least one result, not a fixed delay.
    await expect(this.searchResults.getByRole('option').first()).toBeVisible();
    return this.searchResults.getByRole('option');
  }

  async openFirstSearchResult(term: string): Promise<void> {
    const options = await this.search(term);
    await options.first().click();
    await expect(this.docsHeading).toBeVisible();
  }

  /** Follow a sidebar link by its visible text. */
  async openSidebarTopic(name: string | RegExp): Promise<void> {
    await this.sidebar.getByRole('link', { name }).click();
    await expect(this.docsHeading).toBeVisible();
  }

  /** All top-level sidebar section names, in document order. */
  async sidebarSections(): Promise<string[]> {
    return this.sidebar.getByRole('link').allInnerTexts();
  }
}
