import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchSiteRoutes, getEdgeGraphQLUrl, queryEdge } from './sitecoreEdgeClient';
import type { SitecoreEdgeConfig } from './types';

// Avoids a real DNS lookup for the default edge-platform.sitecorecloud.io
// host that assertSafeSitecoreEdgeUrl resolves as part of its SSRF guard.
vi.mock('dns/promises', () => ({
  default: { lookup: vi.fn(async () => [{ address: '93.184.216.34', family: 4 }]) },
}));

const CONFIG: SitecoreEdgeConfig = {
  contextId: 'abc123',
  siteName: 'my-site',
  language: 'en',
};

describe('getEdgeGraphQLUrl', () => {
  it('builds the real Content SDK edge-proxy URL shape', () => {
    expect(getEdgeGraphQLUrl(CONFIG)).toBe(
      'https://edge-platform.sitecorecloud.io/v1/content/api/graphql/v1?sitecoreContextId=abc123'
    );
  });

  it('respects a custom edgeUrl override and strips trailing slashes', () => {
    const url = getEdgeGraphQLUrl({ ...CONFIG, edgeUrl: 'https://my-edge.example.com/' });
    expect(url).toBe('https://my-edge.example.com/v1/content/api/graphql/v1?sitecoreContextId=abc123');
  });
});

describe('queryEdge', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('returns ok:true for a clean 200 response with no GraphQL errors', async () => {
    global.fetch = vi.fn(async () => new Response(JSON.stringify({ data: { ok: true } }), { status: 200 })) as typeof fetch;

    const result = await queryEdge(CONFIG, 'query {}', {});
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
  });

  it('returns ok:false when the response carries GraphQL errors even with HTTP 200', async () => {
    global.fetch = vi.fn(
      async () => new Response(JSON.stringify({ errors: [{ message: 'nope' }] }), { status: 200 })
    ) as typeof fetch;

    const result = await queryEdge(CONFIG, 'query {}', {});
    expect(result.ok).toBe(false);
  });

  it('returns a networkError instead of throwing when fetch rejects', async () => {
    global.fetch = vi.fn(async () => {
      throw new Error('DNS lookup failed');
    }) as typeof fetch;

    const result = await queryEdge(CONFIG, 'query {}', {});
    expect(result.ok).toBe(false);
    expect(result.networkError).toContain('DNS lookup failed');
  });
});

describe('fetchSiteRoutes', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('pages through results until hasNext is false, capped by limit', async () => {
    let call = 0;
    global.fetch = vi.fn(async () => {
      call += 1;
      const page =
        call === 1
          ? { results: [{ path: '/a' }, { path: '/b' }], pageInfo: { hasNext: true, endCursor: 'cursor-1' } }
          : { results: [{ path: '/c' }], pageInfo: { hasNext: false, endCursor: null } };
      return new Response(
        JSON.stringify({ data: { site: { siteInfo: { routes: { total: 3, ...page } } } } }),
        { status: 200 }
      );
    }) as typeof fetch;

    const { paths, error } = await fetchSiteRoutes(CONFIG, 10);
    expect(error).toBeUndefined();
    expect(paths).toEqual(['/a', '/b', '/c']);
    expect(call).toBe(2);
  });

  it('returns an error and whatever paths were collected so far if a page fails', async () => {
    global.fetch = vi.fn(async () => new Response('', { status: 500 })) as typeof fetch;

    const { paths, error } = await fetchSiteRoutes(CONFIG, 10);
    expect(paths).toEqual([]);
    expect(error).toBeTruthy();
  });

  it('surfaces a descriptive error when the site does not exist', async () => {
    global.fetch = vi.fn(
      async () => new Response(JSON.stringify({ data: { site: { siteInfo: null } } }), { status: 200 })
    ) as typeof fetch;

    const { error } = await fetchSiteRoutes(CONFIG, 10);
    expect(error).toContain('my-site');
  });
});
