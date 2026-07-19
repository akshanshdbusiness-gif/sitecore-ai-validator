export type CheckStatus = 'pass' | 'warn' | 'fail' | 'skipped';

export interface CheckResult {
  id: string;
  name: string;
  status: CheckStatus;
  summary: string;
  details?: Record<string, unknown>;
  durationMs: number;
}

export interface CheckSummary {
  overallStatus: CheckStatus;
  generatedAt: string;
  checks: CheckResult[];
}

export interface SitecoreEdgeConfig {
  contextId: string;
  siteName: string;
  language: string;
  edgeUrl?: string;
}

export interface VercelConfig {
  token: string;
  projectId: string;
  teamId?: string;
  deploymentId?: string;
}

export interface LocalProjectSource {
  type: 'local';
  path: string;
}

export interface GitHubProjectSource {
  type: 'github';
  owner: string;
  repo: string;
  /** Branch/tag/SHA to read from. Defaults to the repo's default branch if omitted. */
  ref?: string;
  /** Required for private repos; also lifts GitHub's 60 req/hr unauthenticated rate limit. */
  token?: string;
}

/**
 * Where the JSS config audit reads the target Next.js project's source from.
 * `local` only works when this app runs on the same machine as the checkout
 * (e.g. local dev) — a deployed instance has no access to anyone's disk, so
 * `github` is what makes the audit usable from a hosted URL.
 */
export type ProjectSource = LocalProjectSource | GitHubProjectSource;

export interface CheckEngineConfig {
  deploymentUrl?: string;
  keyRoutes?: string[];
  routeCoverageLimit?: number;
  projectSource?: ProjectSource;
  sitecoreEdge?: SitecoreEdgeConfig;
  vercel?: VercelConfig;
}

export function statusRank(status: CheckStatus): number {
  switch (status) {
    case 'fail':
      return 3;
    case 'warn':
      return 2;
    case 'pass':
      return 1;
    case 'skipped':
      return 0;
  }
}

export function worstStatus(statuses: CheckStatus[]): CheckStatus {
  return statuses.reduce<CheckStatus>(
    (worst, current) => (statusRank(current) > statusRank(worst) ? current : worst),
    'skipped'
  );
}
