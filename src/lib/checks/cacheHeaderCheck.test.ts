import { afterEach, describe, expect, it, vi } from 'vitest';
import { runCacheHeaderCheck } from './cacheHeaderCheck';

describe('runCacheHeaderCheck', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('skips when deploymentUrl is missing', async () => {
    const result = await runCacheHeaderCheck(undefined, ['/']);
    expect(result.status).toBe('skipped');
  });

  it('skips when keyRoutes is empty', async () => {
    const result = await runCacheHeaderCheck('https://203.0.113.10', []);
    expect(result.status).toBe('skipped');
  });

  it('passes when every route is prerendered', async () => {
    global.fetch = vi.fn(
      async () => new Response(null, { status: 200, headers: { 'x-vercel-cache': 'HIT' } })
    ) as typeof fetch;

    const result = await runCacheHeaderCheck('https://203.0.113.10', ['/', '/about']);
    expect(result.status).toBe('pass');
  });

  it('fails when a key route looks like SSR', async () => {
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const isAbout = input.toString().endsWith('/about');
      return new Response(null, {
        status: 200,
        headers: isAbout
          ? { 'x-vercel-cache': 'MISS', 'cache-control': 'private, no-store' }
          : { 'x-vercel-cache': 'HIT' },
      });
    }) as typeof fetch;

    const result = await runCacheHeaderCheck('https://203.0.113.10', ['/', '/about']);
    expect(result.status).toBe('fail');
    expect(result.summary).toContain('/about');
  });

  it('handles a route that fails to fetch without throwing', async () => {
    global.fetch = vi.fn(async () => {
      throw new Error('timeout');
    }) as typeof fetch;

    const result = await runCacheHeaderCheck('https://203.0.113.10', ['/']);
    expect(result.status).toBe('fail');
  });

  it('normalizes a deploymentUrl with a trailing slash', async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(null, { status: 200, headers: { 'x-vercel-cache': 'HIT' } })
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    await runCacheHeaderCheck('https://203.0.113.10/', ['/about']);
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toBe('https://203.0.113.10/about');
  });
});
