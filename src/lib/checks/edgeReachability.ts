import { CheckResult, SitecoreEdgeConfig } from './types';
import { queryEdge, SITE_PATHS_QUERY } from './sitecoreEdgeClient';

/**
 * A build-time getStaticPaths/generateStaticParams fetch to Experience Edge
 * that's slow but eventually succeeds still risks tripping the build's own
 * fetch timeout and silently degrading to empty paths. There's no single
 * official number for that budget, so this is a conservative heuristic, not
 * a hard platform limit.
 */
const SLOW_RESPONSE_THRESHOLD_MS = 2000;

export const EDGE_REACHABILITY_CHECK_ID = 'edge-reachability';

export async function runEdgeReachabilityCheck(
  config: SitecoreEdgeConfig | undefined
): Promise<CheckResult> {
  const started = performance.now();

  if (!config?.contextId || !config.siteName || !config.language) {
    return {
      id: EDGE_REACHABILITY_CHECK_ID,
      name: 'Experience Edge reachability',
      status: 'skipped',
      summary: 'Skipped — missing sitecoreEdge config (contextId, siteName, language)',
      durationMs: performance.now() - started,
    };
  }

  const result = await queryEdge(
    config,
    SITE_PATHS_QUERY,
    { siteName: config.siteName, language: config.language, pageSize: 1 },
    5000
  );

  if (!result.ok) {
    return {
      id: EDGE_REACHABILITY_CHECK_ID,
      name: 'Experience Edge reachability',
      status: 'fail',
      summary: result.networkError
        ? `Experience Edge unreachable: ${result.networkError}. This is the exact call getStaticPaths/generateStaticParams makes — if it fails at build time, SSG silently falls back to empty paths.`
        : `Experience Edge returned an error (HTTP ${result.status}). This would make the build's static-paths fetch fail too.`,
      details: { httpStatus: result.status, errors: result.errors, durationMs: result.durationMs },
      durationMs: performance.now() - started,
    };
  }

  const status = result.durationMs > SLOW_RESPONSE_THRESHOLD_MS ? 'warn' : 'pass';
  return {
    id: EDGE_REACHABILITY_CHECK_ID,
    name: 'Experience Edge reachability',
    status,
    summary:
      status === 'warn'
        ? `Experience Edge responded in ${Math.round(result.durationMs)}ms — slow enough to risk timing out the build's static-paths fetch`
        : `Experience Edge responded in ${Math.round(result.durationMs)}ms`,
    details: { durationMs: result.durationMs },
    durationMs: performance.now() - started,
  };
}
