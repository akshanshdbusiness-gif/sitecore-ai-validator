import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDeploymentEvents, getLatestDeployment, VercelApiError } from './vercelClient';
import type { VercelConfig } from './types';

const CONFIG: VercelConfig = { token: 'test-token', projectId: 'prj_123' };

describe('getLatestDeployment', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('requests /v7/deployments with projectId, limit, and target=production', async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(JSON.stringify({ deployments: [{ uid: 'dpl_1', url: 'x.vercel.app' }] }), { status: 200 })
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const deployment = await getLatestDeployment(CONFIG);

    expect(deployment?.uid).toBe('dpl_1');
    const calledUrl = new URL((fetchMock.mock.calls[0][0] as string));
    expect(calledUrl.pathname).toBe('/v7/deployments');
    expect(calledUrl.searchParams.get('projectId')).toBe('prj_123');
    expect(calledUrl.searchParams.get('target')).toBe('production');
  });

  it('includes teamId when provided', async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(JSON.stringify({ deployments: [] }), { status: 200 })
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    await getLatestDeployment({ ...CONFIG, teamId: 'team_1' });
    const calledUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(calledUrl.searchParams.get('teamId')).toBe('team_1');
  });

  it('returns null when there are no deployments', async () => {
    global.fetch = vi.fn(async () => new Response(JSON.stringify({ deployments: [] }), { status: 200 })) as typeof fetch;
    expect(await getLatestDeployment(CONFIG)).toBeNull();
  });

  it('throws VercelApiError with the status code on a non-ok response', async () => {
    global.fetch = vi.fn(async () => new Response('unauthorized', { status: 401 })) as typeof fetch;
    await expect(getLatestDeployment(CONFIG)).rejects.toThrow(VercelApiError);
    await expect(getLatestDeployment(CONFIG)).rejects.toMatchObject({ status: 401 });
  });
});

describe('getDeploymentEvents', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('parses newline-delimited JSON events and skips malformed lines', async () => {
    const body = [
      JSON.stringify({ type: 'stdout', created: 1, payload: { text: 'Compiling...' } }),
      'not json',
      JSON.stringify({ type: 'stdout', created: 2, payload: { text: 'Done' } }),
      '',
    ].join('\n');
    global.fetch = vi.fn(async () => new Response(body, { status: 200 })) as typeof fetch;

    const events = await getDeploymentEvents('dpl_1', CONFIG);
    expect(events).toHaveLength(2);
    expect(events[0].payload?.text).toBe('Compiling...');
    expect(events[1].payload?.text).toBe('Done');
  });
});
