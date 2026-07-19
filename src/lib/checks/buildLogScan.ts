import { CheckResult, VercelConfig } from './types';
import { getLatestDeployment, getDeploymentEvents } from './vercelClient';

export const BUILD_LOG_SCAN_CHECK_ID = 'build-log-scan';

export interface LogPattern {
  pattern: RegExp;
  severity: 'fail' | 'warn';
  message: string;
}

/**
 * `error occurred while fetching static paths` is the literal console.log
 * text this repo's own getStaticPaths implementation emits when the
 * Experience Edge fetch throws and is swallowed — see
 * examples/basic-nextjs-pages-router/src/pages/[[...path]].tsx. It's the
 * clearest possible build-log signature of the failure this app exists to
 * catch, so it's checked for verbatim ahead of the generic patterns.
 *
 * Exported (not just used internally) so the /docs page can render this
 * exact list instead of a hand-copied one that can drift out of sync.
 */
export const LOG_PATTERNS: LogPattern[] = [
  {
    pattern: /error occurred while fetching static paths/i,
    severity: 'fail',
    message:
      'Build log shows the static-paths fetch failed and was swallowed — the exact silent-SSR-fallback failure mode',
  },
  {
    pattern: /getStaticPaths\)?\s+(returned|resolved)\s+(an\s+)?(empty|no)\s+(list|array|paths)/i,
    severity: 'fail',
    message: 'getStaticPaths/generateStaticParams returned no paths',
  },
  {
    pattern: /RangeError: (Site|The list of (sites|languages))/i,
    severity: 'fail',
    message: 'Sitecore SDK threw while resolving sites/routes during the build',
  },
  {
    pattern: /ENOTFOUND|ECONNREFUSED|ETIMEDOUT|fetch failed/i,
    severity: 'warn',
    message: 'Network error during build — possible failed fetch to Experience Edge',
  },
];

const ANSI_ESCAPE_PATTERN = /\x1b\[[0-9;]*m/g;

function stripAnsiCodes(text: string): string {
  return text.replace(ANSI_ESCAPE_PATTERN, '');
}

export type RouteRenderType = 'static' | 'dynamic' | 'other';

export interface RouteRenderEntry {
  route: string;
  renderType: RouteRenderType;
  symbol: string;
}

const ROUTE_SYMBOL_TYPES: Record<string, RouteRenderType> = {
  '○': 'static',
  'ƒ': 'dynamic',
  '●': 'static', // Pages Router "automatically rendered as static HTML"
  '◐': 'other', // Partial Prerendering
};

/**
 * Parses Next.js's own build-output route table, e.g.:
 *   ┌ ○ /_not-found                            995 B         103 kB
 *   ├ ƒ /api/checks                            127 B         103 kB
 *   └ ○ /validate
 * ○ = static (prerendered), ƒ = dynamic (server-rendered on demand). This is
 * a more direct signal than any regex pattern above — Next.js is stating,
 * per route, whether it actually got prerendered, rather than us inferring
 * it from an error message.
 */
export function parseRouteRenderTable(logText: string): RouteRenderEntry[] {
  const entries: RouteRenderEntry[] = [];
  const lineRegex = /[○ƒ●◐]\s+(\/\S*)/g;
  let match: RegExpExecArray | null;
  while ((match = lineRegex.exec(logText)) !== null) {
    const symbol = match[0][0];
    entries.push({ route: match[1], renderType: ROUTE_SYMBOL_TYPES[symbol] ?? 'other', symbol });
  }
  return entries;
}

export async function runBuildLogScanCheck(config: VercelConfig | undefined): Promise<CheckResult> {
  const started = performance.now();

  if (!config?.token || !config.projectId) {
    return {
      id: BUILD_LOG_SCAN_CHECK_ID,
      name: 'Build log scan',
      status: 'skipped',
      summary: 'Skipped — missing vercel config (token, projectId)',
      durationMs: performance.now() - started,
    };
  }

  try {
    let deploymentId = config.deploymentId;
    let deploymentUrl: string | undefined;
    if (!deploymentId) {
      const latest = await getLatestDeployment(config);
      if (!latest) {
        return {
          id: BUILD_LOG_SCAN_CHECK_ID,
          name: 'Build log scan',
          status: 'fail',
          summary: `No production deployments found for project ${config.projectId}`,
          durationMs: performance.now() - started,
        };
      }
      deploymentId = latest.uid;
      deploymentUrl = latest.url;
    }

    const events = await getDeploymentEvents(deploymentId, config);
    const logText = stripAnsiCodes(events.map((event) => event.payload?.text ?? '').join('\n'));

    const matches = LOG_PATTERNS.flatMap(({ pattern, severity, message }) => {
      const found = logText.match(pattern);
      return found ? [{ severity, message, matchedText: found[0] }] : [];
    });

    const routeTable = parseRouteRenderTable(logText);
    const dynamicCatchAllRoutes = routeTable.filter(
      (r) => r.renderType === 'dynamic' && r.route.includes('[[...')
    );
    if (dynamicCatchAllRoutes.length > 0) {
      matches.push({
        severity: 'fail',
        message: `Build output's own route table shows the catch-all route rendered dynamically (ƒ) instead of statically (○) — the most direct possible signal that SSG did not happen: ${dynamicCatchAllRoutes
          .map((r) => r.route)
          .join(', ')}`,
        matchedText: dynamicCatchAllRoutes.map((r) => `ƒ ${r.route}`).join('; '),
      });
    }

    const status: CheckResult['status'] = matches.some((m) => m.severity === 'fail')
      ? 'fail'
      : matches.length
        ? 'warn'
        : 'pass';

    const summary =
      matches.length === 0
        ? `Scanned ${events.length} log line(s) from deployment ${deploymentId}, no known-bad patterns found`
        : `Scanned ${events.length} log line(s) from deployment ${deploymentId}, found ${matches.length} issue(s): ${matches
            .map((m) => m.message)
            .join('; ')}`;

    return {
      id: BUILD_LOG_SCAN_CHECK_ID,
      name: 'Build log scan',
      status,
      summary,
      details: { deploymentId, deploymentUrl, matches, eventCount: events.length, routeTable },
      durationMs: performance.now() - started,
    };
  } catch (error) {
    return {
      id: BUILD_LOG_SCAN_CHECK_ID,
      name: 'Build log scan',
      status: 'fail',
      summary: `Failed to scan build logs: ${(error as Error).message}`,
      durationMs: performance.now() - started,
    };
  }
}
