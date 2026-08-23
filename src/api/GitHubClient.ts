import { APIRequestContext, APIResponse } from '@playwright/test';
import { BaseApiClient, ApiCallOptions } from './BaseApiClient';
import {
  Repo,
  RepoSchema,
  Issue,
  IssueListSchema,
  SearchReposSchema,
  RateLimitSchema,
} from './schemas';

/**
 * Client for the GitHub REST API (https://api.github.com).
 *
 * WHY THIS API: it is a genuinely great teaching target because it has
 * everything an enterprise API has and a demo API never does —
 * cursor and page-based pagination, ETags and conditional requests,
 * rate limiting with headers, bearer auth, meaningful 401/403/404
 * distinctions, and a published OpenAPI description you can contract-test
 * against. And it is public, documented and intended for programmatic use.
 *
 * Unauthenticated: 60 requests/hour. With a token: 5,000/hour.
 * Set GITHUB_TOKEN in .env to lift the limit. A read-only, no-scope
 * "fine-grained personal access token" is enough.
 */
export class GitHubClient extends BaseApiClient {
  constructor(request: APIRequestContext) {
    super(request);
  }

  protected get basePath(): string {
    return '';
  }

  async getRepo(owner: string, repo: string): Promise<Repo> {
    const response = await this.get(`/repos/${owner}/${repo}`);
    return this.parse(response, RepoSchema);
  }

  /** Raw response, so tests can assert on headers and status themselves. */
  async getRepoRaw(owner: string, repo: string, options: ApiCallOptions = {}): Promise<APIResponse> {
    return this.request.get(`/repos/${owner}/${repo}`, { headers: options.headers });
  }

  async listIssues(
    owner: string,
    repo: string,
    opts: { state?: 'open' | 'closed' | 'all'; perPage?: number; page?: number } = {},
  ): Promise<Issue[]> {
    const response = await this.get(`/repos/${owner}/${repo}/issues`, {
      params: {
        state: opts.state ?? 'open',
        per_page: opts.perPage ?? 30,
        page: opts.page ?? 1,
      },
    });
    return this.parse(response, IssueListSchema);
  }

  /**
   * Walk RFC 5988 `Link` headers to page through results.
   *
   * Almost every real API paginates, and almost every tutorial suite
   * pretends they do not. This is the single most useful API-testing
   * utility you will write.
   */
  async listAllIssues(
    owner: string,
    repo: string,
    opts: { maxPages?: number; perPage?: number } = {},
  ): Promise<{ issues: Issue[]; pagesFetched: number }> {
    const maxPages = opts.maxPages ?? 3; // be a good citizen
    const perPage = opts.perPage ?? 50;

    const issues: Issue[] = [];
    let page = 1;
    let pagesFetched = 0;

    while (page <= maxPages) {
      const response = await this.get(`/repos/${owner}/${repo}/issues`, {
        params: { state: 'open', per_page: perPage, page },
      });
      const batch = await this.parse(response, IssueListSchema);
      issues.push(...batch);
      pagesFetched += 1;

      if (!GitHubClient.hasNextPage(response) || batch.length === 0) break;
      page += 1;
    }
    return { issues, pagesFetched };
  }

  static hasNextPage(response: APIResponse): boolean {
    const link = response.headers()['link'];
    return typeof link === 'string' && link.includes('rel="next"');
  }

  /** Parse a Link header into { next, prev, first, last } URLs. */
  static parseLinkHeader(response: APIResponse): Record<string, string> {
    const link = response.headers()['link'];
    if (!link) return {};
    return Object.fromEntries(
      link.split(',').map((part) => {
        const [urlPart, relPart] = part.split(';');
        const url = (urlPart ?? '').trim().replace(/^<|>$/g, '');
        const rel = /rel="([^"]+)"/.exec(relPart ?? '')?.[1] ?? '';
        return [rel, url];
      }),
    );
  }

  async searchRepos(query: string, perPage = 5) {
    const response = await this.get('/search/repositories', {
      params: { q: query, per_page: perPage, sort: 'stars', order: 'desc' },
    });
    return this.parse(response, SearchReposSchema);
  }

  async rateLimitStatus() {
    const response = await this.get('/rate_limit');
    return this.parse(response, RateLimitSchema);
  }

  /** POST a GraphQL query. Requires GITHUB_TOKEN — GraphQL has no anon tier. */
  async graphql(query: string, variables: Record<string, unknown> = {}): Promise<APIResponse> {
    return this.request.post('https://api.github.com/graphql', {
      data: { query, variables },
    });
  }
}
