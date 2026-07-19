import { describe, expect, it } from 'vitest';
import { classifyRoute } from './httpPrerenderHeuristic';

function headers(entries: Record<string, string>): Headers {
  return new Headers(entries);
}

describe('classifyRoute', () => {
  it('classifies x-nextjs-prerender: 1 as prerendered even without a cache header', () => {
    const result = classifyRoute(headers({ 'x-nextjs-prerender': '1' }));
    expect(result.classification).toBe('prerendered');
  });

  it.each(['HIT', 'STALE', 'PRERENDER', 'hit', 'Stale'])(
    'classifies x-vercel-cache: %s as prerendered',
    (cacheValue) => {
      const result = classifyRoute(headers({ 'x-vercel-cache': cacheValue }));
      expect(result.classification).toBe('prerendered');
    }
  );

  it('classifies MISS with a no-store cache-control as ssr', () => {
    const result = classifyRoute(
      headers({ 'x-vercel-cache': 'MISS', 'cache-control': 'private, no-store, must-revalidate' })
    );
    expect(result.classification).toBe('ssr');
  });

  it('classifies a bare MISS (no cache-control) as ssr', () => {
    const result = classifyRoute(headers({ 'x-vercel-cache': 'MISS' }));
    expect(result.classification).toBe('ssr');
  });

  it('classifies responses with neither header as unknown', () => {
    const result = classifyRoute(headers({}));
    expect(result.classification).toBe('unknown');
  });

  it('preserves the raw header values in the result', () => {
    const result = classifyRoute(headers({ 'x-vercel-cache': 'HIT' }));
    expect(result.cacheHeader).toBe('HIT');
  });
});
