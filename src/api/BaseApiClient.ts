import { APIRequestContext, APIResponse, expect } from '@playwright/test';
import { z, ZodType } from 'zod';

export interface ApiCallOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  data?: unknown;
  /** Expected status. Defaults to "any 2xx". */
  expectStatus?: number;
}

/**
 * A thin, typed wrapper over Playwright's APIRequestContext.
 *
 * The point of this layer is NOT to hide `request`. It is to make three
 * things impossible to forget:
 *   1. Every response gets its status asserted (silent 500s are the
 *      number one cause of "green suite, broken product").
 *   2. Every response body gets validated against a schema, so a shape
 *      change upstream fails loudly instead of surfacing as `undefined`.
 *   3. Rate-limit headers get surfaced, so a suite that starts getting
 *      throttled tells you, rather than going mysteriously red.
 */
export abstract class BaseApiClient {
  protected constructor(protected readonly request: APIRequestContext) {}

  protected abstract get basePath(): string;

  protected buildPath(endpoint: string, params?: ApiCallOptions['params']): string {
    const path = `${this.basePath}${endpoint}`;
    if (!params || Object.keys(params).length === 0) return path;
    const qs = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)]),
    ).toString();
    return `${path}?${qs}`;
  }

  protected async get(endpoint: string, options: ApiCallOptions = {}): Promise<APIResponse> {
    const response = await this.request.get(this.buildPath(endpoint, options.params), {
      headers: options.headers,
    });
    await this.assertStatus(response, options.expectStatus);
    return response;
  }

  protected async post(endpoint: string, options: ApiCallOptions = {}): Promise<APIResponse> {
    const response = await this.request.post(this.buildPath(endpoint, options.params), {
      headers: options.headers,
      data: options.data,
    });
    await this.assertStatus(response, options.expectStatus);
    return response;
  }

  private async assertStatus(response: APIResponse, expected?: number): Promise<void> {
    if (expected !== undefined) {
      // Attach the body on mismatch — debugging a bare "expected 200, got 422"
      // in CI at 2am is exactly the pain this avoids.
      if (response.status() !== expected) {
        const body = await response.text().catch(() => '<unreadable>');
        expect(
          response.status(),
          `Expected ${expected} from ${response.url()} but got ${response.status()}.\nBody: ${body.slice(0, 800)}`,
        ).toBe(expected);
      }
      return;
    }
    expect(response.ok(), `Expected a 2xx from ${response.url()}, got ${response.status()}`).toBe(true);
  }

  /**
   * Parse a response body and validate it against a Zod schema.
   * Returns a fully typed object — no `any`, no optional-chaining guesswork.
   */
  protected async parse<T>(response: APIResponse, schema: ZodType<T>): Promise<T> {
    const json: unknown = await response.json();
    const result = schema.safeParse(json);
    if (!result.success) {
      const issues = result.error.issues
        .map((i) => `  • ${i.path.join('.') || '<root>'}: ${i.message}`)
        .join('\n');
      throw new Error(
        `Schema validation failed for ${response.url()}\n${issues}\n\n` +
          `This usually means the API changed shape. That is a real finding, not a test bug.`,
      );
    }
    return result.data;
  }

  /** Surface rate-limit state so a throttled suite explains itself. */
  static rateLimit(response: APIResponse): {
    limit: number | null;
    remaining: number | null;
    resetAt: Date | null;
  } {
    const h = response.headers();
    const num = (v?: string) => (v === undefined ? null : Number.parseInt(v, 10));
    const reset = num(h['x-ratelimit-reset']);
    return {
      limit: num(h['x-ratelimit-limit']),
      remaining: num(h['x-ratelimit-remaining']),
      resetAt: reset === null ? null : new Date(reset * 1000),
    };
  }
}

/** Re-export so specs only import from one place. */
export { z };
