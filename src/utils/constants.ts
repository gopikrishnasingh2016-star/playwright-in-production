import * as dotenv from 'dotenv';
import * as path from 'path';

/**
 * Shared constants. Kept in its own module so both playwright.config.ts and
 * the fixtures can import it without either importing the other.
 *
 * .env is loaded HERE rather than in playwright.config.ts. ES import
 * hoisting means this module is evaluated before the config body runs, so
 * loading it anywhere else would leave USER_AGENT reading an empty env.
 * A subtle ordering bug, and a good one to have hit once.
 */
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Identify ourselves honestly to every host we touch.
 *
 * Wikimedia's API policy requires a descriptive User-Agent that a
 * maintainer could use to contact you. It is good practice everywhere —
 * if our traffic ever causes someone a problem, they can find us.
 */
export const USER_AGENT =
  process.env.PW_USER_AGENT ??
  'playwright-in-production/1.0 (+https://github.com/gopikrishnasingh/playwright-in-production) learning-suite';

/** Shared headers for every GitHub REST call. */
export function githubHeaders(): Record<string, string> {
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': USER_AGENT,
    ...(process.env.GITHUB_TOKEN
      ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
      : {}),
  };
}

export const GITHUB_API = 'https://api.github.com';
export const HTTPBIN = 'https://httpbin.org';
