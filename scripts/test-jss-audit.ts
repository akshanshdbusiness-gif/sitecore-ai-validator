/**
 * Phase 1 validation script for the JSS config audit check.
 *
 * Fixed regression fixtures (scripts/fixtures/) assert exact pass/fail
 * behavior for the two anti-patterns the audit targets, exercised through
 * both project sources the check supports:
 *   - force-dynamic-bad: force-dynamic next to generateStaticParams -> fail
 *   - ssg-good: clean SSG, errors rethrown, no force-dynamic -> pass
 *
 * The GitHub-source assertions hit the real GitHub API against this repo's
 * own public origin — no token needed since it's public — which is the code
 * path a deployed instance actually needs, since it has no local disk access.
 *
 * It also runs (informationally, not asserted) against the sibling
 * xmcloud-starter-js repo's basic-nextjs-pages-router example, which still
 * swallows static-path fetch errors in a try/catch as of this writing.
 *
 * Usage: npm run test:checks
 */
import path from 'path';
import { runJssConfigAuditCheck } from '../src/lib/checks/jssConfigAudit';
import type { CheckStatus, ProjectSource } from '../src/lib/checks/types';

interface Assertion {
  label: string;
  source: ProjectSource;
  expectedStatus: CheckStatus;
}

const GITHUB_REPO = { owner: 'akshanshdbusiness-gif', repo: 'sitecore-ai-validator', ref: 'dev' };

const ASSERTIONS: Assertion[] = [
  {
    label: 'force-dynamic + generateStaticParams contradiction (local)',
    source: { type: 'local', path: path.resolve(__dirname, 'fixtures/force-dynamic-bad') },
    expectedStatus: 'fail',
  },
  {
    label: 'clean SSG configuration (local)',
    source: { type: 'local', path: path.resolve(__dirname, 'fixtures/ssg-good') },
    expectedStatus: 'pass',
  },
  {
    label: 'force-dynamic + generateStaticParams contradiction (GitHub)',
    source: { type: 'github', ...GITHUB_REPO },
    expectedStatus: 'fail',
  },
];

const INFORMATIONAL_TARGETS: ProjectSource[] = [
  {
    type: 'local',
    path: path.resolve(__dirname, '../../xmcloud-starter-js/examples/basic-nextjs-pages-router'),
  },
];

async function runAssertion(assertion: Assertion): Promise<boolean> {
  const result = await runJssConfigAuditCheck(assertion.source);
  const passed = result.status === assertion.expectedStatus;
  console.log(
    `${passed ? 'PASS' : 'FAIL'} — ${assertion.label}: expected ${assertion.expectedStatus}, got ${result.status} (${result.summary})`
  );
  if (!passed && result.details?.findings) {
    console.log('  findings:', JSON.stringify(result.details.findings, null, 2));
  }
  return passed;
}

async function runInformational(source: ProjectSource): Promise<void> {
  const result = await runJssConfigAuditCheck(source);
  console.log(`\n[info] ${JSON.stringify(source)}`);
  console.log(`  status: ${result.status} — ${result.summary}`);
}

async function main() {
  console.log('Running JSS config audit regression fixtures...\n');
  const results = [];
  // Sequential, not Promise.all: GitHub assertions share rate-limited,
  // unauthenticated API calls and read better in order in the console.
  for (const assertion of ASSERTIONS) {
    results.push(await runAssertion(assertion));
  }

  for (const source of INFORMATIONAL_TARGETS) {
    await runInformational(source);
  }

  if (results.some((ok) => !ok)) {
    console.error('\nOne or more fixture assertions failed.');
    process.exit(1);
  }
  console.log('\nAll fixture assertions passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
