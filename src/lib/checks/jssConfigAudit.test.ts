import { afterEach, describe, expect, it, vi } from 'vitest';
import path from 'path';
import { runJssConfigAuditCheck } from './jssConfigAudit';

const FIXTURES_ROOT = path.resolve(__dirname, '../../../scripts/fixtures');

describe('runJssConfigAuditCheck — skip/error paths', () => {
  it('skips when no projectSource is configured', async () => {
    const result = await runJssConfigAuditCheck(undefined);
    expect(result.status).toBe('skipped');
  });

  it('fails when the local path is not a readable directory', async () => {
    const result = await runJssConfigAuditCheck({
      type: 'local',
      path: path.join(FIXTURES_ROOT, 'does-not-exist'),
    });
    expect(result.status).toBe('fail');
    expect(result.summary).toContain('not a readable directory');
  });
});

describe('runJssConfigAuditCheck — local source (real fixtures)', () => {
  it('flags the force-dynamic + generateStaticParams contradiction', async () => {
    const result = await runJssConfigAuditCheck({
      type: 'local',
      path: path.join(FIXTURES_ROOT, 'force-dynamic-bad'),
    });
    expect(result.status).toBe('fail');
    const findings = result.details?.findings as { message: string }[];
    expect(findings.some((f) => f.message.includes('force-dynamic'))).toBe(true);
  });

  it('passes a clean SSG configuration', async () => {
    const result = await runJssConfigAuditCheck({
      type: 'local',
      path: path.join(FIXTURES_ROOT, 'ssg-good'),
    });
    expect(result.status).toBe('pass');
  });
});

describe('runJssConfigAuditCheck — GitHub source (mocked API)', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  const ROUTE_FILE_CONTENT = `
    export const dynamic = 'force-dynamic';
    export const generateStaticParams = async () => [];
  `;

  function mockGitHubApi() {
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();

      if (url.includes('/git/trees/')) {
        return new Response(
          JSON.stringify({
            tree: [
              { path: 'src/app/[site]/[locale]/[[...path]]/page.tsx', type: 'blob' },
              { path: 'src/lib/unrelated.ts', type: 'blob' },
            ],
            truncated: false,
          }),
          { status: 200 }
        );
      }

      if (url.includes('/contents/')) {
        if (url.includes('sitecore.config')) {
          return new Response('', { status: 404 });
        }
        return new Response(
          JSON.stringify({
            content: Buffer.from(ROUTE_FILE_CONTENT, 'utf-8').toString('base64'),
            encoding: 'base64',
          }),
          { status: 200 }
        );
      }

      throw new Error(`Unexpected fetch in test: ${url}`);
    }) as typeof fetch;
  }

  it('audits a GitHub repo via the Contents/Trees API and flags the same contradiction', async () => {
    mockGitHubApi();

    const result = await runJssConfigAuditCheck({
      type: 'github',
      owner: 'example-org',
      repo: 'example-repo',
      ref: 'main',
    });

    expect(result.status).toBe('fail');
    expect(result.details?.routeFilesChecked).toEqual([
      'src/app/[site]/[locale]/[[...path]]/page.tsx',
    ]);
  });

  it('surfaces a failure result if the GitHub tree lookup errors', async () => {
    global.fetch = vi.fn(async () => new Response('rate limited', { status: 403 })) as typeof fetch;

    const result = await runJssConfigAuditCheck({
      type: 'github',
      owner: 'example-org',
      repo: 'example-repo',
      ref: 'main',
    });

    expect(result.status).toBe('fail');
    expect(result.summary).toContain('Failed to audit project source');
  });
});
