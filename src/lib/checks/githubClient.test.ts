import { afterEach, describe, expect, it, vi } from 'vitest';
import { listRepoFiles, readRepoFile, resolveGitHubRef } from './githubClient';
import type { GitHubProjectSource } from './types';

const SOURCE: GitHubProjectSource = { type: 'github', owner: 'example-org', repo: 'example-repo' };

describe('resolveGitHubRef', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('returns the configured ref without a network call when provided', async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    const ref = await resolveGitHubRef({ ...SOURCE, ref: 'dev' });
    expect(ref).toBe('dev');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('looks up the default branch when ref is not provided', async () => {
    global.fetch = vi.fn(async () => new Response(JSON.stringify({ default_branch: 'main' }), { status: 200 })) as typeof fetch;
    expect(await resolveGitHubRef(SOURCE)).toBe('main');
  });

  it('throws when the repo lookup fails', async () => {
    global.fetch = vi.fn(async () => new Response('not found', { status: 404 })) as typeof fetch;
    await expect(resolveGitHubRef(SOURCE)).rejects.toThrow(/GitHub repo lookup failed/);
  });
});

describe('listRepoFiles', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('returns only blob paths, filtering out tree entries', async () => {
    global.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            tree: [
              { path: 'src', type: 'tree' },
              { path: 'src/index.ts', type: 'blob' },
              { path: '.git', type: 'commit' },
            ],
            truncated: false,
          }),
          { status: 200 }
        )
    ) as typeof fetch;

    const files = await listRepoFiles(SOURCE, 'main');
    expect(files).toEqual(['src/index.ts']);
  });

  it('includes an Authorization header when a token is provided', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ tree: [] }), { status: 200 }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await listRepoFiles({ ...SOURCE, token: 'ghp_secret' }, 'main');
    const [, init] = fetchMock.mock.calls[0];
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer ghp_secret');
  });
});

describe('readRepoFile', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('decodes base64 content to a utf-8 string', async () => {
    global.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ content: Buffer.from('hello world').toString('base64'), encoding: 'base64' }),
          { status: 200 }
        )
    ) as typeof fetch;

    expect(await readRepoFile(SOURCE, 'main', 'README.md')).toBe('hello world');
  });

  it('returns null for a 404', async () => {
    global.fetch = vi.fn(async () => new Response('', { status: 404 })) as typeof fetch;
    expect(await readRepoFile(SOURCE, 'main', 'missing.ts')).toBeNull();
  });

  it('throws for other non-ok statuses', async () => {
    global.fetch = vi.fn(async () => new Response('', { status: 500 })) as typeof fetch;
    await expect(readRepoFile(SOURCE, 'main', 'x.ts')).rejects.toThrow(/GitHub file fetch failed/);
  });
});
