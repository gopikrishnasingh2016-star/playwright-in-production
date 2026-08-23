# 30 Days of Playwright in Production

[![Playwright Suite](https://github.com/gopikrishnasingh/playwright-in-production/actions/workflows/playwright.yml/badge.svg)](https://github.com/gopikrishnasingh/playwright-in-production/actions/workflows/playwright.yml)
[![Playwright](https://img.shields.io/badge/Playwright-1.56-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

**A production-grade Playwright + TypeScript framework, built in public over 30 days, tested exclusively against real live websites and public APIs.**

No `saucedemo`. No `the-internet`. No seeded fixtures pretending to be a shop.
Every test in this repo runs against a site that real people are using right now.

---

## Why no demo sites

Demo sandboxes are built to be automated. That is exactly the problem — they are frictionless in all the ways real applications are not. They have stable IDs, no consent banners, no CDN variance, no rate limits, no A/B tests shipping on a Tuesday afternoon.

So they teach you the syntax of Playwright and none of the judgment.

Testing against live production forces a discipline that transfers directly to client work:

| A demo site lets you write | A live site forces you to write |
|---|---|
| `expect(price).toBe('$29.99')` | `expect(price).toBeGreaterThan(0)` |
| `expect(rows).toHaveCount(5)` | `expect(rows.length).toBeGreaterThanOrEqual(25)` |
| `expect(topStory).toBe('Hello World')` | ranks ascending, titles unique, none empty |
| 16 parallel workers, no consequences | 2 workers, honest User-Agent, rate limits respected |

That second column is what a regression suite looks like when it survives two years without weekly maintenance. It is the whole point of this exercise.

Every target was checked against its `robots.txt` before inclusion, and one strong candidate was dropped because of what I found. See **[docs/RESPONSIBLE-AUTOMATION.md](./docs/RESPONSIBLE-AUTOMATION.md)** — I would rather be judged on that file than on the test count.

---

## The targets

**UI** — real production sites, read-only, robots-respecting:

| Site | What it teaches |
|---|---|
| [playwright.dev](https://playwright.dev) | Lazy-mounted search modal, focus traps, versioned nav, theme switching |
| [news.ycombinator.com](https://news.ycombinator.com) | Table-based legacy markup, pagination, content that changes every few minutes |
| [en.wikipedia.org](https://en.wikipedia.org) | Infoboxes, sortable tables, deep navigation, i18n — the closest public analogue to a data-dense enterprise screen |
| [github.com](https://github.com) | Search with filters, an auth boundary, heavy client-side rendering |

**API** — public, documented, intended for programmatic access:

| API | What it teaches |
|---|---|
| `api.github.com` (REST) | `Link`-header pagination, ETags and conditional requests, rate-limit headers, bearer auth, meaningful 401/403/404 distinctions |
| `api.github.com` (GraphQL) | Query variables, partial-success error envelopes, over-fetching |
| `httpbin.org` | Status codes, redirect chains, auth schemes, gzip, timeout behaviour |
| `en.wikipedia.org/w/api.php` | Continuation tokens, User-Agent policy, envelope validation |

---

## Quick start

```bash
git clone https://github.com/gopikrishnasingh/playwright-in-production.git
cd playwright-in-production

npm ci
npx playwright install --with-deps chromium

# API suite — no browser launched, finishes in seconds
npm run test:api

# UI suite in Chromium
npm run test:ui

# Everything, all browsers
npm run test:all-browsers

# Watch it run, step through, time-travel
npm run test:uimode
npm run report
```

**Optional but recommended:**

```bash
cp .env.example .env
# Add a read-only fine-grained GitHub PAT (no scopes needed for public data).
# Lifts api.github.com from 60 req/hour to 5,000.
```

Run one day's work:

```bash
npm run test:day @day15
```

### First run: expect to adjust a locator or two

These specs target sites I do not control, and those sites ship changes without telling me. A locator that was correct when it was written can be wrong by the time you clone this — that is not a defect in the approach, it is the entire lesson of the project.

So the honest first-run instruction is:

```bash
npm run typecheck        # must be clean
npm run test:api         # fastest signal — no browsers involved
npm run test:ui          # expect to fix a locator here
npx playwright test --ui # then use UI mode's picker to find the right one
```

When a locator has drifted, open UI mode, use the locator picker on the live page, and update the page object. Doing that once teaches you more about resilient locator design than reading about it ever will.

The nightly CI run exists precisely to catch this — see `.github/workflows/playwright.yml`.

---

## Repository structure

```
├── playwright.config.ts       # Projects, retries, artifacts, polite defaults
├── src/
│   ├── pages/                 # Page objects — locators as properties,
│   │   ├── BasePage.ts        #   methods only for real journeys
│   │   ├── PlaywrightDocsPage.ts
│   │   ├── HackerNewsPage.ts
│   │   └── WikipediaPage.ts
│   ├── api/
│   │   ├── BaseApiClient.ts   # Typed wrapper: status asserted, body validated
│   │   ├── GitHubClient.ts    # Pagination, Link headers, rate limits
│   │   └── schemas.ts         # Zod contracts (partial by design)
│   ├── fixtures/
│   │   └── test-fixtures.ts   # Custom fixtures, worker-scoped API context
│   └── utils/
│       └── live-site.ts       # invariant.*, skipIfRateLimited, politeDelay
├── tests/
│   ├── ui/                    # Browser tests
│   ├── api/                   # No browser launched at all
│   └── hybrid/                # API-driven setup, UI-driven assertion
├── docs/
│   ├── 30-DAY-PLAN.md
│   └── RESPONSIBLE-AUTOMATION.md
└── .github/workflows/         # Typecheck → API → UI matrix → publish report
```

---

## Three ideas this repo argues for

**1. Assert invariants, not values.**
On a live site you can never assert "the top story is X". You assert what must be true of *any* correct rendering: non-empty, ordered, unique, within range. Suites written this way stop needing maintenance commits. `src/utils/live-site.ts` makes it a first-class helper rather than a habit you have to remember.

**2. API-driven setup, UI-driven assertion.**
Driving preconditions through the browser is slow, flaky, and tests the same login form four hundred times. Set state over the API; use the browser only for what only a browser can check. On a retail-banking onboarding suite this pattern took a 40-minute run under 10 minutes and removed most of its cross-screen flake. See `tests/hybrid/`.

**3. A page object should be a convenience, not a cage.**
The POM codebases that rot all share one habit: wrapping every Playwright call in a method of its own until the object becomes a second, worse API that hides auto-waiting and produces traces nobody can read. Expose locators as properties. Reserve methods for multi-step journeys with domain meaning. Drop to raw `page` whenever that is simpler.

---

## The 30 days

Full detail in **[docs/30-DAY-PLAN.md](./docs/30-DAY-PLAN.md)**.

| | Days | Theme |
|---|---|---|
| **Week 1** | 0–6 | Foundations — locators, auto-waiting, config, first API test, POM |
| **Week 2** | 7–13 | UI depth — fixtures, flake, data-driven, visual, a11y, interception |
| **Week 3** | 14–20 | API depth — client architecture, pagination, auth, schemas, GraphQL, hybrid, contracts |
| **Week 4** | 21–27 | Production engineering — parallelism, Docker, CI, reporting, debugging, test data, flake hunting |
| **Close** | 28–29 | Cross-browser reality check, and the full framework retrospective |

---

## About

I am **Gopi Krishna Singh**, a test automation lead with 9+ years across banking, cards and loyalty, wealth management, trade finance and healthcare — building UI and API automation frameworks in Playwright and TypeScript, wiring them into Jenkins and Docker, and mentoring teams on automation standards.

This repo is me building in public: the framework I would actually hand to a client team, with the reasoning written down beside it.

**Available for part-time remote consulting** — framework builds, suite rescues, and team enablement.

- Portfolio: [gopikrishnasingh.github.io](https://gopikrishnasingh.github.io)
- LinkedIn: [linkedin.com/in/gopikrishnasingh](https://www.linkedin.com/in/gopikrishnasingh)
- Email: gopikrishnasingh2016@gmail.com

If you spot something I got wrong, open an issue. That is the most useful thing you can do with this repo.

---

*Licensed MIT. Every target site is contactable — if you maintain one and would prefer this suite did not run against it, open an issue and it comes out the same day.*
