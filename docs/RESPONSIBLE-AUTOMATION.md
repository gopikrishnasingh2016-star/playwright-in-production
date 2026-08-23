# Responsible automation against live sites

This repo deliberately avoids demo sandboxes. That decision comes with obligations, and this document is the part of the project I would want a hiring manager or a client to read first.

## The rules this suite follows

**1. Read-only, always.**
No test in this repo submits a form, votes, posts, logs in, or writes anything to a target system. Every assertion is made against publicly readable content.

**2. robots.txt is checked before a target is added.**
It is not legally binding everywhere, but ignoring it is a statement about how you treat other people's infrastructure. Two examples from building this suite:

- `news.ycombinator.com` sets `Crawl-delay: 30` and disallows `/vote`, `/reply`, `/login`, `/fave`, `/flag`, `/hide`. The HN specs run in serial mode and never touch a disallowed path.
- `world.openfoodfacts.org` disallows `/api` for all user agents. It was on my original shortlist as an e-commerce-shaped target with a great public API — and it came off the list for exactly that reason. Checking took ninety seconds.

**3. We identify ourselves.**
Every request carries a descriptive `User-Agent` naming the project and linking to this repo, so any maintainer seeing our traffic can find out who we are and contact us. Wikimedia asks for this explicitly; it is good manners everywhere.

**4. Concurrency stays low.**
`workers: 2` on CI, `4` locally. A test suite that hammers a free public API with 16 parallel workers is a denial-of-service with better branding.

**5. Rate limits are respected, not fought.**
`skipIfRateLimited()` skips with a visible annotation rather than retrying into a wall. When a target says "slow down", the correct response is to slow down.

**6. No credentials, ever.**
The only optional secret is a read-only GitHub token, kept in a gitignored `.env`, used solely to raise a public rate limit.

## Choosing a live target

A target belongs in this suite if it is:

- **Public** — no login, no paywall, no personal data.
- **Intended for programmatic access**, or at minimum not hostile to it. GitHub's REST API and the MediaWiki API are *designed* to be called by software.
- **Stable in structure, volatile in content.** This is the pedagogical sweet spot: the layout holds still long enough to write a test, and the data changes often enough that you are forced to assert invariants instead of memorised values.
- **Not commercially harmed by our traffic.** A handful of GETs per day against GitHub is noise. The same volume against a small independent shop's checkout is not.

## Targets deliberately excluded

| Target | Why it was rejected |
|---|---|
| Amazon, Flipkart, and similar retail | Terms of service prohibit automated access; aggressive bot detection would make the suite flaky for reasons that teach nothing. |
| Open Food Facts API | `robots.txt` disallows `/api` for all user agents. |
| Any site requiring an account | Credential handling in a public repo is a liability, and a shared account would violate most terms of service. |
| Banking or government portals | Obvious, but worth stating: never point a learning suite at one. |
| `saucedemo`, `the-internet`, `automationexercise` | Not a safety issue — they are just sandboxes built to be automated. They cannot teach you what a real site does when a CDN hiccups, a consent banner appears, or a layout ships on a Tuesday. |

## If a maintainer objects

Every target here is contactable. If anyone responsible for one of these sites would prefer this suite did not run against it, open an issue and it will be removed the same day. That commitment costs nothing and is the reason this approach is defensible at all.

## What this teaches that a sandbox cannot

- Content changes, so you learn to assert invariants — the discipline that stops a real regression suite needing weekly maintenance.
- Networks are slow and occasionally fail, so you learn what genuine flake looks like versus a genuine defect.
- Rate limits exist, so you learn to design a suite that is a good citizen — which is precisely the constraint you hit on your first client integration against a partner API.
- Consent banners, redirects and A/B tests happen to you unannounced, exactly as they do in a real staging environment the week before go-live.
