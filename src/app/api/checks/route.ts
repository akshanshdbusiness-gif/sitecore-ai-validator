import { NextRequest, NextResponse } from 'next/server';
import { runChecks } from '@/src/lib/checks';
import type { CheckEngineConfig } from '@/src/lib/checks';

/**
 * Phase 1 standalone entry point for the check engine — decoupled from any
 * Sitecore UI so it can be exercised directly (curl/Postman) while validating
 * the checks against a real project. Accepts config in the request body for
 * now; Phase 3 should move credentials (Vercel token, Edge context id) to
 * secure per-install server-side storage instead of a client-supplied body,
 * per the multi-tenant security risk called out in the build plan.
 */
export async function POST(request: NextRequest) {
  let config: CheckEngineConfig;
  try {
    config = (await request.json()) as CheckEngineConfig;
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }

  const summary = await runChecks(config);
  return NextResponse.json(summary);
}
