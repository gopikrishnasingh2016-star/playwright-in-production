# The 30-day plan

Day 0 is **Sunday 23 August 2026**. One concept, one working test against a live site, one post — every day for 30 days.

Every day follows the same loop:

1. **Build** — write the test(s) against a real production target (~60–90 min)
2. **Commit** — push to this repo with a `day-NN` tag
3. **Write** — one LinkedIn post covering the concept, the code, and the thing that surprised me

---

## Week 1 — Foundations (Days 0–6)

| Day | Date | Topic | Live target | Ships |
|---|---|---|---|---|
| **0** | Sun 23 Aug | Kickoff: why no demo sites, and what 30 days will produce | playwright.dev | Repo, config, first green test |
| **1** | Mon 24 Aug | Locators that survive a redeploy — role-first, filtering, strict mode | playwright.dev, HN, Wikipedia | `day01-locators.spec.ts` |
| **2** | Tue 25 Aug | Auto-waiting, and why every `sleep` is a bug | news.ycombinator.com | `day02-auto-waiting.spec.ts` |
| **3** | Wed 26 Aug | `playwright.config.ts` line by line — projects, retries, trace, timeouts | all | Annotated config |
| **4** | Thu 27 Aug | Your first API test — no browser, 40x faster | httpbin.org | `day04-httpbin-basics.spec.ts` |
| **5** | Fri 28 Aug | Page Object Model — and the version that ages badly | playwright.dev | `BasePage`, `PlaywrightDocsPage` |
| **6** | Sat 29 Aug | Week 1 recap + the Trace Viewer walkthrough | — | Trace of a real failure |

## Week 2 — UI depth (Days 7–13)

| Day | Date | Topic | Live target | Ships |
|---|---|---|---|---|
| **7** | Sun 30 Aug | Fixtures — the feature Selenium migrants never adopt | all | `test-fixtures.ts` |
| **8** | Mon 31 Aug | Real flake vs. real defects — how to tell them apart | HN | `skipIfRateLimited`, retry policy |
| **9** | Tue 1 Sep | Data-driven done right — one test *per case*, not a for-loop | Wikipedia | `day09-data-driven.spec.ts` |
| **10** | Wed 2 Sep | Visual regression that does not get abandoned in a month | playwright.dev | `day10-visual-regression.spec.ts` |
| **11** | Thu 3 Sep | Accessibility as a CI gate — axe-core, and the baseline trick | playwright.dev, Wikipedia | `day11-accessibility.spec.ts` |
| **12** | Fri 4 Sep | Network interception — testing the states you cannot reproduce | playwright.dev | `day12-network-interception.spec.ts` |
| **13** | Sat 5 Sep | Week 2 recap + first green CI badge | GitHub Actions | `playwright.yml` |

## Week 3 — API depth (Days 14–20)

| Day | Date | Topic | Live target | Ships |
|---|---|---|---|---|
| **14** | Sun 6 Sep | API client architecture — a typed layer, not a `request` free-for-all | api.github.com | `BaseApiClient.ts` |
| **15** | Mon 7 Sep | Pagination and rate limits — what real APIs have and demos do not | api.github.com | `day15-github-pagination.spec.ts` |
| **16** | Tue 8 Sep | Auth patterns and secret hygiene — the mistake I see in every repo | api.github.com | `.env` handling, token scoping |
| **17** | Wed 9 Sep | Schema validation with Zod — catching the change nobody told you about | api.github.com, MediaWiki | `day17-schema-validation.spec.ts` |
| **18** | Thu 10 Sep | GraphQL testing — partial success is not failure | api.github.com/graphql | GraphQL specs |
| **19** | Fri 11 Sep | The hybrid pattern — API-driven setup, UI-driven assertion | GitHub (both surfaces) | `day19-api-plus-ui.spec.ts` |
| **20** | Sat 12 Sep | Contract testing against an OpenAPI spec | GitHub OpenAPI | Contract specs |

## Week 4 — Production engineering (Days 21–27)

| Day | Date | Topic | Live target | Ships |
|---|---|---|---|---|
| **21** | Sun 13 Sep | Parallelism, workers and sharding — and when parallel makes things slower | all | Sharding config |
| **22** | Mon 14 Sep | Docker — the same run on your laptop and in CI | all | `Dockerfile` |
| **23** | Tue 15 Sep | GitHub Actions — matrix builds, artifacts, reports published to Pages | — | Full CI pipeline |
| **24** | Wed 16 Sep | Reporting — HTML, JUnit, and a custom reporter worth writing | — | Custom reporter |
| **25** | Thu 17 Sep | Debugging — Trace Viewer, UI mode, codegen and its limits | all | Debug playbook |
| **26** | Fri 18 Sep | Test data strategy when you do not own the data | live targets | Data patterns |
| **27** | Sat 19 Sep | Flake hunting — quarantine, retry analytics, and proving a test is flaky | CI history | Flake dashboard |

## Close (Days 28–29)

| Day | Date | Topic | Ships |
|---|---|---|---|
| **28** | Sun 20 Sep | Cross-browser and mobile emulation — the reality check | WebKit/Firefox findings |
| **29** | Mon 21 Sep | The finale — the complete framework, what I would do differently, and what is next | Retrospective + v1.0 tag |

---

## Rules I set for myself

1. **Every post ships code.** No "5 tips" posts with nothing behind them.
2. **Every test runs against something real.** If it needs a sandbox, it does not go in.
3. **Publish the failures too.** The day a target changes its markup and breaks my suite is the most useful post of the month.
4. **One concept per day.** Depth beats coverage.
5. **`robots.txt` gets checked before a target is added.** Every time.
