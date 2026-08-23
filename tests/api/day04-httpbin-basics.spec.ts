import { test, expect } from '@playwright/test';
import { HttpbinAnythingSchema, HttpbinBearerSchema } from '../../src/api/schemas';

/**
 * DAY 4 — API testing without a browser.
 *
 * Target: https://httpbin.org — a real, live HTTP inspection service.
 *
 * This project's `api` runs launch NO browser at all. That is not a small
 * optimisation: a UI test that logs in to check a 401 takes ~8 seconds;
 * the same check here takes ~200ms and cannot flake on a render.
 *
 * Everything below is a contract that a real service must honour, written
 * the way I would write it against a client's payments or onboarding API.
 */

const BASE = 'https://httpbin.org';

test.describe('Day 4 — HTTP fundamentals @day4', () => {
  test('status codes come back exactly as requested', async ({ request }) => {
    for (const code of [200, 201, 204, 301, 400, 401, 404, 418, 500] as const) {
      const response = await request.get(`${BASE}/status/${code}`, {
        maxRedirects: 0, // do not follow, we are asserting the code itself
      });
      expect(response.status(), `GET /status/${code}`).toBe(code);
    }
  });

  test('query parameters and JSON bodies round-trip intact', async ({ request }) => {
    const payload = { suite: 'playwright-in-production', day: 4, live: true };

    const response = await request.post(`${BASE}/anything`, {
      params: { env: 'ci', owner: 'gopi' },
      data: payload,
    });

    expect(response.ok()).toBe(true);
    const body = HttpbinAnythingSchema.parse(await response.json());

    expect(body.method).toBe('POST');
    expect(body.args).toMatchObject({ env: 'ci', owner: 'gopi' });
    expect(body.json).toEqual(payload);
  });

  test('bearer auth is accepted and anonymous access is refused', async ({ request }) => {
    const token = 'not-a-real-secret-just-an-echo-service';

    const authed = await request.get(`${BASE}/bearer`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(authed.status()).toBe(200);
    const body = HttpbinBearerSchema.parse(await authed.json());
    expect(body.token).toBe(token);

    const anonymous = await request.get(`${BASE}/bearer`);
    expect(anonymous.status(), 'no token must be rejected').toBe(401);
  });

  test('redirects are followed by default and can be pinned when they matter', async ({
    request,
  }) => {
    const followed = await request.get(`${BASE}/redirect/2`);
    expect(followed.status()).toBe(200);
    expect(followed.url()).toContain('/get');

    const notFollowed = await request.get(`${BASE}/redirect/2`, { maxRedirects: 0 });
    expect(notFollowed.status(), 'the first hop is a 302').toBe(302);
  });

  test('a slow endpoint fails the test rather than hanging the suite', async ({ request }) => {
    // Ten-second delay against a five-second budget: this MUST throw.
    // Testing your own timeout handling is a step almost everyone skips,
    // and it is what stops one wedged endpoint stalling a whole pipeline.
    await expect(
      request.get(`${BASE}/delay/10`, { timeout: 5_000 }),
    ).rejects.toThrow();
  });

  test('gzip responses are transparently decoded', async ({ request }) => {
    const response = await request.get(`${BASE}/gzip`);
    expect(response.ok()).toBe(true);
    const body = (await response.json()) as { gzipped?: boolean };
    expect(body.gzipped).toBe(true);
  });
});
