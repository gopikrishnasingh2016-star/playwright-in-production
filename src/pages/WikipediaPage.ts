import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page object for en.wikipedia.org.
 *
 * WHY THIS SITE: infoboxes, sortable tables, footnotes, language switching
 * and a search-with-suggestions box. It is the closest thing on the open
 * web to the data-dense enterprise screens most of us actually test.
 *
 * Wikimedia asks automated clients to send a descriptive User-Agent — we
 * set one globally in playwright.config.ts.
 */
export class WikipediaPage extends BasePage {
  constructor(page: Page, path = '/wiki/Main_Page') {
    super(page, path);
  }

  protected override get baseUrl(): string {
    return 'https://en.wikipedia.org';
  }

  protected get uniqueMarker(): Locator {
    return this.page.getByRole('banner');
  }

  /**
   * Wikipedia has shipped several search widgets across its Vector 2010 and
   * Vector 2022 skins, and which one you get can depend on the A/B bucket
   * you land in. `.or()` is the right tool for that: it resolves to
   * whichever matches, without a try/catch or a conditional in the spec.
   *
   * This is a real pattern for real sites, not a workaround.
   */
  get searchInput(): Locator {
    return this.page
      .getByRole('searchbox', { name: /search/i })
      .or(this.page.getByPlaceholder(/search wikipedia/i))
      .first();
  }

  get firstHeading(): Locator {
    return this.page.locator('#firstHeading');
  }

  get infobox(): Locator {
    return this.page.locator('table.infobox').first();
  }

  get contentTables(): Locator {
    return this.page.locator('table.wikitable');
  }

  get tableOfContents(): Locator {
    return this.page.getByRole('navigation', { name: /contents/i });
  }

  async search(term: string): Promise<void> {
    await this.searchInput.click();
    await this.searchInput.fill(term);
    await this.searchInput.press('Enter');
    await expect(this.firstHeading).toBeVisible();
  }

  /** Read a labelled row out of the article infobox. */
  async infoboxValue(label: string | RegExp): Promise<string> {
    const row = this.infobox.locator('tr').filter({ has: this.page.getByText(label) }).first();
    const value = row.locator('td').first();
    await expect(value).toBeVisible();
    return (await value.innerText()).trim();
  }

  /**
   * Read a wikitable into a 2D array of strings.
   * Useful for teaching table assertions without hard-coding volatile data.
   */
  async readTable(index = 0): Promise<string[][]> {
    const table = this.contentTables.nth(index);
    await expect(table).toBeVisible();
    return table.evaluate((el) =>
      Array.from(el.querySelectorAll('tr')).map((tr) =>
        Array.from(tr.querySelectorAll('th,td')).map((cell) =>
          (cell.textContent ?? '').replace(/\s+/g, ' ').trim(),
        ),
      ),
    );
  }
}
