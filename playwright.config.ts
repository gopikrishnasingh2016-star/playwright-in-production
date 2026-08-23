import { defineConfig, devices } from '@playwright/test';
import { USER_AGENT, githubHeaders, GITHUB_API } from './src/utils/constants';

/**
 * Playwright configuration for "30 Days of Playwright in Production".
 *
 * Every target in this repo is a REAL, live production website or public API.
 * There are no demo sandboxes, no seeded fixtures pretending to be a shop.
 *
 * Because these are other people's servers, this config is deliberately
 * conservative: low worker counts against rate-limited hosts, an honest
 * User-Agent, and read-only traffic. See docs/RESPONSIBLE-AUTOMATION.md.
 */

const IS_CI = !!(
  globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  }
).process?.env?.CI;

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',

  /* Fail the build on CI if someone committed test.only */
  forbidOnly: IS_CI,

  /* Live sites have real latency and occasional blips. Retry on CI only,
     so that locally a failure is a failure and you actually look at it. */
  retries: IS_CI ? 2 : 0,

  /* Keep concurrency low: we are guests on someone else's infrastructure. */
  workers: IS_CI ? 2 : 4,

  /* A test that runs against the open internet needs more headroom than
     one hitting localhost — but not so much that a hang goes unnoticed. */
  timeout: 45_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      /* Real sites render fonts and images slightly differently across
         runs. A small tolerance stops visual tests from crying wolf. */
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    },
  },

  /* Fully parallel within a file, unless a spec opts out with
     test.describe.configure({ mode: 'serial' }). */
  fullyParallel: true,

  reporter: IS_CI
    ? [
        ['list'],
        ['html', { open: 'never', outputFolder: 'playwright-report' }],
        ['junit', { outputFile: 'test-results/junit.xml' }],
        ['github'],
      ]
    : [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],

  use: {
    /* Artifacts that make a failure diagnosable without re-running it. */
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: IS_CI ? 'retain-on-failure' : 'off',

    actionTimeout: 15_000,
    navigationTimeout: 30_000,

    userAgent: USER_AGENT,
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
    },

    /* Real sites are HTTPS with valid certs. Do not weaken this. */
    ignoreHTTPSErrors: false,
  },

  projects: [
    /* ---------------- UI projects ---------------- */
    {
      name: 'chromium',
      testDir: './tests/ui',
      use: { ...devices['Desktop Chrome'], userAgent: USER_AGENT },
    },
    {
      name: 'firefox',
      testDir: './tests/ui',
      use: { ...devices['Desktop Firefox'], userAgent: USER_AGENT },
    },
    {
      name: 'webkit',
      testDir: './tests/ui',
      use: { ...devices['Desktop Safari'], userAgent: USER_AGENT },
    },
    {
      name: 'mobile-chrome',
      testDir: './tests/ui',
      use: { ...devices['Pixel 7'] },
    },

    /* ---------------- API project ----------------
       No browser is launched here at all. The `request` fixture talks
       straight to the network, which is why API runs are ~10x faster. */
    {
      name: 'api',
      testDir: './tests/api',
      use: {
        baseURL: GITHUB_API,
        extraHTTPHeaders: githubHeaders(),
      },
    },

    /* ---------------- Hybrid (API + UI) ---------------- */
    {
      name: 'hybrid',
      testDir: './tests/hybrid',
      use: { ...devices['Desktop Chrome'], userAgent: USER_AGENT },
    },
  ],
});
