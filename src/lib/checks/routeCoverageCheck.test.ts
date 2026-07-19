import { afterEach, describe, expect, it, vi } from 'vitest';
import { runRouteCoverageCheck } from './routeCoverageCheck';
import type { SitecoreEdgeConfig } from './types';

// Avoids a real DNS lookup for the default edge-platform.sitecorecloud.io
// host that assertSafeSitecoreEdgeUrl resolves as part of its SSRF guard.
vi.mock('dns/promises', () => ({
  default: { lookup: vi.fn(async () => [{ address: '93.184.216.34', family: 4 }]) },
}));

const CONFIG: SitecoreEdgeConfig = { contextId: 'abc123', siteName: 'my-site', language: 'en' };

function edgeResponse(paths: string[]): Response {
  return new Response(
    JSON.stringify({
      data: {
        site: {
          siteInfo: {
            routes: {
              total: paths.length,
              pageInfo: { hasNext: false, endCursor: null },
              results: paths.map((path) => ({ path })),
            },
          },
        },
      },
    }),
    { status: 200 }
  );
}

describe('runRouteCoverageCheck', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('skips when deploymentUrl or sitecoreEdge config is missing', async () => {
    expect((await runRouteCoverageCheck(undefined, CONFIG)).status).toBe('skipped');
    expect((await runRouteCoverageCheck('https://203.0.113.10', undefined)).status).toBe('skipped');
  });

  it('passes when every expected route is prerendered', async () => {
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();
      if (url.includes('sitecorecloud.io')) return edgeResponse(['/a', '/b']);
      return new Response(null, { status: 200, headers: { 'x-vercel-cache': 'HIT' } });
    }) as typeof fetch;

    const result = await runRouteCoverageCheck('https://203.0.113.10', CONFIG);
    expect(result.status).toBe('pass');
    expect(result.details?.expectedRouteCount).toBe(2);
  });

  it('fails when a large share of expected routes are not prerendered', async () => {
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();
      if (url.includes('sitecorecloud.io')) return edgeResponse(['/a', '/b', '/c']);
      return new Response(null, { status: 200, headers: { 'x-vercel-cache': 'MISS', 'cache-control': 'no-store' } });
    }) as typeof fetch;

    const result = await runRouteCoverageCheck('https://203.0.113.10', CONFIG);
    expect(result.status).toBe('fail');
  });

  it('fails when the Experience Edge route list itself cannot be fetched', async () => {
    global.fetch = vi.fn(async () => new Response('', { status: 500 })) as typeof fetch;

    const result = await runRouteCoverageCheck('https://203.0.113.10', CONFIG);
    expect(result.status).toBe('fail');
  });
});
