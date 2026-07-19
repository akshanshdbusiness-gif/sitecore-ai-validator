import { afterEach, describe, expect, it, vi } from 'vitest';
import { runEdgeReachabilityCheck } from './edgeReachability';
import type { SitecoreEdgeConfig } from './types';

// Avoids a real DNS lookup for the default edge-platform.sitecorecloud.io
// host that assertSafeSitecoreEdgeUrl resolves as part of its SSRF guard.
vi.mock('dns/promises', () => ({
  default: { lookup: vi.fn(async () => [{ address: '93.184.216.34', family: 4 }]) },
}));

const CONFIG: SitecoreEdgeConfig = { contextId: 'abc123', siteName: 'my-site', language: 'en' };

describe('runEdgeReachabilityCheck', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('skips when sitecoreEdge config is missing', async () => {
    const result = await runEdgeReachabilityCheck(undefined);
    expect(result.status).toBe('skipped');
  });

  it('skips when sitecoreEdge config is only partially provided', async () => {
    const result = await runEdgeReachabilityCheck({ ...CONFIG, siteName: '' });
    expect(result.status).toBe('skipped');
  });

  it('passes on a fast, clean response', async () => {
    global.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ data: { site: { siteInfo: { routes: { results: [] } } } } }),
          { status: 200 }
        )
    ) as typeof fetch;

    const result = await runEdgeReachabilityCheck(CONFIG);
    expect(result.status).toBe('pass');
  });

  it('fails when Edge is unreachable', async () => {
    global.fetch = vi.fn(async () => {
      throw new Error('connect ECONNREFUSED');
    }) as typeof fetch;

    const result = await runEdgeReachabilityCheck(CONFIG);
    expect(result.status).toBe('fail');
    expect(result.summary).toContain('unreachable');
  });

  it('fails when Edge returns a GraphQL error', async () => {
    global.fetch = vi.fn(
      async () => new Response(JSON.stringify({ errors: [{ message: 'bad context id' }] }), { status: 200 })
    ) as typeof fetch;

    const result = await runEdgeReachabilityCheck(CONFIG);
    expect(result.status).toBe('fail');
  });
});
