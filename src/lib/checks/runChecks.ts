import { CheckEngineConfig, CheckSummary, worstStatus } from './types';
import { runEdgeReachabilityCheck } from './edgeReachability';
import { runJssConfigAuditCheck } from './jssConfigAudit';
import { runCacheHeaderCheck } from './cacheHeaderCheck';
import { runRouteCoverageCheck } from './routeCoverageCheck';
import { runBuildLogScanCheck } from './buildLogScan';

export async function runChecks(config: CheckEngineConfig): Promise<CheckSummary> {
  const checks = await Promise.all([
    runEdgeReachabilityCheck(config.sitecoreEdge),
    runJssConfigAuditCheck(config.projectSource),
    runCacheHeaderCheck(config.deploymentUrl, config.keyRoutes),
    runRouteCoverageCheck(config.deploymentUrl, config.sitecoreEdge, config.routeCoverageLimit),
    runBuildLogScanCheck(config.vercel),
  ]);

  return {
    overallStatus: worstStatus(checks.map((c) => c.status)),
    generatedAt: new Date().toISOString(),
    checks,
  };
}
