import { z } from 'zod';

/**
 * Zod schemas for the live APIs this repo tests.
 *
 * These are deliberately PARTIAL. We validate the fields we depend on and
 * allow everything else through. A schema that demands the full GitHub
 * response would fail every time GitHub ships a new field — which is a
 * false positive, not a defect. Validate your contract, not their whole API.
 */

export const RepoSchema = z
  .object({
    id: z.number().int().positive(),
    node_id: z.string().min(1),
    name: z.string().min(1),
    full_name: z.string().regex(/^[^/]+\/[^/]+$/, 'expected owner/repo'),
    private: z.boolean(),
    html_url: z.string().url(),
    description: z.string().nullable(),
    fork: z.boolean(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
    stargazers_count: z.number().int().nonnegative(),
    watchers_count: z.number().int().nonnegative(),
    forks_count: z.number().int().nonnegative(),
    open_issues_count: z.number().int().nonnegative(),
    default_branch: z.string().min(1),
    topics: z.array(z.string()).optional(),
    license: z
      .object({ key: z.string(), spdx_id: z.string().nullable() })
      .nullable()
      .optional(),
    owner: z.object({
      login: z.string().min(1),
      id: z.number().int(),
      type: z.enum(['User', 'Organization', 'Bot']),
    }),
  })
  .passthrough();
export type Repo = z.infer<typeof RepoSchema>;

export const IssueSchema = z
  .object({
    id: z.number().int(),
    number: z.number().int().positive(),
    title: z.string().min(1),
    state: z.enum(['open', 'closed']),
    html_url: z.string().url(),
    created_at: z.string().datetime(),
    user: z.object({ login: z.string() }).nullable(),
    labels: z.array(z.union([z.string(), z.object({ name: z.string() }).passthrough()])),
    comments: z.number().int().nonnegative(),
  })
  .passthrough();
export type Issue = z.infer<typeof IssueSchema>;
export const IssueListSchema = z.array(IssueSchema);

export const SearchReposSchema = z
  .object({
    total_count: z.number().int().nonnegative(),
    incomplete_results: z.boolean(),
    items: z.array(RepoSchema),
  })
  .passthrough();

export const RateLimitSchema = z
  .object({
    resources: z
      .object({
        core: z.object({
          limit: z.number().int(),
          remaining: z.number().int(),
          reset: z.number().int(),
        }),
      })
      .passthrough(),
  })
  .passthrough();

/* ------------------------- httpbin.org ------------------------- */

export const HttpbinAnythingSchema = z
  .object({
    args: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
    headers: z.record(z.string(), z.string()),
    method: z.string(),
    url: z.string().url(),
    json: z.unknown().nullable(),
  })
  .passthrough();

export const HttpbinBearerSchema = z.object({
  authenticated: z.literal(true),
  token: z.string().min(1),
});

/* --------------------- MediaWiki search API --------------------- */

export const WikiSearchSchema = z
  .object({
    query: z.object({
      searchinfo: z.object({ totalhits: z.number().int().nonnegative() }),
      search: z.array(
        z
          .object({
            ns: z.number().int(),
            title: z.string().min(1),
            pageid: z.number().int().positive(),
            wordcount: z.number().int().nonnegative(),
            timestamp: z.string(),
          })
          .passthrough(),
      ),
    }),
  })
  .passthrough();

/* ----------------------- GraphQL envelope ----------------------- */

export const GraphQLErrorSchema = z.object({
  message: z.string(),
  type: z.string().optional(),
  path: z.array(z.union([z.string(), z.number()])).optional(),
});

export function graphQLResponse<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: dataSchema.nullable(),
    errors: z.array(GraphQLErrorSchema).optional(),
  });
}

export const RepoGraphQLSchema = z.object({
  repository: z.object({
    name: z.string(),
    stargazerCount: z.number().int().nonnegative(),
    primaryLanguage: z.object({ name: z.string() }).nullable(),
    defaultBranchRef: z.object({ name: z.string() }).nullable(),
  }),
});
