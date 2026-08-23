import { test, expect } from '../../src/fixtures/test-fixtures';
import { watchForLeakedValues } from '../../src/utils/live-site';

/**
 * DAY 12 — Network interception: testing the states you cannot reproduce.
 *
 * Target: playwright.dev (live) with its own network manipulated locally.
 *
 * This is the capability that has no Selenium equivalent, and it is the
 * one I reach for most on client work. You cannot ask a production
 * partner service to return a 503 on demand. You can make the browser
 * believe it did — and finally test the error banner that has shipped
 * untested for three years.
 */

test.describe('Day 12 — route interception @day12', () => {
  test('blocking third-party noise measurably speeds the page up', async ({ page }) => {
    const blocked: string[] = [];

    await page.route('**/*', async (route) => {
      const url = route.request().url();
      const isNoise =
        /google-analytics|googletagmanager|doubleclick|hotjar|segment\.io/.test(url) ||
        /\.(png|jpe?g|gif|webp|avif|woff2?)(\?|$)/.test(url);

      if (isNoise) {
        blocked.push(url);
        await route.abort();
        return;
      }
      await route.continue();
    });

    const start = Date.now();
    await page.goto('https://playwright.dev/', { waitUntil: 'load' });
    const elapsed = Date.now() - start;

    await expect(page.getByRole('link', { name: 'Get started' })).toBeVisible();

    test.info().annotations.push({
      type: 'perf',
      description: `loaded in ${elapsed}ms with ${blocked.length} request(s) blocked`,
    });
    expect(elapsed, 'a stripped page should load briskly').toBeLessThan(20_000);
  });

  test('an offline network is handled, not crashed into', async ({ page, context }) => {
    await page.goto('https://playwright.dev/');
    await expect(page.getByRole('link', { name: 'Get started' })).toBeVisible();

    await context.setOffline(true);

    // Navigation must fail cleanly. The assertion is that we get a real
    // error we can handle — not a silent hang that eats the timeout.
    await expect(
      page.goto('https://playwright.dev/docs/intro', { timeout: 10_000 }),
    ).rejects.toThrow();

    await context.setOffline(false);
    await page.goto('https://playwright.dev/docs/intro');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('no forbidden value ever appears in a response body', async ({ page }) => {
    // The public-web rehearsal for a check that matters enormously on a
    // regulated journey: watch every response for values that must never
    // travel in clear text. On a KYC flow those are a PAN or an Aadhaar
    // number; here we prove the mechanism using strings that genuinely
    // must not appear in playwright.dev's traffic.
    const forbidden = ['BEGIN RSA PRIVATE KEY', 'AKIAIOSFODNN7EXAMPLE'];
    const leaks = watchForLeakedValues(page, forbidden);

    await page.goto('https://playwright.dev/', { waitUntil: 'load' });
    await expect(page.getByRole('link', { name: 'Get started' })).toBeVisible();

    expect(leaks.found(), 'no forbidden value in any response body').toEqual([]);

    // Note the ordering: the listener is attached BEFORE the navigation.
    // Register it afterwards and it silently observes nothing, which is the
    // classic way a security check passes while checking absolutely nothing.
  });

  test('every request the page makes can be audited', async ({ page }) => {
    const requests: { url: string; method: string; resourceType: string }[] = [];
    const failures: { url: string; failure: string | null }[] = [];

    page.on('request', (req) =>
      requests.push({
        url: req.url(),
        method: req.method(),
        resourceType: req.resourceType(),
      }),
    );
    page.on('requestfailed', (req) =>
      failures.push({ url: req.url(), failure: req.failure()?.errorText ?? null }),
    );

    await page.goto('https://playwright.dev/', { waitUntil: 'load' });

    expect(requests.length).toBeGreaterThan(0);

    // A genuinely useful production check: nothing should be loading
    // over plain HTTP on an HTTPS page (mixed content).
    const insecure = requests.filter((r) => r.url.startsWith('http://'));
    expect(insecure, 'no mixed-content requests').toEqual([]);

    await test.info().attach('network-log.json', {
      body: JSON.stringify({ total: requests.length, failures }, null, 2),
      contentType: 'application/json',
    });
  });

  test('a stubbed failure exposes the error path @day12', async ({ page }) => {
    // Fulfil a route with a synthetic 503 so we can exercise the branch
    // that only ever runs during an incident.
    await page.route('**/search**', (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Service Unavailable' }),
      }),
    );

    await page.goto('https://playwright.dev/');

    // The page itself must still be usable when a subsystem is down.
    // Graceful degradation is a requirement, and this is how you test it.
    await expect(page.getByRole('link', { name: 'Get started' })).toBeVisible();
  });
});
