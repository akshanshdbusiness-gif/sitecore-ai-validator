import { CheckResult, SitecoreEdgeConfig } from './types';
import { fetchSiteRoutes } from './sitecoreEdgeClient';
import { classifyRoute, RouteClassification } from './httpPrerenderHeuristic';
import { assertSafeExternalUrl, UnsafeUrlError } from './urlSafety';

export const ROUTE_COVERAGE_CHECK_ID = 'route-coverage';

const DEFAULT_ROUTE_LIMIT = 25;
const CONCURRENCY = 5;

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = index++;
      results[current] = await fn(items[current]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

interface RouteResult {
  path: string;
  httpStatus: number;
  classification: RouteClassification | 'error';
  error?: string;
}

/**
 * Fetches the site's expected route list straight from Experience Edge (the
 * same source getStaticPaths/generateStaticParams reads from), then samples
 * each expected route against the live deployment. Routes that come back
 * looking like SSR instead of prerendered are exactly the pages that would
 * have gone through generateStaticParams but silently didn't.
 */
export async function runRouteCoverageCheck(
  deploymentUrl: string | undefined,
  sitecoreEdge: SitecoreEdgeConfig | undefined,
  limit: number = DEFAULT_ROUTE_LIMIT
): Promise<CheckResult> {
  const started = performance.now();

  if (!deploymentUrl || !sitecoreEdge?.contextId || !sitecoreEdge.siteName || !sitecoreEdge.language) {
    return {
      id: ROUTE_COVERAGE_CHECK_ID,
      name: 'Route coverage (prerendered path diff)',
      status: 'skipped',
      summary: 'Skipped — missing deploymentUrl or sitecoreEdge config',
      durationMs: performance.now() - started,
    };
  }

  try {
    await assertSafeExternalUrl(deploymentUrl);
  } catch (err) {
    if (err instanceof UnsafeUrlError) {
      return {
        id: ROUTE_COVERAGE_CHECK_ID,
        name: 'Route coverage (prerendered path diff)',
        status: 'fail',
        summary: `Refusing to fetch deploymentUrl: ${err.message}`,
        durationMs: performance.now() - started,
      };
    }
    throw err;
  }

  const { paths, error } = await fetchSiteRoutes(sitecoreEdge, limit);

  if (paths.length === 0) {
    return {
      id: ROUTE_COVERAGE_CHECK_ID,
      name: 'Route coverage (prerendered path diff)',
      status: error ? 'fail' : 'warn',
      summary: error
        ? `Could not fetch the expected route list from Experience Edge: ${error}`
        : `Site "${sitecoreEdge.siteName}" has no routes to check`,
      durationMs: performance.now() - started,
    };
  }

  const base = deploymentUrl.replace(/\/+$/, '');
  const results = await mapWithConcurrency(paths, CONCURRENCY, async (routePath): Promise<RouteResult> => {
    const normalizedPath = routePath.startsWith('/') ? routePath : `/${routePath}`;
    const url = `${base}${normalizedPath}`;
    try {
      const res = await fetch(url, { redirect: 'follow', cache: 'no-store' });
      const classified = classifyRoute(res.headers);
      void res.body?.cancel().catch(() => undefined);
      return { path: normalizedPath, httpStatus: res.status, classification: classified.classification };
    } catch (err) {
      return {
        path: normalizedPath,
        httpStatus: 0,
        classification: 'error',
        error: (err as Error).message,
      };
    }
  });

  const missing = results.filter((r) => r.classification === 'ssr' || r.classification === 'error');
  const status: CheckResult['status'] =
    missing.length === 0 ? 'pass' : missing.length / results.length > 0.2 ? 'fail' : 'warn';

  const summary = error
    ? `Checked ${results.length}/${paths.length} expected route(s) (Edge pagination stopped early: ${error}); ${missing.length} not prerendered`
    : missing.length === 0
      ? `All ${results.length} expected route(s) sampled from Experience Edge are prerendered`
      : `${missing.length}/${results.length} expected route(s) are NOT prerendered — likely silent SSR fallback: ${missing
          .slice(0, 10)
          .map((r) => r.path)
          .join(', ')}${missing.length > 10 ? ', …' : ''}`;

  return {
    id: ROUTE_COVERAGE_CHECK_ID,
    name: 'Route coverage (prerendered path diff)',
    status,
    summary,
    details: { expectedRouteCount: paths.length, checked: results.length, results },
    durationMs: performance.now() - started,
  };
}
