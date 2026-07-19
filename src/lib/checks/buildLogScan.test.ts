import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseRouteRenderTable, runBuildLogScanCheck } from './buildLogScan';
import type { VercelConfig } from './types';

// The exact route table format Next.js prints in `next build` output,
// reproduced from a real build log.
const REAL_ROUTE_TABLE = `
Route (app)                                 Size  First Load JS
┌ ○ /_not-found                            995 B         103 kB
├ ƒ /api/checks                            127 B         103 kB
├ ○ /dashboard-widget-extension          1.21 kB         113 kB
├ ○ /fullscreen-extension                1.17 kB         113 kB
├ ○ /standalone-extension                1.16 kB         113 kB
└ ○ /validate
`;

const DYNAMIC_CATCH_ALL_ROUTE_TABLE = `
Route (app)                                 Size  First Load JS
┌ ○ /_not-found                            995 B         103 kB
└ ƒ /[site]/[locale]/[[...path]]           2.1 kB         115 kB
`;

const STATIC_CATCH_ALL_ROUTE_TABLE = `
Route (app)                                 Size  First Load JS
┌ ○ /_not-found                            995 B         103 kB
└ ○ /[site]/[locale]/[[...path]]           2.1 kB         115 kB
`;

const CONFIG: VercelConfig = { token: 'test-token', projectId: 'prj_123' };

function ndjson(lines: string[]): string {
  return lines.map((text) => JSON.stringify({ type: 'stdout', created: 1, payload: { text } })).join('\n');
}

function mockVercelApi(logLines: string[], deployments: unknown[] = [{ uid: 'dpl_1', url: 'x.vercel.app' }]) {
  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = input.toString();
    if (url.includes('/v7/deployments')) {
      return new Response(JSON.stringify({ deployments }), { status: 200 });
    }
    if (url.includes('/events')) {
      return new Response(ndjson(logLines), { status: 200 });
    }
    throw new Error(`Unexpected fetch in test: ${url}`);
  }) as typeof fetch;
}

describe('runBuildLogScanCheck', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('skips when vercel config is missing', async () => {
    const result = await runBuildLogScanCheck(undefined);
    expect(result.status).toBe('skipped');
  });

  it('fails when the project has no deployments', async () => {
    mockVercelApi([], []);
    const result = await runBuildLogScanCheck(CONFIG);
    expect(result.status).toBe('fail');
    expect(result.summary).toContain('No production deployments');
  });

  it('passes clean logs with no known-bad patterns', async () => {
    mockVercelApi(['Compiling...', 'Build completed', '○ (Static) prerendered as static content']);
    const result = await runBuildLogScanCheck(CONFIG);
    expect(result.status).toBe('pass');
  });

  it('fails on the literal swallowed-static-paths-error signature', async () => {
    mockVercelApi(['Error occurred while fetching static paths', 'TypeError: fetch failed']);
    const result = await runBuildLogScanCheck(CONFIG);
    expect(result.status).toBe('fail');
    expect(result.summary).toContain('silent-SSR-fallback');
  });

  it('warns (not fails) on a bare network-error signature', async () => {
    mockVercelApi(['request to https://edge-platform.sitecorecloud.io failed, reason: ECONNREFUSED']);
    const result = await runBuildLogScanCheck(CONFIG);
    expect(result.status).toBe('warn');
  });

  it('uses an explicit deploymentId without calling the list-deployments endpoint', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();
      if (url.includes('/v7/deployments')) throw new Error('should not list deployments');
      return new Response(ndjson(['all clean']), { status: 200 });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await runBuildLogScanCheck({ ...CONFIG, deploymentId: 'dpl_explicit' });
    expect(result.status).toBe('pass');
    expect(String(fetchMock.mock.calls[0][0])).toContain('dpl_explicit');
  });

  it('fails when the build output shows the catch-all route rendered dynamically', async () => {
    mockVercelApi([DYNAMIC_CATCH_ALL_ROUTE_TABLE]);
    const result = await runBuildLogScanCheck(CONFIG);
    expect(result.status).toBe('fail');
    expect(result.summary).toContain('rendered dynamically');
  });

  it('passes when the build output shows the catch-all route rendered statically', async () => {
    mockVercelApi([STATIC_CATCH_ALL_ROUTE_TABLE]);
    const result = await runBuildLogScanCheck(CONFIG);
    expect(result.status).toBe('pass');
  });

  it('exposes the full parsed route table in details regardless of status', async () => {
    mockVercelApi([REAL_ROUTE_TABLE]);
    const result = await runBuildLogScanCheck(CONFIG);
    expect(result.details?.routeTable).toEqual(
      expect.arrayContaining([{ route: '/api/checks', renderType: 'dynamic', symbol: 'ƒ' }])
    );
  });

  it('strips ANSI color codes before pattern matching', async () => {
    mockVercelApi(['\x1b[32m\x1b[1m✓\x1b[22m\x1b[39m Compiling...', 'Build completed']);
    const result = await runBuildLogScanCheck(CONFIG);
    expect(result.status).toBe('pass');
  });
});

describe('parseRouteRenderTable', () => {
  it('parses the real Next.js route table format, classifying static vs dynamic', () => {
    const entries = parseRouteRenderTable(REAL_ROUTE_TABLE);
    expect(entries).toEqual([
      { route: '/_not-found', renderType: 'static', symbol: '○' },
      { route: '/api/checks', renderType: 'dynamic', symbol: 'ƒ' },
      { route: '/dashboard-widget-extension', renderType: 'static', symbol: '○' },
      { route: '/fullscreen-extension', renderType: 'static', symbol: '○' },
      { route: '/standalone-extension', renderType: 'static', symbol: '○' },
      { route: '/validate', renderType: 'static', symbol: '○' },
    ]);
  });

  it('returns an empty array for text with no route table', () => {
    expect(parseRouteRenderTable('Compiling...\nBuild completed')).toEqual([]);
  });
});
