import { describe, expect, it, vi } from 'vitest';

vi.mock('./edgeReachability', () => ({
  runEdgeReachabilityCheck: vi.fn(async () => ({
    id: 'edge-reachability',
    name: 'Experience Edge reachability',
    status: 'pass' as const,
    summary: 'ok',
    durationMs: 1,
  })),
}));
vi.mock('./jssConfigAudit', () => ({
  runJssConfigAuditCheck: vi.fn(async () => ({
    id: 'jss-config-audit',
    name: 'JSS config audit',
    status: 'fail' as const,
    summary: 'bad',
    durationMs: 1,
  })),
}));
vi.mock('./cacheHeaderCheck', () => ({
  runCacheHeaderCheck: vi.fn(async () => ({
    id: 'cache-header-check',
    name: 'Cache header check',
    status: 'skipped' as const,
    summary: 'skip',
    durationMs: 1,
  })),
}));
vi.mock('./routeCoverageCheck', () => ({
  runRouteCoverageCheck: vi.fn(async () => ({
    id: 'route-coverage',
    name: 'Route coverage',
    status: 'warn' as const,
    summary: 'warn',
    durationMs: 1,
  })),
}));
vi.mock('./buildLogScan', () => ({
  runBuildLogScanCheck: vi.fn(async () => ({
    id: 'build-log-scan',
    name: 'Build log scan',
    status: 'skipped' as const,
    summary: 'skip',
    durationMs: 1,
  })),
}));

const { runChecks } = await import('./runChecks');

describe('runChecks', () => {
  it('aggregates overallStatus as the worst of the five individual checks', async () => {
    const summary = await runChecks({});
    expect(summary.checks).toHaveLength(5);
    expect(summary.overallStatus).toBe('fail');
    expect(summary.generatedAt).toBeTruthy();
  });

  it('includes every check result even when config is empty', async () => {
    const summary = await runChecks({});
    const ids = summary.checks.map((c) => c.id);
    expect(ids).toEqual([
      'edge-reachability',
      'jss-config-audit',
      'cache-header-check',
      'route-coverage',
      'build-log-scan',
    ]);
  });
});
