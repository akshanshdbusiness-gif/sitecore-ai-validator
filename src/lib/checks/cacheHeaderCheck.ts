import { CheckResult } from './types';
import { classifyRoute, RouteClassification } from './httpPrerenderHeuristic';
import { assertSafeExternalUrl, UnsafeUrlError } from './urlSafety';

export const CACHE_HEADER_CHECK_ID = 'cache-header-check';

interface RouteCheckResult {
  route: string;
  url: string;
  httpStatus: number;
  classification: RouteClassification | 'error';
  cacheHeader?: string;
  prerenderHeader?: string;
  error?: string;
}

async function checkRoute(base: string, route: string): Promise<RouteCheckResult> {
  const url = `${base}${route.startsWith('/') ? route : `/${route}`}`;
  try {
    const res = await fetch(url, { redirect: 'follow', cache: 'no-store' });
    const classified = classifyRoute(res.headers);
    void res.body?.cancel().catch(() => undefined);
    return { route, url, httpStatus: res.status, ...classified };
  } catch (error) {
    return { route, url, httpStatus: 0, classification: 'error', error: (error as Error).message };
  }
}

export async function runCacheHeaderCheck(
  deploymentUrl: string | undefined,
  keyRoutes: string[] | undefined
): Promise<CheckResult> {
  const started = performance.now();

  if (!deploymentUrl || !keyRoutes?.length) {
    return {
      id: CACHE_HEADER_CHECK_ID,
      name: 'Cache header check',
      status: 'skipped',
      summary: 'Skipped — missing deploymentUrl or keyRoutes',
      durationMs: performance.now() - started,
    };
  }

  try {
    await assertSafeExternalUrl(deploymentUrl);
  } catch (error) {
    if (error instanceof UnsafeUrlError) {
      return {
        id: CACHE_HEADER_CHECK_ID,
        name: 'Cache header check',
        status: 'fail',
        summary: `Refusing to fetch deploymentUrl: ${error.message}`,
        durationMs: performance.now() - started,
      };
    }
    throw error;
  }

  const base = deploymentUrl.replace(/\/+$/, '');
  const results = await Promise.all(keyRoutes.map((route) => checkRoute(base, route)));

  const ssrRoutes = results.filter((r) => r.classification === 'ssr');
  const errorRoutes = results.filter((r) => r.classification === 'error');

  const status: CheckResult['status'] =
    errorRoutes.length === results.length
      ? 'fail'
      : ssrRoutes.length > 0
        ? 'fail'
        : results.some((r) => r.classification === 'unknown')
          ? 'warn'
          : 'pass';

  const summary =
    ssrRoutes.length > 0
      ? `${ssrRoutes.length}/${results.length} key route(s) show no cache/prerender signal — likely serving SSR instead of the expected SSG output: ${ssrRoutes
          .map((r) => r.route)
          .join(', ')}`
      : errorRoutes.length > 0
        ? `${errorRoutes.length}/${results.length} key route(s) could not be reached`
        : `All ${results.length} key route(s) show prerendered/cached responses`;

  return {
    id: CACHE_HEADER_CHECK_ID,
    name: 'Cache header check',
    status,
    summary,
    details: { results },
    durationMs: performance.now() - started,
  };
}
