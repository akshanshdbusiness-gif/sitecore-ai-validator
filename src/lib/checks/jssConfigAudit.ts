import { promises as fs } from 'fs';
import path from 'path';
import { CheckResult, GitHubProjectSource, ProjectSource } from './types';
import { listRepoFiles, readRepoFile, resolveGitHubRef } from './githubClient';

export const JSS_CONFIG_AUDIT_CHECK_ID = 'jss-config-audit';

interface Finding {
  file: string;
  severity: 'fail' | 'warn';
  message: string;
}

const IGNORED_DIRS = new Set(['node_modules', '.next', '.git', '.sitecore']);
const SEARCH_ROOTS = ['src/app', 'src/pages', 'app', 'pages'];
const CONFIG_CANDIDATES = ['sitecore.config.ts', 'sitecore.config.ts.example', 'sitecore.config.js'];

function isCatchAllRouteFile(posixPath: string): boolean {
  const parts = posixPath.split('/');
  const fileName = parts[parts.length - 1];
  const isAppRouterCatchAll = parts.includes('[[...path]]') && fileName === 'page.tsx';
  const isPagesRouterCatchAll = /^\[\[\.\.\.path\]\]\.tsx?$/.test(fileName);
  return isAppRouterCatchAll || isPagesRouterCatchAll;
}

export interface JssAuditRule {
  id: string;
  severity: 'fail' | 'warn';
  label: string;
  message: string;
}

/**
 * The three anti-patterns this check looks for — two found across this
 * repo's own starters, one a config-flag sanity check. Exported as named
 * data (not inline strings) so the /docs page can render this exact list
 * instead of a hand-copied one that can drift out of sync.
 */
export const JSS_AUDIT_RULES: JssAuditRule[] = [
  {
    id: 'force-dynamic-contradiction',
    severity: 'fail',
    label: "force-dynamic alongside generateStaticParams/getStaticPaths",
    message:
      "export const dynamic = 'force-dynamic' forces every request through SSR, overriding generateStaticParams entirely — any paths it resolves are never actually prerendered. Remove force-dynamic if SSG is intended, or drop generateStaticParams if SSR-only is intended.",
  },
  {
    id: 'swallowed-static-paths-error',
    severity: 'warn',
    label: 'Static-paths fetch errors are swallowed instead of rethrown',
    message:
      'The static-paths fetch is wrapped in try/catch whose catch block only logs (no rethrow) — a failed Experience Edge call here silently produces an empty paths list instead of failing the build, so the SSR fallback goes unnoticed.',
  },
  {
    id: 'generate-static-paths-disabled',
    severity: 'warn',
    label: 'generateStaticPaths flag explicitly set to false',
    message:
      'generateStaticPaths is explicitly set to false — SSG paths will never be generated. Confirm this is intentional and not the cause of an unexpectedly all-SSR deployment.',
  },
];

const [FORCE_DYNAMIC_RULE, SWALLOWED_ERROR_RULE, DISABLED_FLAG_RULE] = JSS_AUDIT_RULES;

/**
 * Flags two real anti-patterns found across this repo's own starters:
 *  1. `export const dynamic = 'force-dynamic'` alongside generateStaticParams/
 *     getStaticPaths — force-dynamic wins, so SSG paths are computed but never
 *     used to actually prerender anything.
 *  2. A try/catch around the static-paths fetch whose catch block only logs
 *     instead of rethrowing — a failed Experience Edge call silently degrades
 *     to an empty paths list rather than failing the build loudly.
 */
function analyzeRouteFile(relFile: string, content: string): Finding[] {
  const findings: Finding[] = [];

  const hasForceDynamic = /export const dynamic\s*=\s*['"]force-dynamic['"]/.test(content);
  const hasStaticParamsExport =
    /export const generateStaticParams/.test(content) ||
    /export const getStaticPaths/.test(content);

  if (hasForceDynamic && hasStaticParamsExport) {
    findings.push({ file: relFile, severity: FORCE_DYNAMIC_RULE.severity, message: FORCE_DYNAMIC_RULE.message });
  }

  const pathsFetchCallPattern =
    /(getPagePaths|getAppRouterStaticParams|fetchSiteRoutes|fetchSitePaths)\s*\(/;
  const tryBlocks = content.match(/try\s*{[\s\S]*?}\s*catch[\s\S]*?{[\s\S]*?}/g) || [];
  for (const block of tryBlocks) {
    if (!pathsFetchCallPattern.test(block)) continue;
    const catchBody = block.slice(block.indexOf('catch'));
    if (!/throw/.test(catchBody)) {
      findings.push({ file: relFile, severity: SWALLOWED_ERROR_RULE.severity, message: SWALLOWED_ERROR_RULE.message });
    }
  }

  return findings;
}

/** Returns undefined if the flag isn't present in this file (caller should try the next candidate). */
function extractGenerateStaticPathsFlag(fileName: string, content: string): Finding | null | undefined {
  const match = content.match(/generateStaticPaths\s*:\s*(true|false)/);
  if (!match) return undefined;
  if (match[1] === 'false') {
    return { file: fileName, severity: DISABLED_FLAG_RULE.severity, message: DISABLED_FLAG_RULE.message };
  }
  return null;
}

// --- local filesystem source ---

async function listLocalCatchAllFiles(root: string): Promise<string[]> {
  const found: string[] = [];

  async function walk(dir: string, depth: number): Promise<void> {
    if (depth > 8) return;
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full, depth + 1);
      } else if (entry.isFile() && /\.tsx?$/.test(entry.name)) {
        const relPosix = path.relative(root, full).split(path.sep).join('/');
        if (isCatchAllRouteFile(relPosix)) found.push(relPosix);
      }
    }
  }

  for (const candidate of SEARCH_ROOTS) {
    await walk(path.join(root, candidate), 0);
  }
  return found;
}

