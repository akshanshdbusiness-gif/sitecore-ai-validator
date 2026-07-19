import { VercelConfig } from './types';

const VERCEL_API_BASE = 'https://api.vercel.com';

export class VercelApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'VercelApiError';
    this.status = status;
  }
}

async function vercelFetch(
  path: string,
  config: VercelConfig,
  searchParams: Record<string, string | undefined> = {}
): Promise<Response> {
  const url = new URL(`${VERCEL_API_BASE}${path}`);
  for (const [key, value] of Object.entries(searchParams)) {
    if (value) url.searchParams.set(key, value);
  }
  if (config.teamId) url.searchParams.set('teamId', config.teamId);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${config.token}` },
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new VercelApiError(`Vercel API ${path} returned ${res.status}: ${body.slice(0, 300)}`, res.status);
  }
  return res;
}

export interface VercelDeployment {
  uid: string;
  url: string;
  name: string;
  state: string;
  target?: string | null;
  createdAt: number;
}

/** GET /v7/deployments — https://vercel.com/docs/rest-api/reference/endpoints/deployments/list-deployments */
export async function getLatestDeployment(config: VercelConfig): Promise<VercelDeployment | null> {
  const res = await vercelFetch('/v7/deployments', config, {
    projectId: config.projectId,
    limit: '1',
    target: 'production',
  });
  const json = (await res.json()) as { deployments?: VercelDeployment[] };
  return json.deployments?.[0] ?? null;
}

export interface DeploymentEvent {
  type: string;
  created: number;
  payload?: { text?: string; [key: string]: unknown };
}

/** GET /v3/deployments/{id}/events — https://vercel.com/docs/rest-api/deployments/get-deployment-events */
export async function getDeploymentEvents(
  deploymentId: string,
  config: VercelConfig,
  limit = 2000
): Promise<DeploymentEvent[]> {
  const res = await vercelFetch(`/v3/deployments/${deploymentId}/events`, config, {
    limit: String(limit),
    direction: 'forward',
  });
  const text = await res.text();
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as DeploymentEvent;
      } catch {
        return null;
      }
    })
    .filter((event): event is DeploymentEvent => event !== null);
}
