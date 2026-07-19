import { SitecoreEdgeConfig } from './types';
import { assertSafeSitecoreEdgeUrl, UnsafeUrlError } from './urlSafety';

export const SITECORE_EDGE_URL_DEFAULT = 'https://edge-platform.sitecorecloud.io';

/**
 * Same query the Sitecore Content SDK's SitePathService sends at build time
 * (getPagePaths / getAppRouterStaticParams) to resolve SSG paths. Reusing it
 * here means the reachability check exercises the exact call whose failure
 * causes the silent SSR fallback this app exists to catch.
 * @see @sitecore-content-sdk/core dist/cjs/site/sitepath-service.js
 */
export const SITE_PATHS_QUERY = /* GraphQL */ `
  query DefaultSitemapQuery(
    $siteName: String!
    $language: String!
    $pageSize: Int = 10
    $after: String
  ) {
    site {
      siteInfo(site: $siteName) {
        routes(language: $language, first: $pageSize, after: $after) {
          total
          pageInfo {
            endCursor
            hasNext
          }
          results {
            path: routePath
          }
        }
      }
    }
  }
`;

export function getEdgeGraphQLUrl(config: SitecoreEdgeConfig): string {
  const base = (config.edgeUrl || SITECORE_EDGE_URL_DEFAULT).replace(/\/+$/, '');
  return `${base}/v1/content/api/graphql/v1?sitecoreContextId=${encodeURIComponent(
    config.contextId
  )}`;
}

export interface EdgeGraphQLResult<T> {
  ok: boolean;
  status: number;
  durationMs: number;
  data?: T;
  errors?: unknown[];
  networkError?: string;
}

export async function queryEdge<T = unknown>(
  config: SitecoreEdgeConfig,
  query: string,
  variables: Record<string, unknown>,
  timeoutMs = 5000
): Promise<EdgeGraphQLResult<T>> {
  const url = getEdgeGraphQLUrl(config);
  const started = performance.now();

  // config.edgeUrl is client-suppliable but only ever meant to point at a
  // real Sitecore Edge region — without this, it's an SSRF primitive since
  // it fully determines the fetch target's scheme+host.
  try {
    await assertSafeSitecoreEdgeUrl(url);
  } catch (error) {
    if (error instanceof UnsafeUrlError) {
      return { ok: false, status: 0, durationMs: performance.now() - started, networkError: error.message };
    }
    throw error;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });
    const durationMs = performance.now() - started;
    const json = (await response.json().catch(() => undefined)) as
      | { data?: T; errors?: unknown[] }
      | undefined;

    return {
      ok: response.ok && !json?.errors?.length,
      status: response.status,
      durationMs,
      data: json?.data,
      errors: json?.errors,
    };
  } catch (error) {
    const durationMs = performance.now() - started;
    const isAbort = error instanceof Error && error.name === 'AbortError';
    return {
      ok: false,
      status: 0,
      durationMs,
      networkError: isAbort ? `Timed out after ${timeoutMs}ms` : (error as Error).message,
    };
  } finally {
    clearTimeout(timer);
  }
}

interface SiteRoutesResponse {
  site?: {
    siteInfo?: {
      routes?: {
        total: number;
        pageInfo: { endCursor: string | null; hasNext: boolean };
        results: { path: string }[];
      };
    };
  };
}

/**
 * Fetches up to `limit` route paths for a site/language, paging through the
 * same GraphQL connection the SDK uses. Used to build the "expected routes"
 * set for the route coverage check.
 */
export async function fetchSiteRoutes(
  config: SitecoreEdgeConfig,
  limit: number,
  timeoutMs = 8000
): Promise<{ paths: string[]; error?: string }> {
  const paths: string[] = [];
  let after: string | undefined;
  let hasNext = true;

  while (hasNext && paths.length < limit) {
    const pageSize = Math.min(50, limit - paths.length);
    const result = await queryEdge<SiteRoutesResponse>(
      config,
      SITE_PATHS_QUERY,
      { siteName: config.siteName, language: config.language, pageSize, after },
      timeoutMs
    );

    if (!result.ok) {
      return {
        paths,
        error:
          result.networkError ||
          `Edge responded ${result.status}${
            result.errors ? `: ${JSON.stringify(result.errors)}` : ''
          }`,
      };
    }

    const routes = result.data?.site?.siteInfo?.routes;
    if (!routes) {
      return { paths, error: `Site "${config.siteName}" not found or has no routes` };
    }

    paths.push(...routes.results.map((r) => r.path));
    hasNext = routes.pageInfo.hasNext;
    after = routes.pageInfo.endCursor ?? undefined;
  }

  return { paths };
}
