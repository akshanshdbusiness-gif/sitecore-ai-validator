export type RouteClassification = 'prerendered' | 'ssr' | 'unknown';

export interface RouteClassificationResult {
  classification: RouteClassification;
  cacheHeader?: string;
  prerenderHeader?: string;
}

/**
 * Classifies whether a deployed route was actually served from a static/ISR
 * build artifact vs. rendered fresh per-request, using the response headers
 * Vercel and Next.js emit:
 *  - `x-nextjs-prerender: 1` — Next.js marks statically prerendered pages.
 *  - `x-vercel-cache: HIT|STALE|PRERENDER` — served from Vercel's edge cache.
 *  - `x-vercel-cache: MISS` with a no-store/private cache-control — dynamic
 *    per-request rendering (SSR), the signature of a silent SSG fallback.
 * This is a heuristic, not a platform guarantee — Vercel doesn't expose a
 * direct "was this page in the prerender manifest" API.
 */
export function classifyRoute(headers: Headers): RouteClassificationResult {
  const cache = headers.get('x-vercel-cache') ?? undefined;
  const prerender = headers.get('x-nextjs-prerender') ?? undefined;
  const cacheControl = headers.get('cache-control') ?? undefined;

  if (prerender === '1') {
    return { classification: 'prerendered', cacheHeader: cache, prerenderHeader: prerender };
  }
  if (cache && ['HIT', 'STALE', 'PRERENDER'].includes(cache.toUpperCase())) {
    return { classification: 'prerendered', cacheHeader: cache };
  }
  if (cache?.toUpperCase() === 'MISS' && cacheControl && /no-store|private/i.test(cacheControl)) {
    return { classification: 'ssr', cacheHeader: cache };
  }
  if (cache?.toUpperCase() === 'MISS') {
    return { classification: 'ssr', cacheHeader: cache };
  }
  return { classification: 'unknown', cacheHeader: cache };
}