async function findLocalConfigFlag(root: string): Promise<Finding | null> {
  for (const name of CONFIG_CANDIDATES) {
    let content: string;
    try {
      content = await fs.readFile(path.join(root, name), 'utf-8');
    } catch {
      continue;
    }
    const flag = extractGenerateStaticPathsFlag(name, content);
    if (flag !== undefined) return flag;
  }
  return null;
}

// --- GitHub source ---

async function listGitHubCatchAllFiles(source: GitHubProjectSource, ref: string): Promise<string[]> {
  const allFiles = await listRepoFiles(source, ref);
  return allFiles.filter((filePath) => isCatchAllRouteFile(filePath));
}

async function findGitHubConfigFlag(source: GitHubProjectSource, ref: string): Promise<Finding | null> {
  for (const name of CONFIG_CANDIDATES) {
    const content = await readRepoFile(source, ref, name);
    if (content === null) continue;
    const flag = extractGenerateStaticPathsFlag(name, content);
    if (flag !== undefined) return flag;
  }
  return null;
}

export async function runJssConfigAuditCheck(source: ProjectSource | undefined): Promise<CheckResult> {
  const started = performance.now();

  if (!source) {
    return {
      id: JSS_CONFIG_AUDIT_CHECK_ID,
      name: 'JSS config audit',
      status: 'skipped',
      summary: 'Skipped — no projectSource configured (local path or GitHub repo)',
      durationMs: performance.now() - started,
    };
  }

  try {
    let routeFiles: string[];
    let readContent: (relPath: string) => Promise<string | null>;
    let configFlagFinding: Finding | null;
    let sourceDescription: string;

    if (source.type === 'local') {
      try {
        const stat = await fs.stat(source.path);
        if (!stat.isDirectory()) throw new Error('not a directory');
      } catch {
        return {
          id: JSS_CONFIG_AUDIT_CHECK_ID,
          name: 'JSS config audit',
          status: 'fail',
          summary: `Local path "${source.path}" is not a readable directory`,
          durationMs: performance.now() - started,
        };
      }
      routeFiles = await listLocalCatchAllFiles(source.path);
      readContent = async (relPath) => {
        try {
          return await fs.readFile(path.join(source.path, relPath), 'utf-8');
        } catch {
          return null;
        }
      };
      configFlagFinding = await findLocalConfigFlag(source.path);
      sourceDescription = source.path;
    } else {
      const ref = await resolveGitHubRef(source);
      routeFiles = await listGitHubCatchAllFiles(source, ref);
      readContent = (relPath) => readRepoFile(source, ref, relPath);
      configFlagFinding = await findGitHubConfigFlag(source, ref);
      sourceDescription = `${source.owner}/${source.repo}@${ref}`;
    }

    const findings: Finding[] = [];
    for (const relFile of routeFiles) {
      const content = await readContent(relFile);
      if (content !== null) findings.push(...analyzeRouteFile(relFile, content));
    }
    if (configFlagFinding) findings.push(configFlagFinding);

    const status = findings.some((f) => f.severity === 'fail')
      ? 'fail'
      : findings.length
        ? 'warn'
        : routeFiles.length
          ? 'pass'
          : 'warn';

    const summary =
      routeFiles.length === 0
        ? `No catch-all route file ([[...path]]) found in ${sourceDescription}`
        : findings.length === 0
          ? `Checked ${routeFiles.length} route file(s) in ${sourceDescription}, no SSG misconfigurations found`
          : `Checked ${routeFiles.length} route file(s) in ${sourceDescription}, found ${findings.length} issue(s)`;

    return {
      id: JSS_CONFIG_AUDIT_CHECK_ID,
      name: 'JSS config audit',
      status,
      summary,
      details: { source: sourceDescription, routeFilesChecked: routeFiles, findings },
      durationMs: performance.now() - started,
    };
  } catch (error) {
    return {
      id: JSS_CONFIG_AUDIT_CHECK_ID,
      name: 'JSS config audit',
      status: 'fail',
      summary: `Failed to audit project source: ${(error as Error).message}`,
      durationMs: performance.now() - started,
    };
  }
}
