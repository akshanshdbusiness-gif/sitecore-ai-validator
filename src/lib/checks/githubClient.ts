import { GitHubProjectSource } from './types';

const GITHUB_API_BASE = 'https://api.github.com';

function authHeaders(source: GitHubProjectSource): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
  if (source.token) headers.Authorization = `Bearer ${source.token}`;
  return headers;
}

/** Resolves `ref` to the repo's default branch when not explicitly provided. */
export async function resolveGitHubRef(source: GitHubProjectSource): Promise<string> {
  if (source.ref) return source.ref;
  const res = await fetch(`${GITHUB_API_BASE}/repos/${source.owner}/${source.repo}`, {
    headers: authHeaders(source),
  });
  if (!res.ok) {
    throw new Error(`GitHub repo lookup failed (${res.status}) for ${source.owner}/${source.repo}`);
  }
  const json = (await res.json()) as { default_branch: string };
  return json.default_branch;
}

interface GitTreeEntry {
  path: string;
  type: 'blob' | 'tree' | 'commit';
}

/** Lists every file path in the repo at `ref` via a single recursive Git Trees API call. */
export async function listRepoFiles(source: GitHubProjectSource, ref: string): Promise<string[]> {
  const res = await fetch(
    `${GITHUB_API_BASE}/repos/${source.owner}/${source.repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`,
    { headers: authHeaders(source) }
  );
  if (!res.ok) {
    throw new Error(
      `GitHub tree lookup failed (${res.status}) for ${source.owner}/${source.repo}@${ref}`
    );
  }
  const json = (await res.json()) as { tree: GitTreeEntry[]; truncated: boolean };
  return json.tree.filter((entry) => entry.type === 'blob').map((entry) => entry.path);
}

/** Reads a single file's text content via the Contents API. Returns null if it doesn't exist. */
export async function readRepoFile(
  source: GitHubProjectSource,
  ref: string,
  filePath: string
): Promise<string | null> {
  const res = await fetch(
    `${GITHUB_API_BASE}/repos/${source.owner}/${source.repo}/contents/${filePath}?ref=${encodeURIComponent(
      ref
    )}`,
    { headers: authHeaders(source) }
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`GitHub file fetch failed (${res.status}) for ${filePath}`);
  }
  const json = (await res.json()) as { content?: string; encoding?: string };
  if (!json.content || json.encoding !== 'base64') return null;
  return Buffer.from(json.content, 'base64').toString('utf-8');
}
